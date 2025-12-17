// Saga pattern for distributed transactions
import type { Order, Reservation } from "@/lib/types"
import { eventBus } from "./event-bus"
import { generateUUID } from "@/lib/utils/uuid"

export interface Saga {
  saga_id: string
  type: "order_fulfillment" | "payment_refund" | "order_cancellation"
  steps: SagaStep[]
  status: "running" | "completed" | "failed" | "compensating"
  current_step: number
  compensation_steps: SagaStep[]
}

export interface SagaStep {
  name: string
  action: () => Promise<any>
  compensation: () => Promise<void>
  retry_count: number
  max_retries: number
}

export class SagasOrchestrator {
  private sagas = new Map<string, Saga>()

  async executeOrderFulfillmentSaga(order: Order, reservation?: Reservation): Promise<Saga> {
    const sagaId = generateUUID()

    const saga: Saga = {
      saga_id: sagaId,
      type: "order_fulfillment",
      steps: [
        {
          name: "reserve_inventory",
          action: async () => {
            // Inventory reservation logic
            return { reserved: true }
          },
          compensation: async () => {
            // Release inventory if needed
          },
          retry_count: 0,
          max_retries: 2,
        },
        {
          name: "process_payment",
          action: async () => {
            // Payment processing
            return { payment_id: generateUUID() }
          },
          compensation: async () => {
            // Refund if compensation needed
          },
          retry_count: 0,
          max_retries: 3,
        },
        {
          name: "create_fulfillment",
          action: async () => {
            // Create shipment/pickup task
            return { fulfillment_id: generateUUID() }
          },
          compensation: async () => {
            // Cancel fulfillment
          },
          retry_count: 0,
          max_retries: 1,
        },
        {
          name: "send_confirmation",
          action: async () => {
            // Send order confirmation
            return { email_sent: true }
          },
          compensation: async () => {
            // Send cancellation email
          },
          retry_count: 0,
          max_retries: 1,
        },
      ],
      status: "running",
      current_step: 0,
      compensation_steps: [],
    }

    this.sagas.set(sagaId, saga)

    await this.executeSaga(saga)

    return saga
  }

  private async executeSaga(saga: Saga): Promise<void> {
    const { steps } = saga

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        saga.current_step = i

        let success = false
        while (step.retry_count < step.max_retries && !success) {
          try {
            await step.action()
            saga.compensation_steps.unshift(step) // Add to compensation stack
            success = true

            await eventBus.publishToTopic("saga", "step_completed", {
              saga_id: saga.saga_id,
              step_name: step.name,
              attempt: step.retry_count + 1,
            })
          } catch (error) {
            step.retry_count++

            if (step.retry_count >= step.max_retries) {
              throw error
            }

            await new Promise((resolve) => setTimeout(resolve, 1000 * step.retry_count))
          }
        }
      }

      saga.status = "completed"

      await eventBus.publishToTopic("saga", "completed", {
        saga_id: saga.saga_id,
        type: saga.type,
      })
    } catch (error) {
      saga.status = "compensating"

      await eventBus.publishToTopic("saga", "failed_starting_compensation", {
        saga_id: saga.saga_id,
        error: String(error),
      })

      // Run compensation steps in reverse order
      for (const step of saga.compensation_steps) {
        try {
          await step.compensation()

          await eventBus.publishToTopic("saga", "compensation_step_completed", {
            saga_id: saga.saga_id,
            step_name: step.name,
          })
        } catch (compensationError) {
          console.error(`Compensation failed for ${step.name}:`, compensationError)

          await eventBus.publishToTopic("saga", "compensation_failed", {
            saga_id: saga.saga_id,
            step_name: step.name,
            error: String(compensationError),
          })
        }
      }

      saga.status = "failed"
    }
  }

  getSaga(sagaId: string): Saga | undefined {
    return this.sagas.get(sagaId)
  }

  getAllSagas(): Saga[] {
    return Array.from(this.sagas.values())
  }
}

export const sagasOrchestrator = new SagasOrchestrator()
