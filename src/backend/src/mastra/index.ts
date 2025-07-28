import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { chatAgent } from './agents/chatAgent';
import { chatWorkflow } from './workflows/chatWorkflow';
import { apiRoutes } from './apiRegistry';

// Create Mastra instance
export const mastra = new Mastra({
	// Agents: Mastra primitive to interact with LLMs
	// Docs: https://mastra.ai/en/docs/agents/overview
	agents: { chatAgent },

	workflows: { chatWorkflow },
	storage: new LibSQLStore({
		url: ":memory:"
	}),
	telemetry: {
		enabled: true,
	},
	server: {
		apiRoutes,
	},
});
