// Advanced Sales Agent with tool calling and reasoning
import type { Session } from "@/lib/types"
import { llmRouter } from "./llm-router"
import { recommendationAgent } from "./worker-agents/recommendation-agent"
import { inventoryAgent } from "./worker-agents/inventory-agent"
import { paymentAgent } from "./worker-agents/payment-agent"
import { loyaltyAgent } from "./worker-agents/loyalty-agent"
import { fulfillmentAgent } from "./worker-agents/fulfillment-agent"
import { ragLayer } from "./rag-layer"
import { sessionManager } from "./session-manager"

export interface ToolCall {
  tool_name: string
  parameters: Record<string, any>
  result?: Record<string, any>
}

export class AdvancedSalesAgent {
  private toolRegistry = {
    search_products: recommendationAgent.getTrendingProducts,
    get_recommendations: (userId: string, sessionId: string, context: any) =>
      recommendationAgent.recommend(userId, sessionId, context),
    check_inventory: (sku: string, qty: number) => inventoryAgent.checkAvailability(sku, qty),
    reserve_in_store: (sku: string, storeId: string, qty: number, userId: string) =>
      inventoryAgent.reserveInventory(sku, storeId, qty, userId),
    process_payment: (amount: number, method: string, orderId: string) =>
      paymentAgent.authorizePayment(amount, method as any, orderId),
    apply_loyalty: (items: any[], userId: string, promoCode?: string) =>
      loyaltyAgent.calculatePrice(items, userId, promoCode),
    create_fulfillment: (order: any) => fulfillmentAgent.createFulfillment(order),
    search_faq: (query: string) => ragLayer.search(query, { limit: 3, type: "faq" }),
    answer_question: (question: string) => ragLayer.answerQuestion(question),
  }

  async processMessageWithToolCalling(sessionId: string, userMessage: string): Promise<string> {
    const session = await sessionManager.getSession(sessionId)
    if (!session) return "Session not found"

    // Select appropriate model
    const intent = this.classifyIntent(userMessage)
    const model = llmRouter.selectModel(intent, "balanced")

    // Generate tool call
    const toolCall = await llmRouter.generateToolCall(intent, userMessage, model)

    if (toolCall) {
      // Execute tool
      const toolResult = await this.executeTool(toolCall.tool_name, toolCall.parameters)
      return this.formatToolResponse(toolCall.tool_name, toolResult)
    }

    // Fallback to natural language
    return await this.generateNaturalLanguageResponse(session, userMessage, model)
  }

  private async executeTool(toolName: string, params: Record<string, any>): Promise<any> {
    const tool = (this.toolRegistry as Record<string, any>)[toolName]
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`)
    }

    const result = await tool(...Object.values(params))
    return result
  }

  private formatToolResponse(toolName: string, result: any): string {
    // Format tool output into human-friendly response
    switch (toolName) {
      case "get_recommendations":
        return `I found some great items for you: ${result
          .slice(0, 3)
          .map((p: any) => `${p.name} (₹${p.price})`)
          .join(", ")}`
      case "check_inventory":
        return `Availability: ${result.options.length} fulfillment options available`
      case "apply_loyalty":
        return `Order total: ₹${result.final_price} (You save ₹${result.loyalty_discount + result.promo_discount})`
      default:
        return JSON.stringify(result)
    }
  }

  private async generateNaturalLanguageResponse(session: Session, message: string, model: any): Promise<string> {
    const responses: Record<string, string> = {
      greeting: "Hello! How can I help you today?",
      search: "Let me search our catalog for you.",
      question: "That's a great question. Let me find the answer.",
      default: "I'm here to help. What would you like?",
    }
    return responses[this.classifyIntent(message)] || responses.default
  }

  private classifyIntent(message: string): string {
    const lower = message.toLowerCase()
    if (lower.match(/hi|hello|hey/)) return "greeting"
    if (lower.match(/search|find|looking/)) return "search"
    if (lower.match(/\?/)) return "question"
    return "default"
  }
}

export const advancedSalesAgent = new AdvancedSalesAgent()
