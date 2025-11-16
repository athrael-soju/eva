import { Message } from '../types';

interface MemoryEntry {
  id: string;
  timestamp: number;
  userMessage: string;
  assistantResponse: string;
  topics: string[];
  summary: string;
}

interface SearchResult {
  entry: MemoryEntry;
  relevance: number;
}

// Mock data for demonstration
const mockMemoryStore: MemoryEntry[] = [
  {
    id: 'mem_001',
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
    userMessage: 'What deployment strategy should we use?',
    assistantResponse:
      'I recommend a blue-green deployment strategy with 30-minute rollback windows. This allows zero-downtime deployments and quick rollbacks if issues arise.',
    topics: ['deployment', 'infrastructure', 'devops'],
    summary: 'Discussed blue-green deployment with rollback windows',
  },
  {
    id: 'mem_002',
    timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    userMessage: 'How should we handle database migrations?',
    assistantResponse:
      'For database migrations with blue-green deployments, use backwards-compatible migrations. Apply schema changes first, then deploy code that uses new schema.',
    topics: ['database', 'migrations', 'deployment'],
    summary: 'Database migration strategy for blue-green deployments',
  },
  {
    id: 'mem_003',
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    userMessage: 'What monitoring tools do you recommend?',
    assistantResponse:
      'For your stack, I recommend: Prometheus for metrics, Grafana for visualization, and PagerDuty for alerting. Add OpenTelemetry for distributed tracing.',
    topics: ['monitoring', 'observability', 'tools'],
    summary: 'Monitoring stack recommendations',
  },
  {
    id: 'mem_004',
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    userMessage: 'Can you explain the authentication flow?',
    assistantResponse:
      'The current auth flow uses JWT tokens with refresh token rotation. Access tokens expire in 15 minutes, refresh tokens in 7 days. Tokens are stored in httpOnly cookies.',
    topics: ['authentication', 'security', 'jwt'],
    summary: 'JWT authentication flow explanation',
  },
];

class MemoryManager {
  private sessionHistory: Message[] = [];
  private longTermMemory: MemoryEntry[] = [...mockMemoryStore];

  addToSession(message: Message): void {
    this.sessionHistory.push(message);
  }

  getSessionHistory(limit?: number): Message[] {
    if (limit) {
      return this.sessionHistory.slice(-limit);
    }
    return [...this.sessionHistory];
  }

  clearSession(): void {
    this.sessionHistory = [];
  }

  storeInteraction(
    userMessage: string,
    assistantResponse: string,
    topics: string[] = []
  ): void {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}`,
      timestamp: Date.now(),
      userMessage,
      assistantResponse,
      topics,
      summary: this.generateSummary(userMessage, assistantResponse),
    };
    this.longTermMemory.push(entry);
  }

  private generateSummary(
    userMessage: string,
    assistantResponse: string
  ): string {
    // Simple summary generation - in production, use an LLM
    const combined = `${userMessage} ${assistantResponse}`;
    const words = combined.split(' ').slice(0, 10).join(' ');
    return `${words}...`;
  }

  searchMemory(
    query: string,
    options: { limit?: number; timeframeDays?: number } = {}
  ): SearchResult[] {
    const { limit = 5, timeframeDays } = options;

    let filtered = this.longTermMemory;

    // Filter by timeframe if specified
    if (timeframeDays) {
      const cutoff = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((entry) => entry.timestamp >= cutoff);
    }

    // Simple relevance scoring based on keyword matching
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored: SearchResult[] = filtered.map((entry) => {
      const text =
        `${entry.userMessage} ${entry.assistantResponse} ${entry.topics.join(' ')} ${entry.summary}`.toLowerCase();

      let relevance = 0;
      for (const word of queryWords) {
        if (text.includes(word)) {
          relevance += 1;
        }
        // Boost for topic matches
        if (entry.topics.some((t) => t.toLowerCase().includes(word))) {
          relevance += 0.5;
        }
      }
      relevance = relevance / queryWords.length;

      return { entry, relevance };
    });

    // Sort by relevance and return top results
    return scored
      .filter((r) => r.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  getRecentMemories(count: number = 5): MemoryEntry[] {
    return this.longTermMemory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  formatMemoryResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant memories found.';
    }

    return results
      .map((r) => {
        const date = new Date(r.entry.timestamp).toLocaleDateString();
        return `[${date}] ${r.entry.summary}\nUser: ${r.entry.userMessage}\nAssistant: ${r.entry.assistantResponse}`;
      })
      .join('\n\n---\n\n');
  }
}

export const memoryManager = new MemoryManager();
