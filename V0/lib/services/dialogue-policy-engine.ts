import { eventBus } from "./event-bus"

export interface DialogueContext {
  session_id: string
  user_message: string
  conversation_history: Array<{ role: "user" | "assistant"; content: string }>
  cart_items: any[]
  customer_profile?: any
  intent: string
  confidence: number
}

export interface PolicyDecision {
  action: "respond" | "escalate" | "decline" | "confirm"
  response_type: "natural" | "structured" | "tool_call"
  tool_call?: { tool: string; args: Record<string, any> }
  requires_confirmation: boolean
  risk_level: "low" | "medium" | "high"
  pii_detected: boolean
}

export class DialoguePolicyEngine {
  private safeToolNames = new Set([
    "inventory.check",
    "recommendation.fetch",
    "cart.add",
    "cart.remove",
    "payment.authorize",
    "order.create",
    "loyalty.calculate",
  ])

  private highRiskKeywords = new Set(["refund", "cancel", "dispute", "fraud", "hack", "password", "admin"])

  private piiPatterns = [
    /\b\d{12}\b/, // Indian Aadhar
    /\b\d{16}\b/, // Credit card
    /\b[A-Z]{5}\d{4}[A-Z]{1}\b/, // PAN
    /\b\d{10}\b/, // Phone
  ]

  async evaluatePolicy(context: DialogueContext): Promise<PolicyDecision> {
    // 1. PII Detection
    const piiDetected = this.detectPII(context.user_message)

    // 2. Safety classification
    const isHighRisk = this.isHighRisk(context.user_message)

    // 3. Intent validation
    if (!this.isValidIntent(context.intent)) {
      return {
        action: "decline",
        response_type: "natural",
        requires_confirmation: false,
        risk_level: "high",
        pii_detected: piiDetected,
      }
    }

    // 4. Tool call validation (if needed)
    let toolCall: { tool: string; args: Record<string, any> } | undefined

    // 5. Confirmation gates for high-risk actions
    const requiresConfirmation =
      isHighRisk || context.intent === "checkout" || (context.cart_items.length > 0 && context.intent === "payment")

    // 6. Content safety check
    const contentSafetyPass = await this.checkContentSafety(context.user_message)
    if (!contentSafetyPass) {
      await eventBus.publishToTopic("safety", "unsafe_content_detected", {
        session_id: context.session_id,
        message_preview: context.user_message.slice(0, 50),
      })

      return {
        action: "decline",
        response_type: "natural",
        requires_confirmation: false,
        risk_level: "high",
        pii_detected: piiDetected,
      }
    }

    return {
      action: requiresConfirmation ? "confirm" : "respond",
      response_type: "structured",
      requires_confirmation: requiresConfirmation,
      risk_level: isHighRisk ? "high" : "low",
      pii_detected: piiDetected,
    }
  }

  private detectPII(text: string): boolean {
    for (const pattern of this.piiPatterns) {
      if (pattern.test(text)) {
        return true
      }
    }
    return false
  }

  private isHighRisk(text: string): boolean {
    const lower = text.toLowerCase()
    return Array.from(this.highRiskKeywords).some((keyword) => lower.includes(keyword))
  }

  private isValidIntent(intent: string): boolean {
    const validIntents = [
      "greeting",
      "browse",
      "search",
      "recommend",
      "checkout",
      "inventory_check",
      "payment",
      "unknown",
    ]
    return validIntents.includes(intent)
  }

  private async checkContentSafety(text: string): Promise<boolean> {
    // Simulate content safety check (in production, use Azure/OpenAI content safety)
    const unsafePatterns = [/(?:hate|abuse|violence|explicit)/i]
    return !unsafePatterns.some((pattern) => pattern.test(text))
  }

  async enforceToolCallPolicy(tool: string, args: Record<string, any>, sessionContext: any): Promise<boolean> {
    // 1. Allowlist check
    if (!this.safeToolNames.has(tool)) {
      await eventBus.publishToTopic("policy", "unsafe_tool_blocked", {
        tool,
        reason: "not_in_allowlist",
      })
      return false
    }

    // 2. Argument validation
    if (!this.validateToolArgs(tool, args)) {
      await eventBus.publishToTopic("policy", "invalid_tool_args", { tool, args })
      return false
    }

    // 3. Rate limiting per session
    if (this.isRateLimited(sessionContext.session_id, tool)) {
      await eventBus.publishToTopic("policy", "rate_limit_exceeded", {
        session_id: sessionContext.session_id,
        tool,
      })
      return false
    }

    return true
  }

  private validateToolArgs(tool: string, args: Record<string, any>): boolean {
    // Simple validation - extend based on tool needs
    if (tool.includes("payment")) {
      return args.amount !== undefined && args.amount > 0 && args.amount < 1000000
    }
    if (tool.includes("inventory")) {
      return args.sku !== undefined && args.qty !== undefined && args.qty > 0
    }
    return true
  }

  private isRateLimited(sessionId: string, tool: string): boolean {
    // Implement actual rate limiting with memoryStore
    return false
  }

  async redactResponse(response: string, context: DialogueContext): Promise<string> {
    // Remove any PII or sensitive data from response
    let redacted = response

    // Redact email patterns
    redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]")

    // Redact phone patterns
    redacted = redacted.replace(/\b\+?1?\d{9,15}\b/g, "[PHONE]")

    // Redact card patterns
    redacted = redacted.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARD]")

    return redacted
  }
}

export const dialoguePolicyEngine = new DialoguePolicyEngine()
