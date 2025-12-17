// In-memory storage layer (Redis simulation for development)
// In production, replace with actual Redis client

export class MemoryStore {
  private store = new Map<string, { value: any; ttl?: number; created: number }>()
  private timers = new Map<string, NodeJS.Timeout>()

  set(key: string, value: any, ttlSeconds?: number) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
    }

    this.store.set(key, { value, ttl: ttlSeconds, created: Date.now() })

    if (ttlSeconds) {
      const timer = setTimeout(() => this.store.delete(key), ttlSeconds * 1000)
      this.timers.set(key, timer)
    }
  }

  get(key: string): any {
    const entry = this.store.get(key)
    if (!entry) return null

    if (entry.ttl) {
      const age = (Date.now() - entry.created) / 1000
      if (age > entry.ttl) {
        this.store.delete(key)
        return null
      }
    }

    return entry.value
  }

  delete(key: string) {
    this.store.delete(key)
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
      this.timers.delete(key)
    }
  }

  exists(key: string): boolean {
    return this.get(key) !== null
  }

  increment(key: string, amount = 1): number {
    const current = (this.get(key) ?? 0) as number
    const newValue = current + amount
    this.set(key, newValue)
    return newValue
  }

  list(pattern: string): string[] {
    const regex = new RegExp(pattern.replace("*", ".*"))
    return Array.from(this.store.keys()).filter((k) => regex.test(k))
  }

  flush() {
    this.store.clear()
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
  }
}

export const memoryStore = new MemoryStore()
