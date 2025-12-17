// Fulfillment Worker Agent
import type { Order } from "@/lib/types"
import { eventBus } from "../event-bus"
import { generateUUID } from "@/lib/utils/uuid"

export class FulfillmentAgent {
  async createFulfillment(order: Order) {
    const fulfillmentId = generateUUID()

    if (order.fulfillment_type === "ship") {
      return await this.scheduleShipment(order, fulfillmentId)
    } else if (order.fulfillment_type === "collect") {
      return await this.schedulePickup(order, fulfillmentId)
    } else {
      return await this.scheduleReserveInStore(order, fulfillmentId)
    }
  }

  private async scheduleShipment(order: Order, fulfillmentId: string) {
    const estimatedDelivery = new Date()
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 3)

    await eventBus.publishToTopic("fulfillment", "shipment_scheduled", {
      order_id: order.order_id,
      fulfillment_id: fulfillmentId,
      estimated_delivery: estimatedDelivery.toISOString(),
    })

    return { fulfillment_id: fulfillmentId, status: "scheduled", type: "shipment" }
  }

  private async schedulePickup(order: Order, fulfillmentId: string) {
    await eventBus.publishToTopic("fulfillment", "pickup_scheduled", {
      order_id: order.order_id,
      fulfillment_id: fulfillmentId,
      store_id: order.store_id,
    })

    return { fulfillment_id: fulfillmentId, status: "scheduled", type: "pickup" }
  }

  private async scheduleReserveInStore(order: Order, fulfillmentId: string) {
    const reserveUntil = new Date()
    reserveUntil.setDate(reserveUntil.getDate() + 1)

    await eventBus.publishToTopic("fulfillment", "reserve_scheduled", {
      order_id: order.order_id,
      fulfillment_id: fulfillmentId,
      store_id: order.store_id,
      reserve_until: reserveUntil.toISOString(),
    })

    return { fulfillment_id: fulfillmentId, status: "scheduled", type: "reserve_in_store" }
  }

  async updateFulfillmentStatus(orderId: string, status: string) {
    await eventBus.publishToTopic("fulfillment", "status_updated", {
      order_id: orderId,
      status,
    })
  }
}

export const fulfillmentAgent = new FulfillmentAgent()
