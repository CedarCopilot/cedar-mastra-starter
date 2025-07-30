// ---------------------------------------------
// Workflows are a Mastra primitive to orchestrate agents and complex sequences of tasks
// Docs: https://mastra.ai/en/docs/workflows/overview
// ---------------------------------------------

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { chatAgent } from '../agents/chatAgent';
import { handleTextStream, streamJSONEvent } from '../../utils/streamUtils';

export const ChatInputSchema = z.object({
  prompt: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
  streamController: z.any().optional(),
});

// 1. fetchContext – passthrough (placeholder)
const fetchContext = createStep({
  id: 'fetchContext',
  description: 'Placeholder step – you might want to fetch some information for your agent here',
  inputSchema: ChatInputSchema,
  outputSchema: ChatInputSchema.extend({
    context: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    // Simply forward input for now
    const result = { ...inputData, context: null };

    return result;
  },
});

// 2. buildAgentContext – build message array
const buildAgentContext = createStep({
  id: 'buildAgentContext',
  description: 'Combine fetched information and build LLM messages',
  inputSchema: fetchContext.outputSchema,
  outputSchema: z.object({
    messages: z.array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
    ),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    streamController: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    const { prompt, temperature, maxTokens, systemPrompt, streamController } = inputData;

    const messages = [
      ...(systemPrompt ? ([{ role: 'system' as const, content: systemPrompt }] as const) : []),
      { role: 'user' as const, content: prompt },
    ];

    const result = { messages, temperature, maxTokens, streamController };

    return result;
  },
});

// 3. callAgent – invoke chatAgent
const callAgent = createStep({
  id: 'callAgent',
  description: 'Invoke the chat agent with options',
  inputSchema: buildAgentContext.outputSchema,
  outputSchema: z.object({
    text: z.string(),
    usage: z.any().optional(),
    streamController: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    const { messages, temperature, maxTokens, streamController } = inputData;

    if (streamController) {
      streamJSONEvent(streamController, {
        type: 'stage_update',
        status: 'update_begin',
        message: 'Generating response...',
      });

      const response = await chatAgent.stream(messages, {
        temperature,
        maxTokens,
      });

      const text = await handleTextStream(response, streamController);

      streamJSONEvent(streamController, {
        type: 'stage_update',
        status: 'update_complete',
        message: 'Response generated',
      });

      return { text, usage: response.usage, streamController };
    } else {
      const response = await chatAgent.generate(messages, {
        temperature,
        maxTokens,
      });

      return { text: response.text, usage: response.usage, streamController };
    }
  },
});

// 4. streamResponse – finalize streaming response
const streamResponse = createStep({
  id: 'streamResponse',
  description: 'Finalize the streaming response',
  inputSchema: callAgent.outputSchema,
  outputSchema: z.object({
    text: z.string(),
    usage: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    const { text, usage } = inputData;

    return { text, usage };
  },
});

export const chatWorkflow = createWorkflow({
  id: 'chatWorkflow',
  description:
    'Chat workflow that replicates the old /chat/execute-function endpoint behaviour with optional streaming',
  inputSchema: ChatInputSchema,
  outputSchema: z.object({
    text: z.string(),
    usage: z.any().optional(),
  }),
})
  .then(fetchContext)
  .then(buildAgentContext)
  .then(callAgent)
  .then(streamResponse)
  .commit();
