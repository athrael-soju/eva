import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

// Schema for MCP tool call arguments
const AddMemoryArgsSchema = z.object({
    name: z.string(),
    episode_body: z.string(),
    source: z.string(),
    group_id: z.string().optional(),
});

const SearchNodesArgsSchema = z.object({
    query: z.string(),
    group_id: z.string().optional(),
});

const GetEpisodesArgsSchema = z.object({
    group_id: z.string().optional(),
    limit: z.number().optional(),
});

export class MCPClient {
    private client: Client;
    private transport: StreamableHTTPClientTransport;
    private isConnected: boolean = false;

    constructor() {
        // Use environment variable or default to localhost (no trailing slash)
        const mcpUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || "http://localhost:8000/mcp";
        this.transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
        this.client = new Client({
            name: "Eva",
            version: "1.0.0",
        }, {
            capabilities: {
                sampling: {},
            },
        });
    }

    async connect() {
        if (this.isConnected) return;

        try {
            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log("Connected to MCP Server");
        } catch (error) {
            console.error("Failed to connect to MCP Server:", error);
            throw error;
        }
    }

    async callTool(name: string, args: any) {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            const result = await this.client.callTool({
                name: name,
                arguments: args,
            });
            return result;
        } catch (error) {
            console.error(`Failed to call tool ${name}:`, error);
            throw error;
        }
    }

    async listTools() {
        if (!this.isConnected) {
            await this.connect();
        }
        return await this.client.listTools();
    }

    async addMemory(content: string, groupId?: string, name?: string, source: string = "text") {
        const args = AddMemoryArgsSchema.parse({
            name: name || `Memory ${new Date().toISOString()}`,
            episode_body: content,
            source: source,
            group_id: groupId,
        });
        return this.callTool("add_memory", args);
    }

    async searchNodes(query: string, groupId?: string) {
        const args = SearchNodesArgsSchema.parse({
            query,
            group_id: groupId,
        });
        return this.callTool("search_nodes", args);
    }

    async searchMemoryFacts(query: string, groupId?: string) {
        const args = SearchNodesArgsSchema.parse({
            query,
            group_id: groupId,
        });
        return this.callTool("search_memory_facts", args);
    }

    async getEpisodes(groupId?: string, limit?: number) {
        const args = GetEpisodesArgsSchema.parse({
            group_id: groupId,
            limit: limit,
        });
        return this.callTool("get_episodes", args);
    }

    async getStatus() {
        return this.callTool("get_status", {});
    }
}
