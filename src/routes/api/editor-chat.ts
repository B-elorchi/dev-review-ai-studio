import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type Body = {
  messages?: unknown;
  fileName?: string;
  fileLang?: string;
  fileContent?: string;
};

export const Route = createFileRoute("/api/editor-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, fileName, fileLang, fileContent } = (await request.json()) as Body;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);

        const system = `You are DevReview AI Composer, an expert pair-programmer embedded inside an online IDE.
The user is editing this file:

Path: ${fileName ?? "untitled"}
Language: ${fileLang ?? "plaintext"}

\`\`\`${fileLang ?? ""}
${fileContent ?? ""}
\`\`\`

Guidelines:
- Be concise. Use markdown.
- When suggesting code changes, ALWAYS return the COMPLETE updated file inside a single fenced code block tagged with the language (e.g. \`\`\`${fileLang ?? "typescript"}). The UI will offer an "Apply" button that replaces the file contents with the contents of that code block, so it MUST be the full file, not a diff or snippet.
- If the user only asks a question (no edit needed), don't include a code block.
- Reference symbols using backticks.`;

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
