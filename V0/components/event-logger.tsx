"use client"

import { useEffect, useState } from "react"
import { eventBus } from "@/lib/services/event-bus"

export function EventLogger() {
  const [events, setEvents] = useState<any[]>([])
  const [filter, setFilter] = useState("")

  useEffect(() => {
    const updateEvents = () => {
      const allEvents = eventBus.getLog(undefined, 500)
      setEvents(allEvents)
    }

    updateEvents()
    const interval = setInterval(updateEvents, 1000)
    return () => clearInterval(interval)
  }, [])

  const filteredEvents = filter
    ? events.filter((e) => e.topic.includes(filter) || JSON.stringify(e.event).includes(filter))
    : events

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filter events..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={() => setEvents([])}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
        >
          Clear
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 max-h-96 overflow-y-auto font-mono text-xs">
        {filteredEvents.length === 0 ? (
          <p className="text-slate-400">No events to display</p>
        ) : (
          <div className="space-y-1">
            {filteredEvents.reverse().map((log, idx) => (
              <div key={idx} className="text-slate-300 hover:bg-slate-700 p-1 rounded">
                <span className="text-blue-400">[{new Date(log.event.ts).toLocaleTimeString()}]</span>
                <span className="text-green-400 ml-2">{log.topic}</span>
                <span className="text-yellow-400 ml-2">{JSON.stringify(log.event).slice(0, 150)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
