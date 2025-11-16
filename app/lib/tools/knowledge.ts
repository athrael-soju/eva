import { Tool } from '../types';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: string;
}

// Mock knowledge base
const mockKnowledgeBase: KnowledgeDocument[] = [
  {
    id: 'doc_001',
    title: 'Deployment Guide',
    content: `# Deployment Guide

## Overview
Our deployment process uses blue-green deployment strategy for zero-downtime releases.

## Steps
1. Build the application
2. Run tests in CI
3. Deploy to staging environment
4. Run integration tests
5. Deploy to production (blue-green swap)

## Rollback Procedure
- Rollback window: 30 minutes
- Command: \`kubectl rollout undo deployment/app\`
- Automatic rollback on health check failures`,
    category: 'infrastructure',
    tags: ['deployment', 'kubernetes', 'devops'],
    lastUpdated: '2025-11-10',
  },
  {
    id: 'doc_002',
    title: 'API Authentication',
    content: `# API Authentication

## Token Types
- Access Token: JWT, 15-minute expiry
- Refresh Token: Opaque, 7-day expiry

## Flow
1. User logs in with credentials
2. Server validates and issues tokens
3. Access token used for API calls
4. Refresh token used to get new access token

## Security Measures
- Tokens stored in httpOnly cookies
- CSRF protection enabled
- Rate limiting on auth endpoints`,
    category: 'security',
    tags: ['authentication', 'jwt', 'security', 'api'],
    lastUpdated: '2025-11-12',
  },
  {
    id: 'doc_003',
    title: 'Database Schema',
    content: `# Database Schema

## Users Table
- id: UUID
- email: VARCHAR(255)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

## Sessions Table
- id: UUID
- user_id: UUID (FK)
- token: VARCHAR(512)
- expires_at: TIMESTAMP

## Migrations
Run migrations with: \`npm run db:migrate\`
Rollback with: \`npm run db:rollback\``,
    category: 'database',
    tags: ['database', 'schema', 'postgresql', 'migrations'],
    lastUpdated: '2025-11-08',
  },
  {
    id: 'doc_004',
    title: 'Error Handling Best Practices',
    content: `# Error Handling

## Client Errors (4xx)
- 400: Bad Request - Invalid input
- 401: Unauthorized - Missing/invalid auth
- 403: Forbidden - Insufficient permissions
- 404: Not Found - Resource doesn't exist

## Server Errors (5xx)
- 500: Internal Server Error
- 503: Service Unavailable

## Error Response Format
\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
\`\`\``,
    category: 'api',
    tags: ['errors', 'api', 'best-practices'],
    lastUpdated: '2025-11-14',
  },
  {
    id: 'doc_005',
    title: 'Testing Strategy',
    content: `# Testing Strategy

## Unit Tests
- Framework: Jest
- Coverage target: 80%
- Run: \`npm test\`

## Integration Tests
- Framework: Jest + Supertest
- Database: Test container
- Run: \`npm run test:integration\`

## E2E Tests
- Framework: Playwright
- Run: \`npm run test:e2e\`

## CI Pipeline
All tests run on PR creation and merge to main.`,
    category: 'testing',
    tags: ['testing', 'jest', 'playwright', 'ci'],
    lastUpdated: '2025-11-11',
  },
];

interface KnowledgeSearchInput {
  query: string;
  category?: string;
  limit?: number;
}

interface KnowledgeSearchOutput {
  found: boolean;
  count: number;
  documents: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    relevance: number;
    lastUpdated: string;
  }>;
}

export const knowledgeBaseTool: Tool = {
  name: 'knowledge_base',
  description:
    'Search the internal knowledge base for documentation, guides, and technical information. Use this to find official documentation about processes, APIs, architecture, and best practices.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant documentation',
      },
      category: {
        type: 'string',
        description:
          'Optional category filter (e.g., "infrastructure", "security", "api", "database", "testing")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of documents to return (default: 3)',
      },
    },
    required: ['query'],
  },

  invoke: async (
    input: Record<string, unknown>
  ): Promise<KnowledgeSearchOutput> => {
    const { query, category, limit = 3 } = input as unknown as KnowledgeSearchInput;

    let filtered = mockKnowledgeBase;

    // Filter by category if specified
    if (category) {
      filtered = filtered.filter(
        (doc) => doc.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Score documents by relevance
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored = filtered.map((doc) => {
      const searchText =
        `${doc.title} ${doc.content} ${doc.tags.join(' ')}`.toLowerCase();

      let relevance = 0;
      for (const word of queryWords) {
        if (searchText.includes(word)) {
          relevance += 1;
        }
        // Boost for title matches
        if (doc.title.toLowerCase().includes(word)) {
          relevance += 0.5;
        }
        // Boost for tag matches
        if (doc.tags.some((t) => t.toLowerCase().includes(word))) {
          relevance += 0.3;
        }
      }
      relevance = relevance / queryWords.length;

      return { doc, relevance };
    });

    const results = scored
      .filter((r) => r.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return {
      found: results.length > 0,
      count: results.length,
      documents: results.map((r) => ({
        id: r.doc.id,
        title: r.doc.title,
        content: r.doc.content,
        category: r.doc.category,
        relevance: Math.round(r.relevance * 100) / 100,
        lastUpdated: r.doc.lastUpdated,
      })),
    };
  },

  formatOutput: (raw: unknown): string => {
    const data = raw as KnowledgeSearchOutput;

    if (!data.found) {
      return 'No relevant documentation found in the knowledge base.';
    }

    const formatted = data.documents
      .map(
        (doc) =>
          `**${doc.title}** (${doc.category})\n` +
          `Last updated: ${doc.lastUpdated}\n\n` +
          `${doc.content}`
      )
      .join('\n\n---\n\n');

    return `Found ${data.count} relevant document(s):\n\n${formatted}`;
  },
};
