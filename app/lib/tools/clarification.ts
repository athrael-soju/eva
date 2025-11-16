import { Tool, Message } from '../types';

interface ClarificationInput {
  userMessage: string;
  conversationHistory: Message[];
}

interface ClarificationOutput {
  needsClarification: boolean;
  ambiguityType?: 'vague' | 'incomplete' | 'multiple_interpretations' | 'missing_context';
  suggestedQuestions: string[];
  confidence: number;
}

export const clarificationTool: Tool = {
  name: 'clarification_check',
  description:
    'Analyze the user message to determine if clarification is needed before proceeding. Use this when the user request is ambiguous, incomplete, or could have multiple interpretations.',
  parameters: {
    type: 'object',
    properties: {
      userMessage: {
        type: 'string',
        description: 'The user message to analyze',
      },
      conversationHistory: {
        type: 'array',
        description: 'Recent conversation history for context',
      },
    },
    required: ['userMessage', 'conversationHistory'],
  },

  invoke: async (
    input: Record<string, unknown>
  ): Promise<ClarificationOutput> => {
    const { userMessage } = input as unknown as ClarificationInput;

    // Analyze the message for ambiguity patterns
    const lowerMessage = userMessage.toLowerCase();

    // Check for vague references
    const vaguePatterns = [
      /\b(it|this|that|these|those)\b(?!\s+is\s+(a|an|the))/,
      /\bthe thing\b/,
      /\bstuff\b/,
      /\bwhatever\b/,
    ];

    // Check for incomplete requests
    const incompletePatterns = [
      /^(how|what|why|when|where)\s*\?*$/i,
      /\bhelp\s*(me)?\s*$/i,
      /\bfix\s*(it)?\s*$/i,
      /\bchange\s*(it)?\s*$/i,
    ];

    // Check for ambiguous terms
    const ambiguousTerms = ['better', 'improve', 'optimize', 'fix', 'update', 'change'];
    const hasAmbiguousTerm = ambiguousTerms.some((term) =>
      lowerMessage.includes(term)
    );

    // Check message length and specificity
    const isVeryShort = userMessage.split(/\s+/).length < 4;
    const hasVaguePattern = vaguePatterns.some((p) => p.test(lowerMessage));
    const hasIncompletePattern = incompletePatterns.some((p) => p.test(lowerMessage));

    let needsClarification = false;
    let ambiguityType: ClarificationOutput['ambiguityType'];
    const suggestedQuestions: string[] = [];
    let confidence = 0.9;

    if (hasIncompletePattern || (isVeryShort && !lowerMessage.includes('?'))) {
      needsClarification = true;
      ambiguityType = 'incomplete';
      suggestedQuestions.push('Could you provide more details about what you need help with?');
      suggestedQuestions.push('What specific aspect would you like me to focus on?');
      confidence = 0.85;
    } else if (hasVaguePattern) {
      needsClarification = true;
      ambiguityType = 'vague';
      suggestedQuestions.push('Could you clarify what you are referring to?');
      suggestedQuestions.push('Can you be more specific about which component or feature?');
      confidence = 0.8;
    } else if (hasAmbiguousTerm && isVeryShort) {
      needsClarification = true;
      ambiguityType = 'multiple_interpretations';

      if (lowerMessage.includes('improve') || lowerMessage.includes('optimize')) {
        suggestedQuestions.push('Are you looking to improve performance, readability, or functionality?');
      }
      if (lowerMessage.includes('fix')) {
        suggestedQuestions.push('What specific issue or error are you experiencing?');
      }
      if (lowerMessage.includes('update') || lowerMessage.includes('change')) {
        suggestedQuestions.push('What changes would you like to make?');
      }
      confidence = 0.75;
    }

    // If we still have no suggestions but need clarification
    if (needsClarification && suggestedQuestions.length === 0) {
      suggestedQuestions.push('Could you provide more context about your request?');
    }

    return {
      needsClarification,
      ambiguityType,
      suggestedQuestions,
      confidence,
    };
  },

  formatOutput: (raw: unknown): string => {
    const data = raw as ClarificationOutput;

    if (!data.needsClarification) {
      return 'The request is clear and can be processed.';
    }

    const questions = data.suggestedQuestions
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n');

    return (
      `**Clarification Needed** (${data.ambiguityType})\n\n` +
      `Suggested questions to ask:\n${questions}`
    );
  },
};
