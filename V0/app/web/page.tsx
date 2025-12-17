// Web channel - Desktop interface
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { sessionManager } from "@/lib/services/session-manager"
import { enhancedSalesAgent } from "@/lib/services/enhanced-sales-agent"

export default function WebChannel() {
  const [sessionId, setSessionId] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<any[]>([])

  useEffect(() => {
    const initWeb = async () => {
      const session = await sessionManager.createSession("web")
      setSessionId(session.session_id)
      setMessages([
        {
          role: "assistant",
          content: "Hello! Welcome to our online store. How can I help you today?",
        },
      ])
    }
    initWeb()
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId) return

    setMessages((prev) => [...prev, { role: "user", content: input }])
    setInput("")
    setLoading(true)

    try {
      const response = await enhancedSalesAgent.processMessageWithPolicy(sessionId, input)
      setMessages((prev) => [...prev, { role: "assistant", content: response }])

      const session = await sessionManager.getSession(sessionId)
      if (session) setCart(session.context.cart_items)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 h-screen">
        {/* Chat */}
        <div className="lg:col-span-2 flex flex-col bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-slate-400 text-sm">Thinking...</div>}
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-700 p-4 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold">
              Send
            </button>
          </form>
        </div>

        {/* Cart Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-3">Cart</h3>
            {cart.length === 0 ? (
              <p className="text-slate-400">Empty</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.sku} className="flex justify-between text-sm text-slate-300 mb-1">
                    <span>{item.sku}</span>
                    <span>₹{item.price * item.qty}</span>
                  </div>
                ))}
                <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between font-bold text-white">
                  <span>Total:</span>
                  <span>₹{cartTotal}</span>
                </div>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded mt-3 font-semibold">
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
