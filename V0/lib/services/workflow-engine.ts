// Temporal-like workflow engine for long-running business processes
import type { Order, Reservation } from "@/lib/types"
import { eventBus } from "./event-bus"
import { generateUUID } from "@/lib/utils/uuid"

export interface Workflow {
  workflow_id: string
  type: string
  status: "running" | "succeeded" | "failed" | "compensating"
  state: Record<string, any>
  retries: number
  max_retries: number
  created_at: number
  completed_at?: number
}

export class WorkflowEngine {
  private workflows = new Map<string, Workflow>()
  private timers = new Map<string, NodeJS.Timeout>()

  async startReservationFlow(reservation: Reservation, durationMs = 15 * 60 * 1000) {
    const workflowId = generateUUID()
    const workflow: Workflow = {
      workflow_id: workflowId,
      type: "reservation_hold",
      status: "running",
      state: {
        reservation_id: reservation.reservation_id,
        sku: reservation.sku,
        store_id: reservation.store_id,
        hold_until: Date.now() + durationMs,
      },
      retries: 0,
      max_retries: 0,
      created_at: Date.now(),
    }

    this.workflows.set(workflowId, workflow)

    // Schedule expiration
    const timer = setTimeout(() => {
      this.expireReservationFlow(workflowId)
    }, durationMs)

    this.timers.set(workflowId, timer)

    await eventBus.publishToTopic("workflow", "started", {
      workflow_id: workflowId,
      type: "reservation_hold",
      duration_ms: durationMs,
    })

    return workflow
  }

  async startPaymentFlow(order: Order, maxRetries = 3) {
    const workflowId = generateUUID()
    const workflow: Workflow = {
      workflow_id: workflowId,
      type: "payment_flow",
      status: "running",
      state: {
        order_id: order.order_id,
        amount: order.final_price,
        payment_method: order.payment_method,
        attempt: 1,
      },
      retries: 0,
      max_retries: maxRetries,
      created_at: Date.now(),
    }

    this.workflows.set(workflowId, workflow)

    await eventBus.publishToTopic("workflow", "payment_started", {
      workflow_id: workflowId,
      order_id: order.order_id,
      amount: order.final_price,
    })

    return workflow
  }

  async completeWorkflow(workflowId: string, result?: Record<string, any>) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) return null

    workflow.status = "succeeded"
    workflow.completed_at = Date.now()
    workflow.state = { ...workflow.state, ...result }

    if (this.timers.has(workflowId)) {
      clearTimeout(this.timers.get(workflowId)!)
      this.timers.delete(workflowId)
    }

    await eventBus.publishToTopic("workflow", "completed", {
      workflow_id: workflowId,
      type: workflow.type,
      duration_ms: workflow.completed_at - workflow.created_at,
    })

    return workflow
  }

  async failWorkflow(workflowId: string, error: string) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) return null

    if (workflow.retries < workflow.max_retries) {
      workflow.retries++
      workflow.status = "running"

      await eventBus.publishToTopic("workflow", "retry", {
        workflow_id: workflowId,
        attempt: workflow.retries,
        max_retries: workflow.max_retries,
      })

      return workflow
    }

    workflow.status = "failed"
    workflow.completed_at = Date.now()
    workflow.state.error = error

    if (this.timers.has(workflowId)) {
      clearTimeout(this.timers.get(workflowId)!)
      this.timers.delete(workflowId)
    }

    await eventBus.publishToTopic("workflow", "failed", {
      workflow_id: workflowId,
      type: workflow.type,
      error,
    })

    return workflow
  }

  async startCompensation(workflowId: string) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) return null

    workflow.status = "compensating"

    await eventBus.publishToTopic("workflow", "compensation_started", {
      workflow_id: workflowId,
      type: workflow.type,
      original_state: workflow.state,
    })

    return workflow
  }

  private async expireReservationFlow(workflowId: string) {
    const workflow = this.workflows.get(workflowId)
    if (workflow && workflow.status === "running") {
      await this.completeWorkflow(workflowId, { reason: "hold_expired" })
    }
  }

  getWorkflow(workflowId: string) {
    return this.workflows.get(workflowId)
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values())
  }
}

export const workflowEngine = new WorkflowEngine()
