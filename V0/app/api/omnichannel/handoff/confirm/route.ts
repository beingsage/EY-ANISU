// Confirm channel handoff
import { omnichannelCoordinator } from "@/lib/services/omnichannel-coordinator"

export async function POST(request: Request) {
  const { handoff_id, to_session_id }: { handoff_id: string; to_session_id: string } = await request.json()

  if (!handoff_id || !to_session_id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const session = await omnichannelCoordinator.confirmHandoff(handoff_id, to_session_id)
    await omnichannelCoordinator.completeHandoff(handoff_id)

    return Response.json({
      session_id: session?.session_id,
      cart: session?.context.cart_items || [],
      memory: session?.context.memory || {},
    })
  } catch (error) {
    return Response.json({ error: "Handoff confirmation failed" }, { status: 500 })
  }
}
