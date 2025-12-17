export type ModelTier = "fast" | "balanced" | "quality"

export interface ModelConfig {
  model: string
  maxTokens: number
  temperature: number
  tier: ModelTier
  latencyBudgetMs: number
}

export const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
  fast: {
    model: "openai/gpt-4o-mini",
    maxTokens: 256,
    temperature: 0.7,
    tier: "fast",
    latencyBudgetMs: 500,
  },
  balanced: {
    model: "openai/gpt-4o",
    maxTokens: 512,
    temperature: 0.7,
    tier: "balanced",
    latencyBudgetMs: 1000,
  },
  quality: {
    model: "openai/gpt-4-turbo",
    maxTokens: 2048,
    temperature: 0.5,
    tier: "quality",
    latencyBudgetMs: 2000,
  },
}

export class LLMRouter {
  selectModel(intent: string, isComplex: boolean, isHighRisk: boolean): ModelTier {
    // Complex intent or high-risk (payments, refunds) → quality model
    if (isComplex || isHighRisk) {
      return "quality"
    }

    // Standard recommendations, simple searches → fast model
    if (["recommend", "search", "browse", "inventory_check"].includes(intent)) {
      return "fast"
    }

    // Everything else → balanced
    return "balanced"
  }

  getConfig(tier: ModelTier): ModelConfig {
    return MODEL_CONFIGS[tier]
  }
}

export const llmRouter = new LLMRouter()
