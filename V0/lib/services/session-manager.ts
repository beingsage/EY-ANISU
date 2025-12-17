// Session management across channels
import type { Session, ChannelType } from "@/lib/types"
import { memoryStore } from "./memory-store"
import { eventBus } from "./event-bus"
import { generateUUID } from "@/lib/utils/uuid"

export class SessionManager {
  private sessionTTL = 3600 // 1 hour

  async createSession(channel: ChannelType, userId?: string, storeId?: string): Promise<Session> {
    const sessionId = generateUUID()
    const session: Session = {
      session_id: sessionId,
      user_id: userId,
      channel,
      store_id: storeId,
      created_at: Date.now(),
      last_activity: Date.now(),
      context: {
        cart_items: [],
        browsing_history: [],
        memory: {},
      },
      ttl_seconds: this.sessionTTL,
    }

    memoryStore.set(`session:${sessionId}`, session, this.sessionTTL)
    await eventBus.publishToTopic("session", "created", {
      session_id: sessionId,
      channel,
      user_id: userId,
    })

    return session
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return memoryStore.get(`session:${sessionId}`)
  }

  async updateSession(sessionId: string, updates: Partial<Session>) {
    const session = await this.getSession(sessionId)
    if (session) {
      const updated = { ...session, ...updates, last_activity: Date.now() }
      memoryStore.set(`session:${sessionId}`, updated, this.sessionTTL)
      return updated
    }
    return null
  }

  async addToCart(sessionId: string, sku: string, qty: number, price: number) {
    const session = await this.getSession(sessionId)
    if (session) {
      const existing = session.context.cart_items.find((item) => item.sku === sku)
      if (existing) {
        existing.qty += qty
      } else {
        session.context.cart_items.push({ sku, qty, price, loyalty_applied: false })
      }
      await this.updateSession(sessionId, session)
      await eventBus.publishToTopic("cart", "item_added", { session_id: sessionId, sku, qty })
    }
  }

  async getSessionsByUser(userId: string): Promise<Session[]> {
    const pattern = "session:*"
    const keys = memoryStore.list(pattern)
    const sessions: Session[] = []
    for (const key of keys) {
      const session = memoryStore.get(key)
      if (session?.user_id === userId) {
        sessions.push(session)
      }
    }
    return sessions
  }

  async mergeSessionOnHop(fromSessionId: string, toSessionId: string): Promise<Session | null> {
    const fromSession = await this.getSession(fromSessionId)
    const toSession = await this.getSession(toSessionId)

    if (fromSession && toSession) {
      // Merge cart items (simple CRDT-like merge)
      const mergedCart = [...toSession.context.cart_items]
      for (const item of fromSession.context.cart_items) {
        const existing = mergedCart.find((m) => m.sku === item.sku)
        if (existing) {
          existing.qty = Math.max(existing.qty, item.qty) // Last-write-wins for qty
        } else {
          mergedCart.push(item)
        }
      }

      toSession.context.cart_items = mergedCart
      toSession.context.browsing_history = [
        ...new Set([...toSession.context.browsing_history, ...fromSession.context.browsing_history]),
      ]

      await this.updateSession(toSessionId, toSession)
      await eventBus.publishToTopic("session", "merged", {
        from_session_id: fromSessionId,
        to_session_id: toSessionId,
      })

      return toSession
    }
    return null
  }
}

export const sessionManager = new SessionManager()
