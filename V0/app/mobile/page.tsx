// Mobile channel - Touch-optimized interface
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { sessionManager } from "@/lib/services/session-manager"
import { enhancedSalesAgent } from "@/lib/services/enhanced-sales-agent"
import { dataLayer } from "@/lib/services/data-layer"

export default function MobileChannel() {
  const [sessionId, setSessionId] = useState("")
  const [view, setView] = useState<"chat" | "browse" | "cart">("chat")
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [cart, setCart] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    const initMobile = async () => {
      const session = await sessionManager.createSession("mobile")
      setSessionId(session.session_id)
      setMessages([
        {
          role: "assistant",
          content: "Hi! What are you looking for?",
        },
      ])
      setProducts(dataLayer.getAllProducts())
    }
    initMobile()
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId) return

    setMessages((prev) => [...prev, { role: "user", content: input }])
    setInput("")

    const response = await enhancedSalesAgent.processMessageWithPolicy(sessionId, input)
    setMessages((prev) => [...prev, { role: "assistant", content: response }])

    const session = await sessionManager.getSession(sessionId)
    if (session) setCart(session.context.cart_items)
  }

  const handleAddProduct = async (sku: string, price: number) => {
    await sessionManager.addToCart(sessionId, sku, 1, price)
    const session = await sessionManager.getSession(sessionId)
    if (session) setCart(session.context.cart_items)
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 font-bold">Retail Store</div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {view === "chat" && (
          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "browse" && (
          <div className="grid grid-cols-2 gap-2">
            {products.map((p) => (
              <div key={p.sku} className="bg-slate-100 rounded p-2">
                <img
                  src={p.images[0] || "/placeholder.svg"}
                  alt={p.name}
                  className="w-full h-24 bg-slate-300 rounded mb-1"
                />
                <p className="text-xs font-semibold">{p.name}</p>
                <p className="text-blue-600 font-bold text-xs mb-1">₹{p.price}</p>
                <button
                  onClick={() => handleAddProduct(p.sku, p.price)}
                  className="w-full bg-blue-600 text-white text-xs py-1 rounded font-semibold"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        {view === "cart" && (
          <div className="space-y-2">
            {cart.length === 0 ? (
              <p className="text-slate-600">Cart is empty</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.sku} className="bg-slate-100 p-2 rounded flex justify-between">
                    <span className="text-sm">{item.sku}</span>
                    <span className="font-bold">₹{item.price * item.qty}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 font-bold">
                  Total: ₹{cart.reduce((sum, item) => sum + item.price * item.qty, 0)}
                </div>
                <button className="w-full bg-green-600 text-white py-2 rounded font-semibold">Checkout</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="flex border-t">
        <button
          onClick={() => setView("chat")}
          className={`flex-1 py-2 text-xs font-semibold ${view === "chat" ? "bg-blue-50 text-blue-600 border-t-2 border-blue-600" : "text-slate-600"}`}
        >
          Chat
        </button>
        <button
          onClick={() => setView("browse")}
          className={`flex-1 py-2 text-xs font-semibold ${view === "browse" ? "bg-blue-50 text-blue-600 border-t-2 border-blue-600" : "text-slate-600"}`}
        >
          Browse
        </button>
        <button
          onClick={() => setView("cart")}
          className={`flex-1 py-2 text-xs font-semibold relative ${view === "cart" ? "bg-blue-50 text-blue-600 border-t-2 border-blue-600" : "text-slate-600"}`}
        >
          Cart{" "}
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Chat Input */}
      {view === "chat" && (
        <form onSubmit={handleSend} className="border-t p-2 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type..."
            className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm focus:outline-none"
          />
          <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded font-semibold text-sm">
            Send
          </button>
        </form>
      )}
    </div>
  )
}
