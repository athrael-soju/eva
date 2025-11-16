export type Intent =
  | 'knowledge_retrieval'
  | 'memory_access'
  | 'clarification_needed'
  | 'conversation'
  | 'multi_tool';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  rawData: unknown;
  formatted: string;
  executionTime: number;
}

export interface RoutingDecision {
  intent: Intent;
  tools: string[];
  requiresClarification: boolean;
  confidence: number;
  reasoning: string;
}

export interface ContextFrame {
  userMessage: string;
  conversationHistory: Message[];
  toolResults: ToolResult[];
  memoryContext?: string;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  invoke: (input: Record<string, unknown>) => Promise<unknown>;
  formatOutput: (raw: unknown) => string;
}

export interface AgentResponse {
  content: string;
  toolsUsed: string[];
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface PipelineResult {
  response: AgentResponse;
  routing: RoutingDecision;
  toolResults: ToolResult[];
  processingTime: number;
}
