// Observability & monitoring layer
import { eventBus } from "./event-bus"

export interface Trace {
  trace_id: string
  spans: Span[]
  duration_ms: number
}

export interface Span {
  span_id: string
  name: string
  start_ms: number
  duration_ms: number
  status: "ok" | "error"
  attributes: Record<string, any>
}

export class ObservabilityService {
  private traces = new Map<string, Trace>()

  createTrace(traceId: string): void {
    this.traces.set(traceId, {
      trace_id: traceId,
      spans: [],
      duration_ms: 0,
    })
  }

  addSpan(traceId: string, span: Span): void {
    const trace = this.traces.get(traceId)
    if (trace) {
      trace.spans.push(span)
    }
  }

  completeTrace(traceId: string): void {
    const trace = this.traces.get(traceId)
    if (trace && trace.spans.length > 0) {
      const firstSpan = trace.spans[0]
      const lastSpan = trace.spans[trace.spans.length - 1]
      trace.duration_ms = lastSpan.start_ms + lastSpan.duration_ms - firstSpan.start_ms

      eventBus.publishToTopic("observability", "trace_completed", {
        trace_id: traceId,
        span_count: trace.spans.length,
        duration_ms: trace.duration_ms,
      })
    }
  }

  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId)
  }
}

export const observabilityService = new ObservabilityService()
