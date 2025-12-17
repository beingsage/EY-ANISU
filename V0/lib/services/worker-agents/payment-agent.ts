import { eventBus } from "../event-bus"
import { generateUUID } from "@/lib/utils/uuid"

export class PaymentAgent {
  private retryConfig = { maxRetries: 3, backoffMs: 1000 }

  async processPayment(
    amount: number,
    method: "card" | "upi" | "wallet" | "pos",
    orderId: string,
  ): Promise<{ status: "success" | "failed"; transaction_id?: string; error?: string }> {
    // Simulate payment gateway
    const transactionId = `txn_${generateUUID()}`
    let success = Math.random() > 0.15 // 85% success rate

    if (!success && method === "upi") {
      // Retry with card
      success = Math.random() > 0.1 // 90% success on retry
    }

    if (success) {
      await eventBus.publishToTopic("payment", "authorized", {
        order_id: orderId,
        amount,
        method,
        transaction_id: transactionId,
      })

      // Simulate capture
      const captureSuccess = Math.random() > 0.05 // 95% capture success
      if (captureSuccess) {
        await eventBus.publishToTopic("payment", "captured", {
          order_id: orderId,
          transaction_id: transactionId,
        })
        return { status: "success", transaction_id: transactionId }
      } else {
        await eventBus.publishToTopic("payment", "capture_failed", {
          order_id: orderId,
          transaction_id: transactionId,
        })
        return { status: "failed", error: "Capture failed, initiated refund flow" }
      }
    } else {
      await eventBus.publishToTopic("payment", "failed", {
        order_id: orderId,
        method,
        error: "Payment declined",
      })
      return { status: "failed", error: "Payment declined" }
    }
  }

  async authorizePayment(amount: number, method: string, orderId: string) {
    let attempt = 0
    while (attempt < this.retryConfig.maxRetries) {
      const result = await this.processPayment(amount, method as any, orderId)
      if (result.status === "success") {
        return result
      }
      attempt++
      if (attempt < this.retryConfig.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, this.retryConfig.backoffMs * attempt))
      }
    }
    return { status: "failed" as const, error: "Max retries exceeded" }
  }
}

export const paymentAgent = new PaymentAgent()
