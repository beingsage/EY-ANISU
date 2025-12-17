"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Dashboard } from "@/components/dashboard"
import { EventLogger } from "@/components/event-logger"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard" | "events">("chat")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Conversational Sales Agent</h1>
            <p className="text-sm text-slate-400">Omnichannel Retail AI Platform</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === "chat" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Sales Chat
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === "dashboard" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === "events" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Events
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {activeTab === "chat" && <ChatInterface />}
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "events" && <EventLogger />}
      </main>
    </div>
  )
}
