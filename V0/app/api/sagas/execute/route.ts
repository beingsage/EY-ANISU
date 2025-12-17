// Execute saga endpoint
import { sagasOrchestrator } from "@/lib/services/sagas-orchestrator"
import type { Order } from "@/lib/types"

export async function POST(request: Request) {
  const { order, reservation }: { order: Order; reservation?: any } = await request.json()

  try {
    const saga = await sagasOrchestrator.executeOrderFulfillmentSaga(order, reservation)

    return Response.json({
      saga_id: saga.saga_id,
      status: saga.status,
      current_step: saga.current_step,
      total_steps: saga.steps.length,
    })
  } catch (error) {
    return Response.json({ error: "Saga execution failed" }, { status: 500 })
  }
}
