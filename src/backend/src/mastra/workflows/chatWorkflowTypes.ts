import { z } from 'zod';

// Define schemas for product roadmap actions
const FeatureNodeDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.enum(['done', 'planned', 'backlog', 'in progress']).default('planned'),
  nodeType: z.literal('feature').default('feature'),
  upvotes: z.number().default(0),
  comments: z
    .array(
      z.object({
        id: z.string(),
        author: z.string(),
        text: z.string(),
      }),
    )
    .default([]),
});

const NodeSchema = z.object({
  id: z.string().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  data: FeatureNodeDataSchema,
});

// Action schemas
const AddNodeActionSchema = z.object({
  type: z.literal('action'),
  stateKey: z.literal('nodes'),
  setterKey: z.literal('addNode'),
  args: z.array(NodeSchema),
  content: z.string(),
});

const RemoveNodeActionSchema = z.object({
  type: z.literal('action'),
  stateKey: z.literal('nodes'),
  setterKey: z.literal('removeNode'),
  args: z.array(z.string()), // Just the node ID
  content: z.string(),
});

const ChangeNodeActionSchema = z.object({
  type: z.literal('action'),
  stateKey: z.literal('nodes'),
  setterKey: z.literal('changeNode'),
  args: z.array(NodeSchema),
  content: z.string(),
});

const MessageResponseSchema = z.object({
  type: z.literal('message'),
  content: z.string(),
  role: z.literal('assistant').default('assistant'),
});

// Union of all possible responses
export const ExecuteFunctionResponseSchema = z.union([
  AddNodeActionSchema,
  RemoveNodeActionSchema,
  ChangeNodeActionSchema,
  MessageResponseSchema,
]);
