// Core type contracts for the entire system

// Channel types
export type ChannelType = "web" | "mobile" | "whatsapp" | "telegram" | "kiosk" | "voice" | "pos"

// Session & Identity
export interface Session {
  session_id: string
  user_id?: string
  channel: ChannelType
  store_id?: string
  device_fingerprint?: string
  qr_token?: string
  created_at: number
  last_activity: number
  context: {
    cart_items: CartItem[]
    browsing_history: string[]
    location?: [number, number]
    customer_profile?: Partial<CustomerProfile>
    memory: Record<string, any>
  }
  ttl_seconds: number
}

export interface EventMessage {
  channel: ChannelType
  session_id: string
  user_id?: string
  store_id?: string
  payload: {
    type: "message" | "action" | "event"
    content: string
    metadata?: Record<string, any>
  }
  ts: number
  idempotency_key?: string
}

// Customer data
export interface CustomerProfile {
  user_id: string
  email: string
  phone: string
  name: string
  demographics: {
    age_group: string
    gender?: string
    location: string
  }
  purchase_history: Order[]
  preferences: {
    style: string[]
    size?: string
    budget_range: [number, number]
    preferred_channels: ChannelType[]
  }
  loyalty_tier: "bronze" | "silver" | "gold" | "platinum"
  loyalty_points: number
  created_at: number
}

// Product & Inventory
export interface Product {
  sku: string
  name: string
  category: string
  description: string
  price: number
  attributes: {
    size?: string
    color?: string
    material?: string
    brand?: string
  }
  images: string[]
  rating: number
  in_stock: boolean
  margin_percent: number
  is_seasonal: boolean
  complement_skus: string[]
  embedding?: number[]
}

export interface InventoryItem {
  sku: string
  online_qty: number
  stores: Array<{
    store_id: string
    qty: number
    location: [number, number]
  }>
  reserved_qty: number
  last_sync: number
}

export interface Reservation {
  reservation_id: string
  sku: string
  store_id: string
  user_id: string
  session_id: string
  qty: number
  hold_until: number
  status: "active" | "completed" | "expired" | "released"
  created_at: number
}

// Orders & Checkout
export interface CartItem {
  sku: string
  qty: number
  price: number
  loyalty_applied: boolean
}

export interface Order {
  order_id: string
  user_id: string
  session_id: string
  channel: ChannelType
  items: CartItem[]
  subtotal: number
  loyalty_discount: number
  promo_discount: number
  final_price: number
  payment_method: "card" | "upi" | "wallet" | "pos"
  payment_status: "pending" | "authorized" | "captured" | "failed" | "refunded"
  fulfillment_type: "ship" | "collect" | "reserve"
  fulfillment_status: "pending" | "confirmed" | "shipped" | "delivered" | "failed"
  store_id?: string
  delivery_address?: string
  created_at: number
  completed_at?: number
}

// Promotions & Loyalty
export interface Promotion {
  promo_id: string
  code: string
  type: "percentage" | "fixed" | "bogo" | "free_shipping"
  value: number
  min_cart_value: number
  max_uses: number
  usage_count: number
  valid_until: number
  applicable_categories: string[]
  applicable_tiers: string[]
}

export interface LoyaltyRule {
  rule_id: string
  tier: "bronze" | "silver" | "gold" | "platinum"
  point_multiplier: number
  points_per_rupee: number
  tier_benefits: {
    free_shipping_threshold?: number
    exclusive_access_days?: number
    birthday_points?: number
  }
}

// Tool calling contracts
export interface ToolCall {
  call_id: string
  tool: string
  args: Record<string, any>
  timeout_ms: number
  callback_topic: string
}

export interface ToolResponse {
  call_id: string
  tool: string
  status: "success" | "error"
  result: Record<string, any>
  error_message?: string
  latency_ms: number
}

// Workflow & Event
export interface WorkflowExecution {
  workflow_id: string
  workflow_type: "payment_flow" | "reservation_flow" | "refund_flow" | "fulfillment_flow"
  status: "running" | "succeeded" | "failed" | "compensating"
  order_id?: string
  session_id: string
  state: Record<string, any>
  created_at: number
}

export interface DomainEvent {
  event_id: string
  event_type: string
  domain: "sales" | "inventory" | "payment" | "fulfillment" | "loyalty"
  session_id?: string
  order_id?: string
  data: Record<string, any>
  ts: number
  source_service: string
}
