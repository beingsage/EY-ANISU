// Checkout endpoint
import { salesAgent } from "@/lib/services/sales-agent"

export async function POST(request: Request) {
  const { session_id, fulfillment_type } = await request.json()

  if (!session_id) {
    return Response.json({ error: "Missing session_id" }, { status: 400 })
  }

  try {
    const order = await salesAgent.executeCheckout(session_id, fulfillment_type || "ship")

    if (!order) {
      return Response.json({ error: "Payment or fulfillment failed" }, { status: 400 })
    }

    return Response.json(order, { status: 201 })
  } catch (error) {
    return Response.json({ error: "Checkout failed" }, { status: 500 })
  }
}
