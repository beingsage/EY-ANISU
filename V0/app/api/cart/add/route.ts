// Add to cart endpoint
import { sessionManager } from "@/lib/services/session-manager"

export async function POST(request: Request) {
  const { session_id, sku, qty, price } = await request.json()

  if (!session_id || !sku) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    await sessionManager.addToCart(session_id, sku, qty || 1, price || 0)
    const session = await sessionManager.getSession(session_id)
    return Response.json({ cart: session?.context.cart_items || [] })
  } catch (error) {
    return Response.json({ error: "Failed to add to cart" }, { status: 500 })
  }
}
