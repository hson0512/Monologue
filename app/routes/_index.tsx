import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Monologue MCP Server" },
    { name: "description", content: "MCP Server for generating internal monologues" },
  ];
};

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Monologue MCP Server</h1>
      <p>
        This is a Model Context Protocol (MCP) server that provides tools for generating
        internal monologues between Pragmatic and Creative thinking styles.
      </p>
      <p>
        The API endpoint is available at <code>/api/mcp</code> for MCP clients to connect to.
      </p>
    </div>
  );
}
