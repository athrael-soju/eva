import { Tool, ToolResult } from '../types';

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  getDescriptions(): Array<{ name: string; description: string }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  async execute(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        tool: toolName,
        success: false,
        rawData: null,
        formatted: `Error: Tool "${toolName}" not found`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();
    try {
      const rawData = await tool.invoke(input);
      const formatted = tool.formatOutput(rawData);
      return {
        tool: toolName,
        success: true,
        rawData,
        formatted,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tool: toolName,
        success: false,
        rawData: error,
        formatted: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
      };
    }
  }

  async executeMultiple(
    toolInputs: Array<{ name: string; input: Record<string, unknown> }>
  ): Promise<ToolResult[]> {
    const results = await Promise.all(
      toolInputs.map(({ name, input }) => this.execute(name, input))
    );
    return results;
  }
}

export const toolRegistry = new ToolRegistry();
