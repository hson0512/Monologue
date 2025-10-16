import type { LoaderFunctionArgs } from "@remix-run/node";
import { createMCPServer } from "../lib/mcp-server.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// SSE (Server Sent Events) keeps an open connection between Claude and your server
// This allows Claude to call your tools in real time without polling

// Simple auth check
function verifyAuth(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  const expectedKey = process.env.MCP_API_KEY || "your-secret-key";
  return authHeader === `Bearer ${expectedKey}`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (!verifyAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  });

  const server = createMCPServer();

  const transport = new SSEServerTransport("/api/mcp", {
    headers: Object.fromEntries(request.headers.entries()),
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await server.connect(transport);

        // Keep connection alive (SSE connections timeout after 30 seconds of silence)
        const keepAlive = setInterval(() => {
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        }, 30000);

        request.signal.addEventListener("abort", () => {
          clearInterval(keepAlive);
          controller.close();
        });
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: responseHeaders,
  });
}