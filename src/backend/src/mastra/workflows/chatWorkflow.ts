// ---------------------------------------------
// Workflows are a Mastra primitive to orchestrate agents and complex sequences of tasks
// Docs: https://mastra.ai/en/docs/workflows/overview
// ---------------------------------------------

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { chatAgent } from '../agents/chatAgent';

export const ChatInputSchema = z.object({
  prompt: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
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
    return { ...inputData, context: null };
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
  }),
  execute: async ({ inputData }) => {
    const { prompt, temperature, maxTokens, systemPrompt } = inputData;

    const messages = [
      ...(systemPrompt ? ([{ role: 'system' as const, content: systemPrompt }] as const) : []),
      { role: 'user' as const, content: prompt },
    ];

    return { messages, temperature, maxTokens };
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
  }),
  execute: async ({ inputData }) => {
    const { messages, temperature, maxTokens } = inputData;

    const response = await chatAgent.generate(messages, {
      temperature,
      maxTokens,
    });

    return { text: response.text, usage: response.usage };
  },
});

// 4. streamResponse – stub (implementation TBD)
const streamResponse = createStep({
  id: 'streamResponse',
  description: 'Stream the response (to be implemented)',
  inputSchema: callAgent.outputSchema,
  outputSchema: z.object({
    text: z.string(),
    usage: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    // TODO: Implement streaming to caller
    return { text: inputData.text, usage: inputData.usage };
  },
});

export const chatWorkflow = createWorkflow({
  id: 'chatWorkflow',
  description: 'Chat workflow that replicates the old /chat/execute-function endpoint behaviour',
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
