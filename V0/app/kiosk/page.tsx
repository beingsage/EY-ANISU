// In-store kiosk - Touch-optimized with offline support
"use client"

import { useEffect, useState } from "react"
import { sessionManager } from "@/lib/services/session-manager"
import { dataLayer } from "@/lib/services/data-layer"

export default function KioskChannel() {
  const [sessionId, setSessionId] = useState("")
  const [cart, setCart] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [qrCode, setQrCode] = useState("")

  useEffect(() => {
    const initKiosk = async () => {
      const session = await sessionManager.createSession("kiosk", undefined, "store_001")
      setSessionId(session.session_id)
      setQrCode(`session:${session.session_id}`)
      setProducts(dataLayer.getAllProducts())
    }

    initKiosk()

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleAddProduct = async (sku: string, price: number) => {
    if (sessionId) {
      await sessionManager.addToCart(sessionId, sku, 1, price)
      const session = await sessionManager.getSession(sessionId)
      if (session) setCart(session.context.cart_items)
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      {/* Header */}
      <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">In-Store Kiosk</h1>
        <div className={`px-4 py-2 rounded-lg font-semibold ${isOnline ? "bg-green-600" : "bg-red-600"}`}>
          {isOnline ? "🟢 Online" : "🔴 Offline"}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
        {/* Product Grid */}
        <div className="lg:col-span-3 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((p) => (
              <button
                key={p.sku}
                onClick={() => handleAddProduct(p.sku, p.price)}
                className="bg-white rounded-lg p-3 hover:shadow-lg transition"
              >
                <img
                  src={p.images[0] || "/placeholder.svg"}
                  alt={p.name}
                  className="w-full h-32 bg-slate-200 rounded mb-2 object-cover"
                />
                <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                <p className="text-blue-600 font-bold text-lg">₹{p.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {/* Cart */}
          <div className="bg-white rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-2">Cart</h3>
            <div className="flex-1 overflow-y-auto space-y-1 mb-2">
              {cart.map((item) => (
                <div key={item.sku} className="text-xs bg-blue-50 p-1 rounded flex justify-between">
                  <span>{item.sku}</span>
                  <span>₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <>
                <div className="border-t pt-2 font-bold text-blue-600 text-lg mb-2">₹{cartTotal}</div>
                <button className="w-full bg-green-600 text-white py-3 rounded font-bold">Checkout</button>
              </>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-bold text-slate-800 mb-2 text-sm">Handoff</h3>
            <div className="bg-slate-200 p-3 rounded text-center">
              <p className="text-xs text-slate-600 mb-1">Scan to phone</p>
              <p className="font-mono text-sm font-bold text-slate-800">{qrCode.slice(0, 12)}...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
