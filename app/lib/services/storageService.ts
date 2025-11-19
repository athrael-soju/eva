import { MCPClient } from '../mcp/client';
import { config } from '../config';
import type { StorageRequest } from '../schemas/memory';

const mcpClient = new MCPClient();
const GROUP_ID = config.mcpGroupId;

export async function executeStorageAction(request: StorageRequest) {
  const options = request.options || {};

  switch (request.action) {
    case 'query_memory':
      return mcpClient.searchNodes(
        request.payload,
        [GROUP_ID],
        options.maxResults || 10,
        options.entityTypes
      );

    case 'save_memory':
      return mcpClient.addMemory(
        request.payload,
        GROUP_ID,
        undefined,
        'text',
        'User conversation with Eva'
      );

    case 'search_facts':
      return mcpClient.searchMemoryFacts(
        request.payload,
        [GROUP_ID],
        options.maxResults || 15,
        options.centerNodeUuid
      );

    case 'get_episodes':
      return mcpClient.getEpisodes(
        [GROUP_ID],
        options.maxResults || 10
      );

    default: {
      // Exhaustiveness guard
      const _exhaustive: never = request.action;
      return _exhaustive;
    }
  }
}
