// Inventory check endpoint
import { inventoryAgent } from "@/lib/services/worker-agents/inventory-agent"

export async function POST(request: Request) {
  const { sku, qty, radius_km } = await request.json()

  if (!sku) {
    return Response.json({ error: "Missing SKU" }, { status: 400 })
  }

  try {
    const availability = await inventoryAgent.checkAvailability(sku, qty || 1, radius_km || 25)
    return Response.json(availability)
  } catch (error) {
    return Response.json({ error: "Failed to check inventory" }, { status: 500 })
  }
}
