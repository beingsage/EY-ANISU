// Initiate channel handoff
import { omnichannelCoordinator } from "@/lib/services/omnichannel-coordinator"
import type { ChannelType } from "@/lib/types"

export async function POST(request: Request) {
  const { from_session_id, to_channel }: { from_session_id: string; to_channel: ChannelType } = await request.json()

  if (!from_session_id || !to_channel) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const handoff = await omnichannelCoordinator.initiateHandoff(from_session_id, to_channel)

    return Response.json({
      handoff_id: handoff.handoff_id,
      to_session_id: handoff.to_session_id,
      qr_token: handoff.qr_token,
      deep_link: handoff.deep_link,
      expires_in_seconds: 600,
    })
  } catch (error) {
    return Response.json({ error: "Handoff initiation failed" }, { status: 500 })
  }
}
