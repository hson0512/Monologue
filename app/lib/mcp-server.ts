import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function createMCPServer() {
  const server = new Server(
    {
      name: "monologue-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define the monologue tool
  server.setRequestHandler("tools/list", async () => ({
    tools: [
      {
        name: "generate-monologue",
        description:
          "Generate a reflective internal monologue in the style of Pragmatic vs Creative thinker",
        inputSchema: {
          type: "object",
          properties: {
            lines: {
              type: "number",
              description: "Number of lines in the monologue (default: 100)",
              default: 100,
            },
            context: {
              type: "string",
              description: "Current conversation context",
            },
            task: {
              type: "string",
              description: "Description of the task to perform",
            },
          },
          required: ["task"],
        },
      },
    ],
  }));

  // The actual tool implementation
  server.setRequestHandler("tools/call", async (request) => {
    if (request.params.name === "generate-monologue") {
      const ArgsSchema = z.object({
        lines: z.number().int().min(1).max(500).default(100),
        context: z.string().max(2000).optional().default(""),
        task: z.string().min(1).max(1000),
      });

      const { lines, context, task } = ArgsSchema.parse(
        request.params.arguments
      );

      try {
        const systemPrompt = `You are two thinkers having an internal dialogue about programming.
Pragmatic is focused on functionality and efficiency.
Creative is obsessive about innovation and elegance.

STRICT RULES:
1. Generate EXACTLY ${lines} numbered lines
2. Each line must start with [Pragmatic] or [Creative]
3. NO abstractions - be specific about the code
4. NO complete solutions - REFLECT and QUESTION
5. Mention specific files, functions, variables when relevant
6. Think about: edge cases, performance, maintainability, user experience
7. Debate simplicity vs functionality
8. Question every technical decision
9. NO repeated ideas - each line must add new value
10. End without a definitive conclusion - it's reflection, not decision`;

        const userPrompt = `${
          context ? `Previous context:\n${context}\n\n` : ""
        }Current task: ${task}

Generate an internal monologue of EXACTLY ${lines} numbered lines where the two thinkers debate the best way to approach this task.`;

        const response = await anthropic.messages.create({
          model: "claude-opus-4-20250514",
          max_tokens: 32000,
          temperature: 1,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        });

        const monologue = response.content[0].text;

        return {
          content: [
            {
              type: "text",
              text: monologue,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error generating monologue: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  return server;
}