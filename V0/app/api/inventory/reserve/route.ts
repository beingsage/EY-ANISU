// Inventory reservation endpoint
import { inventoryAgent } from "@/lib/services/worker-agents/inventory-agent"

export async function POST(request: Request) {
  const { sku, store_id, user_id, session_id, qty } = await request.json()

  if (!sku || !store_id || !user_id || !session_id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const reservation = await inventoryAgent.reserve(sku, store_id, user_id, session_id, qty || 1)
    if (!reservation) {
      return Response.json({ error: "Could not reserve item" }, { status: 409 })
    }
    return Response.json(reservation, { status: 201 })
  } catch (error) {
    return Response.json({ error: "Reservation failed" }, { status: 500 })
  }
}
