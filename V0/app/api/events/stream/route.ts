// Event stream endpoint for real-time updates
import { eventBus } from "@/lib/services/event-bus"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const topic = searchParams.get("topic")
  const limit = Number.parseInt(searchParams.get("limit") || "100")

  try {
    const events = eventBus.getLog(topic || undefined, limit)
    return Response.json({ events, count: events.length })
  } catch (error) {
    return Response.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}
