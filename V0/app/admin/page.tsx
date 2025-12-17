// Admin control panel
"use client"

import { useEffect, useState } from "react"
import { eventBus } from "@/lib/services/event-bus"

export default function AdminPanel() {
  const [events, setEvents] = useState<any[]>([])
  const [stats, setStats] = useState({
    activeSessions: 0,
    totalEvents: 0,
    orders: 0,
    revenue: 0,
  })
  const [selectedDomain, setSelectedDomain] = useState<string>("all")

  useEffect(() => {
    const updateMetrics = () => {
      const allEvents = eventBus.getLog(undefined, 1000)

      let activeSessions = 0
      let orders = 0
      let revenue = 0

      for (const log of allEvents) {
        if (log.topic === "session.created") activeSessions++
        if (log.topic === "sales.order_completed") {
          orders++
          revenue += log.event.final_price || 0
        }
      }

      setStats({
        activeSessions,
        totalEvents: allEvents.length,
        orders,
        revenue,
      })

      const filtered =
        selectedDomain === "all" ? allEvents : allEvents.filter((e) => e.topic.startsWith(selectedDomain))

      setEvents(filtered.slice(-50).reverse())
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 2000)
    return () => clearInterval(interval)
  }, [selectedDomain])

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-white mb-6">Admin Control Panel</h1>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Active Sessions" value={stats.activeSessions} />
          <MetricCard label="Total Events" value={stats.totalEvents} />
          <MetricCard label="Orders" value={stats.orders} />
          <MetricCard label="Revenue" value={`₹${Math.round(stats.revenue)}`} />
        </div>

        {/* Event Stream */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Event Stream</h2>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-slate-700 text-white px-3 py-1 rounded text-sm"
            >
              <option value="all">All Events</option>
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
              <option value="payment">Payment</option>
              <option value="workflow">Workflow</option>
              <option value="etl">ETL</option>
              <option value="ml">ML</option>
              <option value="omnichannel">Omnichannel</option>
              <option value="safety">Safety</option>
            </select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((log, idx) => (
              <div key={idx} className="bg-slate-700 rounded p-2 text-xs font-mono text-slate-300">
                <span className="text-green-400">[{new Date(log.event.ts).toLocaleTimeString()}]</span>
                <span className="text-blue-400 ml-2">{log.topic}</span>
                <span className="text-yellow-400 ml-2 truncate">{JSON.stringify(log.event).slice(0, 100)}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  )
}
