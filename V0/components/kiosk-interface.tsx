// In-store kiosk channel (PWA)
"use client"

import { useEffect, useState } from "react"
import { sessionManager } from "@/lib/services/session-manager"
import { dataLayer } from "@/lib/services/data-layer"

interface KioskProduct {
  sku: string
  name: string
  price: number
  image: string
}

export function KioskInterface() {
  const [sessionId, setSessionId] = useState("")
  const [cart, setCart] = useState<any[]>([])
  const [products, setProducts] = useState<KioskProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [qrCode, setQrCode] = useState("")
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Initialize kiosk session
    const initKiosk = async () => {
      const session = await sessionManager.createSession("kiosk", undefined, "store_001")
      setSessionId(session.session_id)
      // Generate QR for handoff
      setQrCode(`https://app.retail.com/session/${session.session_id}`)
    }

    initKiosk()

    // Monitor online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    // Load products
    const allProducts = dataLayer.getAllProducts()
    setProducts(
      allProducts.map((p) => ({
        sku: p.sku,
        name: p.name,
        price: p.price,
        image: p.images[0] || "/placeholder.svg",
      })),
    )
  }, [])

  const handleAddProduct = async (product: KioskProduct) => {
    if (sessionId) {
      await sessionManager.addToCart(sessionId, product.sku, 1, product.price)
      const session = await sessionManager.getSession(sessionId)
      setCart(session?.context.cart_items || [])
    }
  }

  const handleCheckout = () => {
    // Would trigger payment flow
    console.log("Kiosk checkout:", cart)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-white">In-Store Shopping</h1>
          <div className={`px-4 py-2 rounded-lg ${isOnline ? "bg-green-600" : "bg-red-600"} text-white`}>
            {isOnline ? "Online" : "Offline Mode"}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Product Grid */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex gap-2 flex-wrap">
              <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold">All</button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">Apparel</button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">Footwear</button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">Accessories</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.sku}
                  className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition"
                >
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-48 object-cover bg-slate-200"
                  />
                  <div className="p-3">
                    <h3 className="font-semibold text-slate-800 text-sm mb-1">{product.name}</h3>
                    <p className="text-blue-600 font-bold mb-2">₹{product.price}</p>
                    <button
                      onClick={() => handleAddProduct(product)}
                      className="w-full bg-blue-600 text-white py-1 rounded text-xs font-semibold hover:bg-blue-700"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar: Cart & QR */}
          <div className="lg:col-span-1 space-y-4">
            {/* Cart */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-bold text-slate-800 mb-3">Your Cart</h3>
              {cart.length === 0 ? (
                <p className="text-slate-500 text-sm">Cart is empty</p>
              ) : (
                <>
                  <div className="space-y-2 mb-3">
                    {cart.map((item) => (
                      <div key={item.sku} className="flex justify-between text-xs text-slate-700">
                        <span>{item.sku}</span>
                        <span>₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 text-sm"
                  >
                    Proceed to Payment
                  </button>
                </>
              )}
            </div>

            {/* QR Code */}
            {qrCode && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Handoff to Phone</h3>
                <div className="bg-slate-200 p-4 rounded flex items-center justify-center h-40">
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-2">Scan with phone</p>
                    <p className="text-xs text-slate-600 font-mono">{sessionId.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
