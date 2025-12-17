// Enhanced Sales Agent with LLM integration and policy guardrails
import type { Session } from "@/lib/types"
import { sessionManager } from "./session-manager"
import { recommendationAgent } from "./worker-agents/recommendation-agent"
import { loyaltyAgent } from "./worker-agents/loyalty-agent"
import { ragLayer } from "./rag-layer"
import { dialoguePolicyEngine, type DialogueContext } from "./dialogue-policy-engine"
import { eventBus } from "./event-bus"
import { dataLayer } from "./data-layer"

export class EnhancedSalesAgent {
  private conversationHistory = new Map<string, Array<{ role: "user" | "assistant"; content: string }>>()

  async processMessageWithPolicy(sessionId: string, userMessage: string): Promise<string> {
    const session = await sessionManager.getSession(sessionId)
    if (!session) {
      return "Session not found"
    }

    // Build conversation history
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, [])
    }
    const history = this.conversationHistory.get(sessionId)!

    // Classify intent
    const intent = this.classifyIntent(userMessage)
    const confidence = this.calculateConfidence(userMessage, intent)

    // Evaluate dialogue policy
    const policyContext: DialogueContext = {
      session_id: sessionId,
      user_message: userMessage,
      conversation_history: history,
      cart_items: session.context.cart_items,
      customer_profile: session.user_id ? dataLayer.getCustomer(session.user_id) : undefined,
      intent,
      confidence,
    }

    const policyDecision = await dialoguePolicyEngine.evaluatePolicy(policyContext)

    // Check PII
    if (policyDecision.pii_detected) {
      await eventBus.publishToTopic("safety", "pii_input_detected", {
        session_id: sessionId,
        message_preview: userMessage.slice(0, 30),
      })
    }

    // Decline unsafe content
    if (policyDecision.action === "decline") {
      return "I'm not able to assist with that. Can I help you with something else?"
    }

    // Require confirmation for high-risk actions
    if (policyDecision.requires_confirmation && intent === "checkout") {
      return `I'm ready to process your order. Total: ₹${session.context.cart_items.reduce((sum, item) => sum + item.price * item.qty, 0)}. Please confirm by saying "Yes, checkout"`
    }

    // Generate response
    let response = ""

    switch (intent) {
      case "greeting":
        response = await this.generateGreeting(session)
        break
      case "search":
        response = await this.generateSearch(session, userMessage)
        break
      case "recommend":
        response = await this.generateRecommendation(session)
        break
      case "question":
        response = await this.generateAnswer(userMessage)
        break
      case "checkout":
        response = await this.generateCheckoutSummary(session)
        break
      default:
        response = await this.generateContextualResponse(session, userMessage)
    }

    // Redact any PII from response
    response = await dialoguePolicyEngine.redactResponse(response, policyContext)

    // Update history
    history.push({ role: "user", content: userMessage })
    history.push({ role: "assistant", content: response })

    // Log interaction
    await eventBus.publishToTopic("sales", "message_processed_with_policy", {
      session_id: sessionId,
      intent,
      confidence,
      policy_decision: policyDecision.action,
      pii_detected: policyDecision.pii_detected,
    })

    return response
  }

  private classifyIntent(message: string): string {
    const lower = message.toLowerCase()

    if (lower.match(/^(hi|hello|hey|greetings?|welcome)/)) return "greeting"
    if (lower.match(/search|find|looking for|show me/)) return "search"
    if (lower.match(/recommend|suggest|what.*good|best/)) return "recommend"
    if (lower.match(/how|what|why|tell me|explain/)) return "question"
    if (lower.match(/checkout|buy|purchase|pay|confirm order/)) return "checkout"
    if (lower.match(/available|stock|in.*store|inventory/)) return "inventory_check"
    if (lower.match(/help|support|issue|problem|refund/)) return "support"

    return "unknown"
  }

  private calculateConfidence(message: string, intent: string): number {
    // Confidence based on message length and clarity
    const wordCount = message.split(/\s+/).length
    const baseConfidence = Math.min(wordCount / 10, 1.0)
    return baseConfidence * 0.9 + 0.1 // Scale to 0.1-1.0 range
  }

  private async generateGreeting(session: Session): Promise<string> {
    const customer = session.user_id ? dataLayer.getCustomer(session.user_id) : null
    if (customer) {
      return `Welcome back, ${customer.name}! How can I help you shop today? Would you like personalized recommendations or to browse our collection?`
    }
    return `Hello! Welcome to our store. I'm here to help you find the perfect products. What brings you in today?`
  }

  private async generateSearch(session: Session, query: string): Promise<string> {
    const searchQuery = query.replace(/search|find|looking for|show me/i, "").trim()
    const results = await ragLayer.search(searchQuery, { limit: 5 })

    if (results.length === 0) {
      return `I couldn't find anything matching "${searchQuery}". Try searching for a category like "apparel" or "accessories"`
    }

    const productResults = results.filter((r) => r.type === "product")
    if (productResults.length > 0) {
      const names = productResults
        .slice(0, 3)
        .map((r) => r.metadata.sku)
        .join(", ")
      return `Great! I found ${productResults.length} items matching your search: ${names}. Would you like to add any to your cart?`
    }

    return `Here's what I found: ${results[0]?.content.slice(0, 100)}...`
  }

  private async generateRecommendation(session: Session): Promise<string> {
    const recommendations = await recommendationAgent.recommend(session.user_id, session.session_id, session.context)

    const list = recommendations
      .slice(0, 3)
      .map((p) => `${p.name} (₹${p.price})`)
      .join(", ")

    return `Based on your preferences, I recommend: ${list}. These items complement your style and are currently in stock. Would you like to add any?`
  }

  private async generateAnswer(question: string): Promise<string> {
    const answer = await ragLayer.answerQuestion(question)
    return `${answer.answer} (Confidence: ${Math.round(answer.confidence * 100)}%)`
  }

  private async generateCheckoutSummary(session: Session): Promise<string> {
    if (session.context.cart_items.length === 0) {
      return "Your cart is empty. Would you like to browse and add some items?"
    }

    const pricing = await loyaltyAgent.calculatePrice(session.context.cart_items, session.user_id)

    const itemList = session.context.cart_items.map((item) => `${item.sku} (₹${item.price} × ${item.qty})`).join(", ")

    return `Order Summary:\n${itemList}\n\nSubtotal: ₹${pricing.subtotal}\nDiscounts: ₹${pricing.loyalty_discount + pricing.promo_discount}\nFinal Price: ₹${pricing.final_price}\n\nReady to checkout?`
  }

  private async generateContextualResponse(session: Session, message: string): Promise<string> {
    // Fallback contextual response based on conversation state
    if (session.context.cart_items.length > 0) {
      return `You have ${session.context.cart_items.length} items in your cart. Ready to checkout or would you like to keep shopping?`
    }

    return `I can help you search for products, get recommendations, check inventory, or proceed to checkout. What would you like?`
  }
}

export const enhancedSalesAgent = new EnhancedSalesAgent()
