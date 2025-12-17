// Reservation workflow with timeout handling
import { workflowEngine } from "@/lib/services/workflow-engine"
import { inventoryAgent } from "@/lib/services/worker-agents/inventory-agent"

export async function POST(request: Request) {
  const { sku, store_id, user_id, session_id, qty, hold_duration_ms } = await request.json()

  try {
    // Create reservation
    const reservation = await inventoryAgent.reserve(sku, store_id, user_id, session_id, qty || 1)

    if (!reservation) {
      return Response.json({ error: "Reservation failed" }, { status: 409 })
    }

    // Start workflow for timeout management
    const workflow = await workflowEngine.startReservationFlow(reservation, hold_duration_ms || 15 * 60 * 1000)

    return Response.json({
      reservation_id: reservation.reservation_id,
      workflow_id: workflow.workflow_id,
      hold_until: reservation.hold_until,
      status: "active",
    })
  } catch (error) {
    return Response.json({ error: "Reservation workflow failed" }, { status: 500 })
  }
}
