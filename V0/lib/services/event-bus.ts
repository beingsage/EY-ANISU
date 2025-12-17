// Event bus for pub/sub and event streaming (in-memory implementation)

type EventHandler = (event: any) => Promise<void> | void

export class EventBus {
  private subscribers = new Map<string, Set<EventHandler>>()
  private eventLog: any[] = []
  private maxLogSize = 10000

  subscribe(topic: string, handler: EventHandler) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set())
    }
    this.subscribers.get(topic)!.add(handler)

    return () => {
      this.subscribers.get(topic)?.delete(handler)
    }
  }

  async publish(topic: string, event: any) {
    event.ts = Date.now()
    this.eventLog.push({ topic, event })

    // Keep log bounded
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift()
    }

    const handlers = this.subscribers.get(topic)
    if (handlers) {
      for (const handler of handlers) {
        try {
          await Promise.resolve(handler(event))
        } catch (error) {
          console.error(`[EventBus] Handler error for topic ${topic}:`, error)
        }
      }
    }
  }

  getLog(topic?: string, limit = 100): any[] {
    let log = this.eventLog
    if (topic) {
      log = log.filter((e) => e.topic === topic)
    }
    return log.slice(-limit)
  }

  async publishToTopic(domain: string, eventType: string, data: any) {
    const topic = `${domain}.${eventType}`
    await this.publish(topic, data)
  }
}

export const eventBus = new EventBus()
