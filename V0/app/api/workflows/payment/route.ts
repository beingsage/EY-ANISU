// Payment workflow orchestration
import { workflowEngine } from "@/lib/services/workflow-engine"
import { paymentAgent } from "@/lib/services/worker-agents/payment-agent"
import { eventBus } from "@/lib/services/event-bus"
import type { Order } from "@/lib/types"

export async function POST(request: Request) {
  const { order }: { order: Order } = await request.json()

  try {
    // Start payment workflow
    const workflow = await workflowEngine.startPaymentFlow(order, 3)

    // Execute payment
    const paymentResult = await paymentAgent.authorizePayment(
      order.final_price,
      order.payment_method as any,
      order.order_id,
    )

    if (paymentResult.status === "success") {
      await workflowEngine.completeWorkflow(workflow.workflow_id, {
        transaction_id: paymentResult.transaction_id,
        status: "captured",
      })

      return Response.json({
        workflow_id: workflow.workflow_id,
        status: "succeeded",
        transaction_id: paymentResult.transaction_id,
      })
    } else {
      // Start compensation if capture fails
      await workflowEngine.startCompensation(workflow.workflow_id)

      await eventBus.publishToTopic("workflow", "payment_compensation", {
        workflow_id: workflow.workflow_id,
        order_id: order.order_id,
        reason: paymentResult.error,
      })

      return Response.json(
        {
          workflow_id: workflow.workflow_id,
          status: "compensating",
          error: paymentResult.error,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    return Response.json({ error: "Payment workflow failed" }, { status: 500 })
  }
}
