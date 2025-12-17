// Loyalty pricing calculation
import { loyaltyAgent } from "@/lib/services/worker-agents/loyalty-agent"
import type { CartItem } from "@/lib/types"

export async function POST(request: Request) {
  const { items, user_id, promo_code } = await request.json()

  if (!items || !Array.isArray(items)) {
    return Response.json({ error: "Invalid items" }, { status: 400 })
  }

  try {
    const pricing = await loyaltyAgent.calculatePrice(items as CartItem[], user_id, promo_code)
    return Response.json(pricing)
  } catch (error) {
    return Response.json({ error: "Pricing calculation failed" }, { status: 500 })
  }
}
