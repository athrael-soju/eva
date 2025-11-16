#!/usr/bin/env npx tsx

import { orchestrator } from '../app/lib/agents';

async function testMultiAgentSystem() {
  console.log('=== Multi-Agent System Test ===\n');

  // Initialize
  orchestrator.initialize();
  console.log('Available tools:', orchestrator.getAvailableTools().map((t) => t.name));
  console.log('\n---\n');

  // Test cases
  const testCases = [
    {
      name: 'Memory Access',
      message: 'What did we discuss about the deployment strategy last week?',
    },
    {
      name: 'Knowledge Retrieval',
      message: 'How does the authentication flow work?',
    },
    {
      name: 'Multi-Tool Query',
      message: 'What deployment approach did we discuss and what does the documentation say about it?',
    },
    {
      name: 'Clarification Needed',
      message: 'fix it',
    },
    {
      name: 'General Conversation',
      message: 'Hello, how are you doing today?',
    },
  ];

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`User: "${testCase.message}"`);

    const result = await orchestrator.processMessage(testCase.message);

    console.log(`\nRouting:`);
    console.log(`  Intent: ${result.routing.intent}`);
    console.log(`  Tools: ${result.routing.tools.join(', ') || 'none'}`);
    console.log(`  Confidence: ${result.routing.confidence}`);
    console.log(`  Reasoning: ${result.routing.reasoning}`);

    if (result.toolResults.length > 0) {
      console.log(`\nTool Results:`);
      for (const tr of result.toolResults) {
        console.log(`  ${tr.tool}: ${tr.success ? 'Success' : 'Failed'} (${tr.executionTime}ms)`);
      }
    }

    console.log(`\nResponse:`);
    console.log(result.response.content.slice(0, 500));
    if (result.response.content.length > 500) {
      console.log('...[truncated]');
    }

    console.log(`\nProcessing time: ${result.processingTime}ms`);
    console.log('\n' + '='.repeat(60) + '\n');
  }

  // Show session history
  console.log('Session History:');
  const history = orchestrator.getSessionHistory();
  console.log(`Total messages: ${history.length}`);
}

testMultiAgentSystem().catch(console.error);
