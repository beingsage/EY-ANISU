// Synchronize user data across channels
import { omnichannelCoordinator } from "@/lib/services/omnichannel-coordinator"

export async function POST(request: Request) {
  const { user_id }: { user_id: string } = await request.json()

  if (!user_id) {
    return Response.json({ error: "Missing user_id" }, { status: 400 })
  }

  try {
    await omnichannelCoordinator.synchronizeAcrossChannels(user_id)

    const sessions = await omnichannelCoordinator.getSessionsByUser(user_id)

    return Response.json({
      user_id,
      synced_sessions: sessions.length,
      sessions: sessions.map((s) => ({
        session_id: s.session_id,
        channel: s.channel,
        cart_items: s.context.cart_items.length,
      })),
    })
  } catch (error) {
    return Response.json({ error: "Sync failed" }, { status: 500 })
  }
}
