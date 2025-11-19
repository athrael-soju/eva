import {
  StorageErrorResponseSchema,
  StorageRequest,
  StorageResponseSchema,
} from '../schemas/memory';

type StorageOptions = StorageRequest['options'];
type StorageAction = StorageRequest['action'];

async function callStorageApi(requestBody: StorageRequest) {
  const response = await fetch('/api/storage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    const parsedError = StorageErrorResponseSchema.safeParse(data);
    if (parsedError.success) {
      throw new Error(parsedError.data.error);
    }
    throw new Error(`Storage API error: ${response.statusText}`);
  }

  const parsedSuccess = StorageResponseSchema.safeParse(data);
  if (!parsedSuccess.success) {
    throw new Error('Invalid storage API response shape');
  }

  return parsedSuccess.data.result;
}

export const memoryClient = {
  queryMemory: (query: string, options?: StorageOptions) =>
    callStorageApi({ action: 'query_memory', payload: query, options }),

  saveMemory: (content: string, options?: StorageOptions) =>
    callStorageApi({ action: 'save_memory', payload: content, options }),

  searchFacts: (query: string, options?: StorageOptions) =>
    callStorageApi({ action: 'search_facts', payload: query, options }),

  getEpisodes: (options?: StorageOptions) =>
    callStorageApi({ action: 'get_episodes', payload: 'episodes', options }),
};
