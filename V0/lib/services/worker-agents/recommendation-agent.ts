// Recommendation Worker Agent
import type { Product } from "@/lib/types"
import { dataLayer } from "../data-layer"
import { eventBus } from "../event-bus"

export class RecommendationAgent {
  async recommend(userId: string, sessionId: string, context: any = {}): Promise<Product[]> {
    const customer = userId ? dataLayer.getCustomer(userId) : null
    const allProducts = dataLayer.getAllProducts()

    // Hybrid ranking: rules + preferences + seasonality
    let scored = allProducts.map((p) => ({
      product: p,
      score: this.calculateScore(p, customer, context),
    }))

    // Apply complementary boost
    if (context.cart_items?.length > 0) {
      const lastSku = context.cart_items[context.cart_items.length - 1].sku
      const complements = dataLayer.getProduct(lastSku)?.complement_skus || []
      scored = scored.map((s) => ({
        ...s,
        score: complements.includes(s.product.sku) ? s.score + 0.5 : s.score,
      }))
    }

    const recommended = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.product)

    await eventBus.publishToTopic("recommendation", "fetched", {
      session_id: sessionId,
      user_id: userId,
      count: recommended.length,
      products: recommended.map((p) => p.sku),
    })

    return recommended
  }

  private calculateScore(product: Product, customer: any, context: any): number {
    let score = 0

    // Base quality score
    score += product.rating * 0.1

    // Margin preference
    score += (product.margin_percent / 100) * 0.05

    // Seasonality boost
    if (product.is_seasonal) {
      score += 0.2
    }

    // Customer preference match
    if (customer) {
      if (customer.preferences.style.some((s: string) => product.category.includes(s))) {
        score += 0.3
      }
      if (
        product.price >= customer.preferences.budget_range[0] &&
        product.price <= customer.preferences.budget_range[1]
      ) {
        score += 0.2
      }
    }

    // In-stock boost
    if (product.in_stock) {
      score += 0.1
    }

    return score
  }

  async getTrendingProducts(limit = 5): Promise<Product[]> {
    const allProducts = dataLayer.getAllProducts()
    return allProducts
      .filter((p) => p.reviews_count && p.reviews_count > 50)
      .sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0))
      .slice(0, limit)
  }

  async getFrequentlyBoughtTogether(sku: string, limit = 3): Promise<Product[]> {
    const product = dataLayer.getProduct(sku)
    if (!product) return []
    return product.complement_skus
      ?.map((compSku) => dataLayer.getProduct(compSku))
      .filter(Boolean)
      .slice(0, limit) as Product[]
  }

  async createBundle(userId: string, budgetRange: [number, number]): Promise<Product[]> {
    const allProducts = dataLayer.getAllProducts()
    const inBudget = allProducts.filter((p) => p.price < (budgetRange[1] - budgetRange[0]) / 3)

    if (inBudget.length === 0) return []

    const bundle: Product[] = []
    const main = inBudget[Math.floor(Math.random() * inBudget.length)]
    bundle.push(main)

    for (const compSku of main.complement_skus || []) {
      if (bundle.length < 4) {
        const comp = dataLayer.getProduct(compSku)
        if (comp && comp.price < (budgetRange[1] - budgetRange[0]) / 4) {
          bundle.push(comp)
        }
      }
    }

    return bundle
  }
}

export const recommendationAgent = new RecommendationAgent()
