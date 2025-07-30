import { registerApiRoute } from '@mastra/core/server';
import { ChatInputSchema, chatWorkflow } from './workflows/chatWorkflow';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createSSEStream } from '../utils/streamUtils';

// Helper function to convert Zod schema to OpenAPI schema
function toOpenApiSchema(schema: Parameters<typeof zodToJsonSchema>[0]) {
  return zodToJsonSchema(schema) as Record<string, unknown>;
}

// Register API routes to reach your Mastra server
export const apiRoutes = [
  registerApiRoute('/chat/execute-function', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(ChatInputSchema),
          },
        },
      },
    },
    handler: async (c) => {
      try {
        const body = await c.req.json();
        const { prompt, temperature, maxTokens, systemPrompt } = ChatInputSchema.parse(body);

        const run = await chatWorkflow.createRunAsync();
        const result = await run.start({
          inputData: { prompt, temperature, maxTokens, systemPrompt },
        });

        if (result.status === 'success') {
          return c.json({ text: result.result.text, usage: result.result.usage });
        }

        return c.json(
          {
            status: result.status,
            steps: result.steps,
          },
          500,
        );
      } catch (error) {
        console.error(error);
        return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
      }
    },
  }),
  registerApiRoute('/chat/execute-function/stream', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(ChatInputSchema),
          },
        },
      },
    },
    handler: async (c) => {
      try {
        const body = await c.req.json();
        const { prompt, temperature, maxTokens, systemPrompt } = ChatInputSchema.parse(body);

        return createSSEStream(async (controller) => {
          const run = await chatWorkflow.createRunAsync();
          const result = await run.start({
            inputData: {
              prompt,
              temperature,
              maxTokens,
              systemPrompt,
              streamController: controller,
            },
          });

          if (result.status !== 'success') {
            throw new Error(`Workflow failed: ${result.status}`);
          }
        });
      } catch (error) {
        console.error(error);
        return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
      }
    },
  }),
];
