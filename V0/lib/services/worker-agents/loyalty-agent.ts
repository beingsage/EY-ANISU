// Loyalty & Offers Worker Agent
import type { CartItem } from "@/lib/types"
import { dataLayer } from "../data-layer"
import { eventBus } from "../event-bus"

export class LoyaltyAgent {
  async calculatePrice(items: CartItem[], userId?: string, promoCode?: string) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    let loyaltyDiscount = 0
    let promoDiscount = 0
    let pointsEarned = 0

    // Apply promo code
    if (promoCode) {
      const promo = dataLayer.getPromotion(promoCode)
      if (promo && promo.valid_until > Date.now()) {
        if (subtotal >= promo.min_cart_value) {
          promoDiscount = promo.type === "percentage" ? (subtotal * promo.value) / 100 : promo.value
        }
      }
    }

    // Apply loyalty
    if (userId) {
      const customer = dataLayer.getCustomer(userId)
      if (customer) {
        const rule = dataLayer.getLoyaltyRule(customer.loyalty_tier)
        if (rule) {
          // 1 point per rupee (base) × multiplier
          pointsEarned = Math.floor((subtotal - promoDiscount) * rule.point_multiplier * rule.points_per_rupee)
          loyaltyDiscount = Math.min(pointsEarned * 0.5, subtotal - promoDiscount) // Redeem up to 50% of points value
        }
      }
    }

    const finalPrice = subtotal - loyaltyDiscount - promoDiscount

    await eventBus.publishToTopic("loyalty", "calculated", {
      user_id: userId,
      subtotal,
      loyalty_discount: loyaltyDiscount,
      promo_discount: promoDiscount,
      points_earned: pointsEarned,
      final_price: finalPrice,
    })

    return {
      subtotal,
      loyalty_discount: loyaltyDiscount,
      promo_discount: promoDiscount,
      final_price: Math.max(0, finalPrice),
      points_earned: pointsEarned,
    }
  }

  async applyReward(userId: string, points: number) {
    const customer = dataLayer.getCustomer(userId)
    if (customer) {
      customer.loyalty_points += points
      dataLayer.saveCustomer(customer)
      await eventBus.publishToTopic("loyalty", "points_awarded", {
        user_id: userId,
        points,
        total_points: customer.loyalty_points,
      })
    }
  }
}

export const loyaltyAgent = new LoyaltyAgent()
