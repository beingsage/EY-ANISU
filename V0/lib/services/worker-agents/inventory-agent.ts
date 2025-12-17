// Inventory Worker Agent
import type { Reservation } from "@/lib/types"
import { dataLayer } from "../data-layer"
import { eventBus } from "../event-bus"
import { generateUUID } from "@/lib/utils/uuid"

export class InventoryAgent {
  async checkAvailability(sku: string, qty: number, radius_km = 25) {
    const product = dataLayer.getProduct(sku)
    const inventory = dataLayer.getInventory(sku)

    if (!product || !inventory) {
      return { status: "error", message: "Product not found" }
    }

    const options = []

    // Ship to home
    if (inventory.online_qty >= qty) {
      options.push({
        type: "ship_to_home",
        available: true,
        qty_available: inventory.online_qty,
        estimated_days: 3,
      })
    }

    // Store pickup / reserve
    for (const store of inventory.stores) {
      if (store.qty >= qty) {
        options.push({
          type: "reserve_in_store",
          store_id: store.store_id,
          location: store.location,
          qty_available: store.qty,
          time_slots: ["09:00", "12:00", "15:00", "18:00"],
        })
      }
    }

    if (options.length === 0 && inventory.reserved_qty > 0) {
      options.push({
        type: "backorder",
        estimated_days: 7,
        notify: true,
      })
    }

    await eventBus.publishToTopic("inventory", "checked", {
      sku,
      qty_requested: qty,
      options_found: options.length,
    })

    return { status: "success", options }
  }

  async reserve(
    sku: string,
    storeId: string,
    userId: string,
    sessionId: string,
    qty: number,
  ): Promise<Reservation | null> {
    const inventory = dataLayer.getInventory(sku)
    if (!inventory || !inventory.stores.find((s) => s.store_id === storeId && s.qty >= qty)) {
      await eventBus.publishToTopic("inventory", "reserve_failed", { sku, store_id: storeId })
      return null
    }

    const reservation: Reservation = {
      reservation_id: generateUUID(),
      sku,
      store_id: storeId,
      user_id: userId,
      session_id: sessionId,
      qty,
      hold_until: Date.now() + 15 * 60 * 1000, // 15 min hold
      status: "active",
      created_at: Date.now(),
    }

    const created = dataLayer.createReservation(reservation)

    // Schedule auto-release
    setTimeout(
      () => {
        dataLayer.expireReservation(reservation.reservation_id)
        eventBus.publishToTopic("inventory", "reservation_expired", {
          reservation_id: reservation.reservation_id,
        })
      },
      15 * 60 * 1000,
    )

    await eventBus.publishToTopic("inventory", "reserved", {
      reservation_id: created.reservation_id,
      sku,
      store_id: storeId,
    })

    return created
  }

  async releaseReservation(reservationId: string): Promise<boolean> {
    const reservation = dataLayer.getReservation(reservationId)
    if (!reservation) return false

    dataLayer.expireReservation(reservationId)
    await eventBus.publishToTopic("inventory", "reservation_released", {
      reservation_id: reservationId,
      sku: reservation.sku,
    })
    return true
  }

  async realTimeInventorySync(sku: string): Promise<void> {
    const inv = dataLayer.getInventory(sku)
    if (inv) {
      inv.last_sync = Date.now()
      await eventBus.publishToTopic("inventory", "sync_completed", { sku, timestamp: inv.last_sync })
    }
  }

  async getInventoryMetrics() {
    const allProducts = dataLayer.getAllProducts()
    const totalOnline = allProducts.reduce((sum, p) => {
      const inv = dataLayer.getInventory(p.sku)
      return sum + (inv?.online_qty || 0)
    }, 0)

    return {
      total_products: allProducts.length,
      total_online_inventory: totalOnline,
      out_of_stock_count: allProducts.filter((p) => {
        const inv = dataLayer.getInventory(p.sku)
        return !inv || inv.online_qty === 0
      }).length,
    }
  }
}

export const inventoryAgent = new InventoryAgent()
