// Mobile app channel (responsive)
"use client"

import { useEffect, useState } from "react"
import { sessionManager } from "@/lib/services/session-manager"
import { recommendationAgent } from "@/lib/services/worker-agents/recommendation-agent"

export function MobileApp() {
  const [sessionId, setSessionId] = useState("")
  const [view, setView] = useState<"home" | "products" | "cart" | "checkout">("home")
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])

  useEffect(() => {
    const initMobile = async () => {
      const session = await sessionManager.createSession("mobile")
      setSessionId(session.session_id)

      // Load recommendations
      const recs = await recommendationAgent.recommend(undefined, session.session_id)
      setRecommendations(recs)
    }

    initMobile()
  }, [])

  const handleAddToCart = async (sku: string, price: number) => {
    if (sessionId) {
      await sessionManager.addToCart(sessionId, sku, 1, price)
      const session = await sessionManager.getSession(sessionId)
      setCart(session?.context.cart_items || [])
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Mobile Header */}
      <div className="bg-blue-600 text-white p-4 fixed top-0 left-0 right-0 z-50">
        <h1 className="text-xl font-bold">Retail Store</h1>
      </div>

      <div className="pt-16 pb-20">
        {view === "home" && (
          <div className="p-4 space-y-4">
            <div className="bg-blue-500 text-white p-4 rounded-lg">
              <p className="text-sm font-semibold">Featured Deals</p>
              <p className="text-2xl font-bold">Up to 50% OFF</p>
            </div>

            <div>
              <h2 className="font-bold text-slate-800 mb-2">Recommended for You</h2>
              <div className="space-y-2">
                {recommendations.slice(0, 3).map((product) => (
                  <div
                    key={product.sku}
                    className="bg-white p-3 rounded-lg flex justify-between items-center border border-slate-200"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{product.name}</p>
                      <p className="text-blue-600 font-bold">₹{product.price}</p>
                    </div>
                    <button
                      onClick={() => handleAddToCart(product.sku, product.price)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around">
        <button
          onClick={() => setView("home")}
          className={`flex-1 py-3 text-center text-xs font-semibold ${view === "home" ? "text-blue-600 border-t-2 border-blue-600" : "text-slate-600"}`}
        >
          Home
        </button>
        <button
          onClick={() => setView("products")}
          className={`flex-1 py-3 text-center text-xs font-semibold ${view === "products" ? "text-blue-600 border-t-2 border-blue-600" : "text-slate-600"}`}
        >
          Shop
        </button>
        <button
          onClick={() => setView("cart")}
          className={`flex-1 py-3 text-center text-xs font-semibold ${view === "cart" ? "text-blue-600 border-t-2 border-blue-600" : "text-slate-600"}`}
        >
          Cart ({cart.length})
        </button>
        <button
          onClick={() => setView("checkout")}
          className={`flex-1 py-3 text-center text-xs font-semibold ${view === "checkout" ? "text-blue-600 border-t-2 border-blue-600" : "text-slate-600"}`}
        >
          Account
        </button>
      </div>
    </div>
  )
}
