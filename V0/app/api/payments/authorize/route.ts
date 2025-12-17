// Payment authorization endpoint
import { paymentAgent } from "@/lib/services/worker-agents/payment-agent"

export async function POST(request: Request) {
  const { amount, method, order_id } = await request.json()

  if (!amount || !method || !order_id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const result = await paymentAgent.authorizePayment(amount, method, order_id)
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: "Payment authorization failed" }, { status: 500 })
  }
}
