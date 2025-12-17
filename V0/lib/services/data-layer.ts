// Mock data store for customers, products, inventory
import type { CustomerProfile, Product, InventoryItem, Promotion, LoyaltyRule, Order, Reservation } from "@/lib/types"

export class DataLayer {
  private customers = new Map<string, CustomerProfile>()
  private products = new Map<string, Product>()
  private inventory = new Map<string, InventoryItem>()
  private promotions = new Map<string, Promotion>()
  private loyaltyRules = new Map<string, LoyaltyRule>()
  private orders = new Map<string, Order>()
  private reservations = new Map<string, Reservation>()
  private faqCorpus: Array<{ id: string; question: string; answer: string; category: string; tags: string[] }> = []
  private policyDocuments: Array<{ id: string; title: string; content: string; version: string }> = []

  constructor() {
    this.seedData()
  }

  private seedData() {
    // Seed 30+ customers with diverse profiles
    const customerData = [
      {
        name: "Rahul Kumar",
        email: "rahul.kumar@email.com",
        phone: "+91-9876543210",
        age_group: "18-25",
        gender: "M",
        tier: "gold",
      },
      {
        name: "Priya Singh",
        email: "priya.singh@email.com",
        phone: "+91-9876543211",
        age_group: "26-35",
        gender: "F",
        tier: "silver",
      },
      {
        name: "Amit Patel",
        email: "amit.patel@email.com",
        phone: "+91-9876543212",
        age_group: "35-45",
        gender: "M",
        tier: "bronze",
      },
      {
        name: "Neha Verma",
        email: "neha.verma@email.com",
        phone: "+91-9876543213",
        age_group: "26-35",
        gender: "F",
        tier: "platinum",
      },
      {
        name: "Vikram Reddy",
        email: "vikram.reddy@email.com",
        phone: "+91-9876543214",
        age_group: "35-45",
        gender: "M",
        tier: "gold",
      },
      {
        name: "Sneha Gupta",
        email: "sneha.gupta@email.com",
        phone: "+91-9876543215",
        age_group: "18-25",
        gender: "F",
        tier: "bronze",
      },
      {
        name: "Akshay Nair",
        email: "akshay.nair@email.com",
        phone: "+91-9876543216",
        age_group: "26-35",
        gender: "M",
        tier: "silver",
      },
      {
        name: "Divya Sharma",
        email: "divya.sharma@email.com",
        phone: "+91-9876543217",
        age_group: "35-45",
        gender: "F",
        tier: "gold",
      },
      {
        name: "Rohan Das",
        email: "rohan.das@email.com",
        phone: "+91-9876543218",
        age_group: "18-25",
        gender: "M",
        tier: "bronze",
      },
      {
        name: "Isha Kapoor",
        email: "isha.kapoor@email.com",
        phone: "+91-9876543219",
        age_group: "26-35",
        gender: "F",
        tier: "platinum",
      },
    ]

    for (let i = 0; i < customerData.length; i++) {
      const c = customerData[i]
      const userId = `cust_${String(i + 1).padStart(3, "0")}`
      this.customers.set(userId, {
        user_id: userId,
        email: c.email,
        phone: c.phone,
        name: c.name,
        demographics: {
          age_group: c.age_group,
          gender: c.gender,
          location: ["Bangalore", "Mumbai", "Delhi", "Chennai"][i % 4],
        },
        purchase_history: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => ({
          order_id: `order_${Date.now()}_${i}`,
          date: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
          amount: Math.floor(Math.random() * 5000) + 1000,
        })),
        preferences: {
          style: [
            ["casual", "formal"],
            ["sports", "casual"],
            ["formal", "ethnic"],
          ][i % 3],
          size: ["M", "L", "S", "XL"][i % 4],
          budget_range: [500 + i * 200, 5000 + i * 500],
          preferred_channels: ["web", "mobile", "whatsapp", "in-store"],
        },
        loyalty_tier: c.tier,
        loyalty_points: (i + 1) * 150 + Math.floor(Math.random() * 500),
        created_at: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
      })
    }

    // Seed 40+ products
    const productCatalog = [
      // Apparel - 12 items
      {
        sku: "TSHIRT-001",
        name: "Classic Cotton T-Shirt",
        category: "apparel",
        price: 499,
        color: "Blue",
        size: "M",
        material: "100% Cotton",
      },
      {
        sku: "TSHIRT-002",
        name: "Premium Graphic Tee",
        category: "apparel",
        price: 799,
        color: "Black",
        size: "M",
        material: "Cotton Blend",
      },
      {
        sku: "TSHIRT-003",
        name: "Vintage Logo Tee",
        category: "apparel",
        price: 649,
        color: "White",
        size: "L",
        material: "Organic Cotton",
      },
      {
        sku: "JEANS-001",
        name: "Slim Fit Denim Jeans",
        category: "apparel",
        price: 1299,
        color: "Black",
        size: "L",
        material: "100% Denim",
      },
      {
        sku: "JEANS-002",
        name: "Skinny Blue Jeans",
        category: "apparel",
        price: 1499,
        color: "Blue",
        size: "M",
        material: "Stretch Denim",
      },
      {
        sku: "JEANS-003",
        name: "Ripped Distressed Jeans",
        category: "apparel",
        price: 1899,
        color: "Blue",
        size: "L",
        material: "Premium Denim",
      },
      {
        sku: "SHIRT-001",
        name: "Formal White Shirt",
        category: "apparel",
        price: 1199,
        color: "White",
        size: "M",
        material: "Cotton",
      },
      {
        sku: "SHIRT-002",
        name: "Casual Checkered Shirt",
        category: "apparel",
        price: 899,
        color: "Multi",
        size: "L",
        material: "Cotton",
      },
      // Footwear - 8 items
      {
        sku: "SHOES-001",
        name: "Casual White Sneakers",
        category: "footwear",
        price: 1999,
        color: "White",
        size: "M",
        material: "Canvas",
      },
      {
        sku: "SHOES-002",
        name: "Running Trainers",
        category: "footwear",
        price: 3999,
        color: "Black",
        size: "M",
        material: "Mesh+Synthetic",
      },
      {
        sku: "SHOES-003",
        name: "Formal Black Loafers",
        category: "footwear",
        price: 2499,
        color: "Black",
        size: "M",
        material: "Leather",
      },
      {
        sku: "SHOES-004",
        name: "Sports Basketball Shoes",
        category: "footwear",
        price: 4999,
        color: "Black",
        size: "M",
        material: "Synthetic",
      },
      // Accessories - 10 items
      {
        sku: "WATCH-001",
        name: "Classic Analog Watch",
        category: "accessories",
        price: 2999,
        color: "Black",
        material: "Stainless Steel",
      },
      {
        sku: "WATCH-002",
        name: "Digital Smart Watch",
        category: "accessories",
        price: 5999,
        color: "Silver",
        material: "Aluminum",
      },
      {
        sku: "BELT-001",
        name: "Genuine Leather Belt",
        category: "accessories",
        price: 699,
        color: "Brown",
        material: "Leather",
      },
      {
        sku: "BELT-002",
        name: "Formal Black Belt",
        category: "accessories",
        price: 799,
        color: "Black",
        material: "Leather",
      },
      {
        sku: "SCARF-001",
        name: "Wool Winter Scarf",
        category: "accessories",
        price: 599,
        color: "Grey",
        material: "Wool",
      },
      {
        sku: "SUNGLASSES-001",
        name: "UV Protected Sunglasses",
        category: "accessories",
        price: 1299,
        color: "Black",
        material: "Plastic",
      },
      {
        sku: "BACKPACK-001",
        name: "Travel Backpack",
        category: "accessories",
        price: 1999,
        color: "Black",
        material: "Nylon",
      },
      {
        sku: "WALLET-001",
        name: "Leather Wallet",
        category: "accessories",
        price: 499,
        color: "Brown",
        material: "Leather",
      },
    ]

    for (const p of productCatalog) {
      this.products.set(p.sku, {
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: `High-quality ${p.name.toLowerCase()} - premium craftsmanship`,
        price: p.price,
        attributes: { color: p.color, ...(p.size && { size: p.size }), material: p.material },
        images: [`/placeholder.svg?height=300&width=300&query=${encodeURIComponent(p.name)}`],
        rating: 3.8 + Math.random() * 1.2,
        reviews_count: Math.floor(Math.random() * 500) + 50,
        in_stock: Math.random() > 0.15,
        margin_percent: 25 + Math.random() * 35,
        is_seasonal: ["TSHIRT", "SANDALS"].some((cat) => p.sku.includes(cat)) && Math.random() > 0.5,
        complement_skus: this.getComplementsForProduct(p.sku),
      })
    }

    // Seed inventory
    for (const [sku] of this.products) {
      this.inventory.set(sku, {
        sku,
        online_qty: Math.floor(Math.random() * 200) + 10,
        stores: [
          { store_id: "store_001", qty: Math.floor(Math.random() * 100) + 5, location: [12.9716, 77.5946] },
          { store_id: "store_002", qty: Math.floor(Math.random() * 100) + 5, location: [13.0827, 80.2707] },
          { store_id: "store_003", qty: Math.floor(Math.random() * 100) + 5, location: [19.076, 72.8777] },
          { store_id: "store_004", qty: Math.floor(Math.random() * 100) + 5, location: [28.7041, 77.1025] },
        ],
        reserved_qty: Math.floor(Math.random() * 20),
        last_sync: Date.now(),
      })
    }

    // Seed 10+ promotions
    this.promotions.set("SAVE10", {
      promo_id: "promo_001",
      code: "SAVE10",
      type: "percentage",
      value: 10,
      min_cart_value: 1000,
      max_uses: 1000,
      usage_count: 150,
      valid_until: Date.now() + 30 * 24 * 60 * 60 * 1000,
      applicable_categories: ["apparel", "footwear"],
      applicable_tiers: ["bronze", "silver", "gold", "platinum"],
    })
    this.promotions.set("FLAT500", {
      promo_id: "promo_002",
      code: "FLAT500",
      type: "flat",
      value: 500,
      min_cart_value: 2000,
      max_uses: 500,
      usage_count: 75,
      valid_until: Date.now() + 60 * 24 * 60 * 60 * 1000,
      applicable_categories: [],
      applicable_tiers: ["silver", "gold", "platinum"],
    })

    // Seed loyalty rules
    this.loyaltyRules.set("gold", {
      rule_id: "lr_gold",
      tier: "gold",
      point_multiplier: 2,
      points_per_rupee: 1,
      tier_benefits: { free_shipping_threshold: 500, birthday_points: 500 },
    })
    this.loyaltyRules.set("platinum", {
      rule_id: "lr_platinum",
      tier: "platinum",
      point_multiplier: 3,
      points_per_rupee: 2,
      tier_benefits: { free_shipping_threshold: 0, birthday_points: 1000, concierge: true },
    })
  }

  private getComplementsForProduct(sku: string): string[] {
    const map: Record<string, string[]> = {
      "TSHIRT-001": ["JEANS-001", "SHOES-001", "BELT-001"],
      "TSHIRT-002": ["JEANS-002", "SHOES-002"],
      "JEANS-001": ["TSHIRT-001", "SHOES-001", "BELT-001"],
      "SHOES-001": ["TSHIRT-001", "JEANS-001", "WATCH-001"],
      "WATCH-001": ["TSHIRT-001", "BELT-001"],
      "BELT-001": ["JEANS-001", "SHIRT-001"],
    }
    return map[sku] || []
  }

  // Customer operations
  getCustomer(userId: string) {
    return this.customers.get(userId)
  }

  saveCustomer(customer: CustomerProfile) {
    this.customers.set(customer.user_id, customer)
  }

  // Product operations
  getProduct(sku: string) {
    return this.products.get(sku)
  }

  searchProducts(query: string, limit = 10): Product[] {
    return Array.from(this.products.values())
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.category === query)
      .slice(0, limit)
  }

  getAllProducts(): Product[] {
    return Array.from(this.products.values())
  }

  // Inventory operations
  getInventory(sku: string) {
    return this.inventory.get(sku)
  }

  updateInventory(sku: string, onlineQty: number) {
    const inv = this.inventory.get(sku)
    if (inv) {
      inv.online_qty = onlineQty
      inv.last_sync = Date.now()
    }
  }

  // Promotion operations
  getPromotion(code: string) {
    return this.promotions.get(code)
  }

  // Loyalty rules
  getLoyaltyRule(tier: string) {
    return this.loyaltyRules.get(tier)
  }

  // Order operations
  createOrder(order: Order) {
    this.orders.set(order.order_id, order)
    return order
  }

  getOrder(orderId: string) {
    return this.orders.get(orderId)
  }

  // Reservation operations
  createReservation(reservation: Reservation) {
    this.reservations.set(reservation.reservation_id, reservation)
    const inv = this.inventory.get(reservation.sku)
    if (inv) {
      inv.reserved_qty += reservation.qty
    }
    return reservation
  }

  getReservation(reservationId: string) {
    return this.reservations.get(reservationId)
  }

  expireReservation(reservationId: string) {
    const res = this.reservations.get(reservationId)
    if (res && res.status === "active") {
      res.status = "expired"
      const inv = this.inventory.get(res.sku)
      if (inv) {
        inv.reserved_qty = Math.max(0, inv.reserved_qty - res.qty)
      }
    }
  }

  // FAQ & Policy operations
  searchFAQ(query: string, limit = 5) {
    return this.faqCorpus
      .filter(
        (faq) =>
          faq.question.toLowerCase().includes(query.toLowerCase()) ||
          faq.tags.some((t) => t.includes(query.toLowerCase())),
      )
      .slice(0, limit)
  }

  getPolicyDocument(title: string) {
    return this.policyDocuments.find((p) => p.title.toLowerCase() === title.toLowerCase())
  }

  getAllFAQs() {
    return this.faqCorpus
  }

  getAllPolicies() {
    return this.policyDocuments
  }

  // Add order retrieval by user
  getOrdersByUser(userId: string): Order[] {
    return Array.from(this.orders.values()).filter((o) => o.user_id === userId)
  }

  // Get active reservations
  getActiveReservations() {
    return Array.from(this.reservations.values()).filter((r) => r.status === "active")
  }
}

export const dataLayer = new DataLayer()
