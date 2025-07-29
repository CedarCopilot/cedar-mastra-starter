'use client';

import { CedarCopilot } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';
import React, { ReactNode } from 'react';

interface CedarCopilotWrapperProps {
  children: ReactNode;
}

export default function CedarCopilotWrapper({ children }: CedarCopilotWrapperProps) {
  const llmProvider: ProviderConfig = {
    provider: 'mastra' as const,
    apiKey: 'not-needed-for-local',
    baseURL: process.env.NEXT_PUBLIC_MASTRA_URL || 'http://localhost:4111',
  };

  return <CedarCopilot llmProvider={llmProvider}>{children}</CedarCopilot>;
}
