// Main Sales Agent - LLM dialogue brain with tool calling
import type { Session, Order } from "@/lib/types"
import { sessionManager } from "./session-manager"
import { recommendationAgent } from "./worker-agents/recommendation-agent"
import { inventoryAgent } from "./worker-agents/inventory-agent"
import { paymentAgent } from "./worker-agents/payment-agent"
import { fulfillmentAgent } from "./worker-agents/fulfillment-agent"
import { loyaltyAgent } from "./worker-agents/loyalty-agent"
import { eventBus } from "./event-bus"
import { dataLayer } from "./data-layer"
import { generateUUID } from "@/lib/utils/uuid"

export class SalesAgent {
  private conversationHistory = new Map<string, Array<{ role: "user" | "assistant"; content: string }>>()

  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    const session = await sessionManager.getSession(sessionId)
    if (!session) {
      return "Session not found"
    }

    // Build conversation history
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, [])
    }
    const history = this.conversationHistory.get(sessionId)!

    // Intent classification (simplified)
    const intent = this.classifyIntent(userMessage)

    let response = ""

    switch (intent) {
      case "greeting":
        response = await this.handleGreeting(session)
        break
      case "browse":
        response = await this.handleBrowse(session, userMessage)
        break
      case "search":
        response = await this.handleSearch(session, userMessage)
        break
      case "recommend":
        response = await this.handleRecommendation(session)
        break
      case "checkout":
        response = await this.handleCheckout(session, userMessage)
        break
      case "inventory_check":
        response = await this.handleInventoryCheck(session, userMessage)
        break
      default:
        response =
          "How can I help you today? Would you like to browse our products, search for something specific, or checkout?"
    }

    // Update conversation history
    history.push({ role: "user", content: userMessage })
    history.push({ role: "assistant", content: response })

    // Store in session
    await sessionManager.updateSession(sessionId, {
      context: {
        ...session.context,
        memory: { ...session.context.memory, last_intent: intent, last_response: response },
      },
    })

    await eventBus.publishToTopic("sales", "message_processed", {
      session_id: sessionId,
      intent,
      user_message: userMessage,
      agent_response: response,
    })

    return response
  }

  private classifyIntent(message: string): string {
    const lower = message.toLowerCase()
    if (lower.match(/^(hi|hello|hey|greetings?)/)) return "greeting"
    if (lower.match(/search|find|looking for/)) return "search"
    if (lower.match(/recommend|suggest|what.*good/)) return "recommend"
    if (lower.match(/available|stock|in.*store/)) return "inventory_check"
    if (lower.match(/checkout|buy|purchase|pay|cart/)) return "checkout"
    if (lower.match(/browse|show|list|category/)) return "browse"
    return "unknown"
  }

  private async handleGreeting(session: Session): Promise<string> {
    const customer = session.user_id ? dataLayer.getCustomer(session.user_id) : null
    const greeting = customer ? `Welcome back, ${customer.name}!` : "Welcome to our store!"
    return `${greeting} What can I help you find today?`
  }

  private async handleBrowse(session: Session, message: string): Promise<string> {
    const products = dataLayer.getAllProducts().slice(0, 3)
    const list = products.map((p) => `• ${p.name} - ₹${p.price}`).join("\n")
    return `Here are some popular items:\n${list}\n\nWould you like to hear about any of these?`
  }

  private async handleSearch(session: Session, message: string): Promise<string> {
    const query = message.replace(/search|find|looking for/i, "").trim()
    const products = dataLayer.searchProducts(query, 3)
    if (products.length === 0) {
      return `Sorry, I didn't find any items matching "${query}". Would you like to try a different search?`
    }
    const list = products.map((p) => `• ${p.name} (${p.category}) - ₹${p.price}`).join("\n")
    return `Great! I found these items:\n${list}\n\nWould you like to add any to your cart?`
  }

  private async handleRecommendation(session: Session): Promise<string> {
    const recommended = await recommendationAgent.recommend(session.user_id, session.session_id, session.context)
    const list = recommended.map((p) => `• ${p.name} - ₹${p.price} (${p.category})`).join("\n")
    return `Based on your preferences, I recommend:\n${list}\n\nWould you like to add any of these?`
  }

  private async handleInventoryCheck(session: Session, message: string): Promise<string> {
    const products = dataLayer.getAllProducts()
    const product = products[0] // Simplified - would parse from message
    const availability = await inventoryAgent.checkAvailability(product.sku, 1)
    if (availability.status === "success" && availability.options.length > 0) {
      const options = availability.options
        .map(
          (opt) =>
            `• ${opt.type.replace(/_/g, " ")}: ${opt.estimated_days ? opt.estimated_days + " days" : "immediate"}`,
        )
        .join("\n")
      return `Good news! ${product.name} is available:\n${options}`
    }
    return `Sorry, ${product.name} is currently out of stock.`
  }

  private async handleCheckout(session: Session, message: string): Promise<string> {
    if (session.context.cart_items.length === 0) {
      return "Your cart is empty. Would you like to browse some items first?"
    }

    // Calculate pricing with loyalty
    const pricing = await loyaltyAgent.calculatePrice(
      session.context.cart_items,
      session.user_id,
      message.match(/PROMO:(\w+)/)?.[1],
    )

    const itemList = session.context.cart_items.map((item) => `• ${item.sku}: ₹${item.price} x ${item.qty}`).join("\n")

    return `Order Summary:\n${itemList}\n\nSubtotal: ₹${pricing.subtotal}\nDiscounts: ₹${pricing.loyalty_discount + pricing.promo_discount}\nFinal: ₹${pricing.final_price}\n\nWould you like to proceed with payment?`
  }

  async executeCheckout(sessionId: string, fulfillmentType: "ship" | "collect" | "reserve") {
    const session = await sessionManager.getSession(sessionId)
    if (!session || session.context.cart_items.length === 0) {
      return null
    }

    const orderId = `order_${generateUUID()}`
    const pricing = await loyaltyAgent.calculatePrice(session.context.cart_items, session.user_id)

    const order: Order = {
      order_id: orderId,
      user_id: session.user_id || "",
      session_id: sessionId,
      channel: session.channel,
      items: session.context.cart_items,
      subtotal: pricing.subtotal,
      loyalty_discount: pricing.loyalty_discount,
      promo_discount: pricing.promo_discount,
      final_price: pricing.final_price,
      payment_method: "upi",
      payment_status: "pending",
      fulfillment_type: fulfillmentType,
      fulfillment_status: "pending",
      store_id: session.store_id,
      created_at: Date.now(),
    }

    const createdOrder = dataLayer.createOrder(order)

    // Process payment
    const paymentResult = await paymentAgent.authorizePayment(createdOrder.final_price, "upi", createdOrder.order_id)

    if (paymentResult.status === "success") {
      createdOrder.payment_status = "captured"

      // Fulfill
      const fulfillment = await fulfillmentAgent.createFulfillment(createdOrder)
      createdOrder.fulfillment_status = "confirmed"

      dataLayer.createOrder(createdOrder)

      // Clear cart
      await sessionManager.updateSession(sessionId, {
        context: { ...session.context, cart_items: [] },
      })

      await eventBus.publishToTopic("sales", "order_completed", {
        order_id: createdOrder.order_id,
        session_id: sessionId,
        final_price: createdOrder.final_price,
      })

      return createdOrder
    }

    await eventBus.publishToTopic("sales", "order_failed", {
      order_id: createdOrder.order_id,
      error: paymentResult.error,
    })

    return null
  }
}

export const salesAgent = new SalesAgent()
