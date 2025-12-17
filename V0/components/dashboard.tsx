"use client"

import { useEffect, useState } from "react"
import { eventBus } from "@/lib/services/event-bus"

export function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    conversionRate: 0,
    avgOrderValue: 0,
  })
  const [recentEvents, setRecentEvents] = useState<any[]>([])

  useEffect(() => {
    const updateStats = () => {
      const logs = eventBus.getLog(undefined, 1000)

      let orders = 0
      let revenue = 0

      for (const log of logs) {
        if (log.event.order_id) orders++
        if (log.event.final_price) revenue += log.event.final_price
      }

      setStats({
        totalOrders: orders,
        totalRevenue: revenue,
        conversionRate: Math.random() * 100, // Simulated
        avgOrderValue: orders > 0 ? revenue / orders : 0,
      })

      setRecentEvents(logs.slice(-10).reverse())
    }

    updateStats()
    const interval = setInterval(updateStats, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={stats.totalOrders} />
        <StatCard label="Revenue" value={`₹${stats.totalRevenue.toFixed(0)}`} />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} />
        <StatCard label="Avg Order Value" value={`₹${stats.avgOrderValue.toFixed(0)}`} />
      </div>

      {/* Recent Events */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Recent System Events</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentEvents.map((log, idx) => (
            <div key={idx} className="bg-slate-700 rounded p-2 text-xs text-slate-300">
              <span className="font-mono text-blue-400">{log.topic}</span>
              <span className="ml-2">{JSON.stringify(log.event).slice(0, 100)}...</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
