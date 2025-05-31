# OpenRouter Integration

## Purpose
This node documents the integration of OpenRouter API gateway with the Mastra and Convenings frameworks to enable multi-model dialogue capabilities.

## Classification
- **Domain:** External Integration, LLM Services
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Content

### Overview

The OpenRouter integration provides a standardized way to access multiple LLM providers through a single API interface. This enables Convenings to create diverse multi-agent dialogues using different models from different providers, with automatic fallback capabilities.

Key capabilities include:
- Unified API access to multiple LLM providers (OpenAI, Anthropic, etc.)
- Automatic fallback mechanisms for reliability
- Support for bidding and motivated participant behaviors
- Specialized dialogue workflows (consensus-seeking, etc.)

### Architecture

The integration consists of several key components:

1. **OpenRouterClient**: Core client for API communication
   - Handles authentication and request formatting
   - Provides fallback mechanisms
   - Exposes chat and text completion methods

2. **OpenRouterAgent**: Mastra agent implementation using OpenRouter
   - Implements the IAgent interface
   - Handles prompt formatting and response processing

3. **OpenRouterAgentProvider**: Provider for creating OpenRouter agents
   - Factory for agent creation
   - Configurable defaults

4. **Dialogue Workflows**: Specialized workflows using OpenRouter
   - Regular dialogue workflows
   - Consensus-seeking workflows
   - Support for bidding and turn management

5. **Motivated Participants**: Enhanced dialogue participants
   - Support for motivation-driven behaviors
   - Adaptive bidding strategies
   - Emotional state tracking

### Usage Examples

#### Basic Usage

```typescript
import { createSimpleDialogue } from "../../src/convenings/mod.ts";

// Create and run a simple dialogue
const result = await createSimpleDialogue(
  "Climate change mitigation strategies",
  "your-openrouter-api-key",
  "openai/gpt-4o"
);

// Display results
console.log("Dialogue completed with reason:", result.endReason);
console.log("Messages:");
for (const message of result.messages) {
  console.log(`${message.participantId}: ${message.content}`);
}
```

#### Consensus Dialogue

```typescript
import { createConsensusDialogue } from "../../src/convenings/mod.ts";

// Create and run a consensus-seeking dialogue
const result = await createConsensusDialogue(
  "Universal basic income implementation",
  "your-openrouter-api-key",
  "anthropic/claude-3-opus"
);

// Display consensus results
console.log("Consensus reached:", result.consensusReached);
console.log("Consensus level:", result.consensusLevel);
console.log("Consensus points:");
for (const point of result.consensusPoints) {
  console.log(`- ${point.description} (confidence: ${point.confidence})`);
}
```

#### Custom Dialogue

```typescript
import {
  OpenRouterClient,
  createOpenRouterAgent,
  createMotivatedDialogueParticipant,
  DialogueWorkflow
} from "../../src/convenings/mod.ts";

// Create OpenRouter client
const client = new OpenRouterClient({
  apiKey: "your-openrouter-api-key",
  defaultModel: "openai/gpt-4o",
  fallbackModels: ["anthropic/claude-3-opus", "anthropic/claude-3-sonnet"],
});

// Create custom participants
const participants = [
  createMotivatedDialogueParticipant({
    name: "Philosopher",
    role: "thinker",
    primaryMotivation: "truth-seeking",
    agentConfig: {
      id: "philosopher",
      systemPrompt: "You are a philosopher exploring deep ideas...",
    }
  }, createOpenRouterAgent({
    id: "philosopher",
    systemPrompt: "You are a philosopher exploring deep ideas...",
  }, client)),
  
  createMotivatedDialogueParticipant({
    name: "Pragmatist",
    role: "implementer",
    primaryMotivation: "problem-solving",
    agentConfig: {
      id: "pragmatist",
      systemPrompt: "You are a practical thinker focused on solutions...",
    }
  }, createOpenRouterAgent({
    id: "pragmatist",
    systemPrompt: "You are a practical thinker focused on solutions...",
  }, client)),
];

// Create and run dialogue
const dialogue = new DialogueWorkflow(
  "The future of work in an AI-driven economy",
  participants,
  { maxTurns: 12 }
);

const result = await dialogue.run();
```

### Configuration Options

#### OpenRouter Client Configuration

| Option | Description | Default |
|--------|-------------|---------|
| apiKey | OpenRouter API key (required) | - |
| defaultModel | Default model to use (required) | - |
| baseUrl | API endpoint URL | "https://openrouter.ai/api/v1" |
| timeout | Request timeout in ms | 60000 |
| temperature | Default temperature | 0.7 |
| maxTokens | Default max tokens | 1000 |
| fallbackModels | Models to try if primary fails | [] |

#### Dialogue Workflow Configuration

| Option | Description | Default |
|--------|-------------|---------|
| maxTurns | Maximum dialogue turns | 10 |
| maxDuration | Maximum duration (ms) | 300000 |
| systemPromptTemplate | Template for system prompt | (see code) |
| includeSystemPrompt | Include system prompt each turn | true |
| exitCondition | Custom exit condition | - |

#### Consensus Workflow Configuration

| Option | Description | Default |
|--------|-------------|---------|
| consensusThreshold | Threshold for consensus | 0.8 |
| requiredStableTurns | Turns of stable consensus needed | 3 |
| consensusPromptTemplate | Template for consensus prompt | (see code) |
| explicitConsensusGuide | Explicitly guide toward consensus | true |

### Implementation Details

The implementation follows a layered architecture:

1. **API Layer**: OpenRouterClient handles the API communication
2. **Agent Layer**: OpenRouterAgent implements the IAgent interface
3. **Participant Layer**: DialogueParticipant/MotivatedDialogueParticipant
4. **Workflow Layer**: DialogueWorkflow/ConsensusWorkflow
5. **Facade Layer**: Simple helper functions in the convenings module

This layered approach allows for flexibility in usage while providing simple entry points for common scenarios.

## Relationships
- **Parent Nodes:** [Mastra Framework](/context-network/elements/mastra/overview.md)
- **Child Nodes:** None
- **Related Nodes:** 
  - [Multi-agent Dialogue Architecture](/context-network/elements/multi-agent-dialogue/architecture.md) - implements - Implementation of the dialogue architecture
  - [Motivation System](/context-network/elements/multi-agent-dialogue/motivation_system.md) - extends - Extends the motivation system
  - [Bidding Strategies](/context-network/elements/multi-agent-dialogue/bidding_strategies.md) - implements - Implementation of bidding strategies

## Navigation Guide
- **When to Use:** When implementing or extending the OpenRouter integration, or when seeking to understand how the multi-model capabilities are implemented.
- **Next Steps:** Examine the specific implementation files, particularly `openrouter_client.ts` and `openrouter_provider.ts`.
- **Related Tasks:** Implementing new LLM integrations, extending dialogue workflows, enhancing bidding strategies.

## Metadata
- **Created:** 05/31/2025
- **Last Updated:** 05/31/2025
- **Updated By:** Cline

## Change History
- 05/31/2025: Initial documentation created with architecture overview, usage examples, and configuration options.
