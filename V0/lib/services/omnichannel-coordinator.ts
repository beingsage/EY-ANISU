// Omnichannel session continuity and handoff management
import type { Session, ChannelType } from "@/lib/types"
import { sessionManager } from "./session-manager"
import { eventBus } from "./event-bus"
import { generateUUID } from "@/lib/utils/uuid"

export interface ChannelHandoff {
  handoff_id: string
  from_channel: ChannelType
  to_channel: ChannelType
  from_session_id: string
  to_session_id: string
  timestamp: number
  qr_token?: string
  deep_link?: string
  status: "pending" | "confirmed" | "completed" | "expired"
}

export class OmnichannelCoordinator {
  private handoffs = new Map<string, ChannelHandoff>()
  private channelAffinities = new Map<string, ChannelType[]>()

  async initiateHandoff(fromSessionId: string, toChannel: ChannelType): Promise<ChannelHandoff> {
    const fromSession = await sessionManager.getSession(fromSessionId)
    if (!fromSession) throw new Error("Source session not found")

    // Create new session for target channel
    const toSession = await sessionManager.createSession(toChannel, fromSession.user_id, fromSession.store_id)

    const handoff: ChannelHandoff = {
      handoff_id: generateUUID(),
      from_channel: fromSession.channel,
      to_channel: toChannel,
      from_session_id: fromSessionId,
      to_session_id: toSession.session_id,
      timestamp: Date.now(),
      qr_token: generateUUID(),
      status: "pending",
    }

    // Generate deep link
    handoff.deep_link = `retail://session/${toSession.session_id}?handoff=${handoff.handoff_id}`

    this.handoffs.set(handoff.handoff_id, handoff)

    // Merge session context
    await sessionManager.mergeSessionOnHop(fromSessionId, toSession.session_id)

    await eventBus.publishToTopic("omnichannel", "handoff_initiated", {
      handoff_id: handoff.handoff_id,
      from_channel: fromSession.channel,
      to_channel: toChannel,
      from_session_id: fromSessionId,
      to_session_id: toSession.session_id,
    })

    // Schedule handoff expiration (QR valid for 10 minutes)
    setTimeout(
      () => {
        const handoffRecord = this.handoffs.get(handoff.handoff_id)
        if (handoffRecord && handoffRecord.status === "pending") {
          handoffRecord.status = "expired"
          eventBus.publishToTopic("omnichannel", "handoff_expired", {
            handoff_id: handoff.handoff_id,
          })
        }
      },
      10 * 60 * 1000,
    )

    return handoff
  }

  async confirmHandoff(handoffId: string, toSessionId: string): Promise<Session | null> {
    const handoff = this.handoffs.get(handoffId)
    if (!handoff) throw new Error("Handoff not found")

    if (handoff.to_session_id !== toSessionId) {
      throw new Error("Session mismatch")
    }

    handoff.status = "confirmed"
    const session = await sessionManager.getSession(toSessionId)

    await eventBus.publishToTopic("omnichannel", "handoff_confirmed", {
      handoff_id: handoffId,
      from_channel: handoff.from_channel,
      to_channel: handoff.to_channel,
    })

    return session
  }

  async completeHandoff(handoffId: string): Promise<void> {
    const handoff = this.handoffs.get(handoffId)
    if (!handoff) throw new Error("Handoff not found")

    handoff.status = "completed"

    await eventBus.publishToTopic("omnichannel", "handoff_completed", {
      handoff_id: handoffId,
      duration_ms: Date.now() - handoff.timestamp,
    })
  }

  async getSessionsByUser(userId: string): Promise<Session[]> {
    return await sessionManager.getSessionsByUser(userId)
  }

  async synchronizeAcrossChannels(userId: string): Promise<void> {
    // Synchronize user's sessions across all channels
    const sessions = await this.getSessionsByUser(userId)

    // Merge cart items from all sessions
    const mergedCart = new Map<string, any>()
    for (const session of sessions) {
      for (const item of session.context.cart_items) {
        const existing = mergedCart.get(item.sku)
        if (existing) {
          existing.qty = Math.max(existing.qty, item.qty)
        } else {
          mergedCart.set(item.sku, item)
        }
      }
    }

    // Update all sessions with merged cart
    for (const session of sessions) {
      await sessionManager.updateSession(session.session_id, {
        context: {
          ...session.context,
          cart_items: Array.from(mergedCart.values()),
        },
      })
    }

    await eventBus.publishToTopic("omnichannel", "sync_completed", {
      user_id: userId,
      sessions_count: sessions.length,
      cart_items: mergedCart.size,
    })
  }

  recordChannelAffinity(userId: string, channel: ChannelType): void {
    if (!this.channelAffinities.has(userId)) {
      this.channelAffinities.set(userId, [])
    }
    const affinities = this.channelAffinities.get(userId)!
    if (!affinities.includes(channel)) {
      affinities.push(channel)
    }
  }

  predictNextChannel(userId: string): ChannelType | null {
    const affinities = this.channelAffinities.get(userId)
    if (!affinities || affinities.length === 0) return null
    // Return most recently used channel
    return affinities[affinities.length - 1]
  }
}

export const omnichannelCoordinator = new OmnichannelCoordinator()
