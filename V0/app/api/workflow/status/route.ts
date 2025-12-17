// Workflow status endpoint
import { workflowEngine } from "@/lib/services/workflow-engine"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workflowId = searchParams.get("workflow_id")

  if (workflowId) {
    const workflow = workflowEngine.getWorkflow(workflowId)
    if (!workflow) {
      return Response.json({ error: "Workflow not found" }, { status: 404 })
    }
    return Response.json(workflow)
  }

  const allWorkflows = workflowEngine.getAllWorkflows()
  return Response.json({ workflows: allWorkflows, count: allWorkflows.length })
}
