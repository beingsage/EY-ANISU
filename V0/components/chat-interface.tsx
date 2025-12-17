"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { sessionManager } from "@/lib/services/session-manager"
import { salesAgent } from "@/lib/services/sales-agent"
import { eventBus } from "@/lib/services/event-bus"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [cart, setCart] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      const session = await sessionManager.createSession("web")
      setSessionId(session.session_id)

      // Welcome message
      setMessages([
        {
          id: "0",
          role: "assistant",
          content: "Hello! Welcome to our store. How can I help you today? 🛍️",
          timestamp: Date.now(),
        },
      ])
    }

    initSession()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Listen to cart updates
  useEffect(() => {
    if (!sessionId) return

    const unsubscribe = eventBus.subscribe("cart.item_added", (event) => {
      if (event.session_id === sessionId) {
        updateCart()
      }
    })

    return () => unsubscribe()
  }, [sessionId])

  const updateCart = async () => {
    if (!sessionId) return
    const session = await sessionManager.getSession(sessionId)
    if (session) {
      setCart(session.context.cart_items)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await salesAgent.processMessage(sessionId, input)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      updateCart()
    } catch (error) {
      console.error("Error processing message:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!sessionId) return
    await sessionManager.addToCart(sessionId, "TSHIRT-001", 1, 499)
    updateCart()
  }

  const handleCheckout = async () => {
    if (!sessionId) return
    setLoading(true)
    const order = await salesAgent.executeCheckout(sessionId, "ship")
    if (order) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `🎉 Order confirmed! Order ID: ${order.order_id}\n\nTotal: ₹${order.final_price}\n\nYou'll receive an email confirmation shortly.`,
          timestamp: Date.now(),
        },
      ])
      setCart([])
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-screen max-h-[calc(100vh-150px)]">
      {/* Chat Area */}
      <div className="lg:col-span-2 flex flex-col bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-700 text-slate-100 rounded-bl-none"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 text-slate-300 px-4 py-2 rounded-lg rounded-bl-none">
                <p className="text-sm">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700 p-4 bg-slate-800/50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        {/* Cart */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Shopping Cart</h3>
          {cart.length === 0 ? (
            <p className="text-slate-400 text-sm">Your cart is empty</p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.sku} className="flex justify-between text-sm text-slate-300">
                  <span>{item.sku}</span>
                  <span>₹{item.price * item.qty}</span>
                </div>
              ))}
              <div className="border-t border-slate-700 pt-2 mt-2 font-semibold text-white">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>₹{cart.reduce((sum, item) => sum + item.price * item.qty, 0)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white py-2 rounded-lg mt-3 text-sm font-medium transition"
              >
                Checkout
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={handleAddToCart}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition"
            >
              Add Sample Item
            </button>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition">
              View Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
