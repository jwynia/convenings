# Convenings

A modular multi-agent dialogue system for Deno, enabling structured conversations between AI participants.

## Overview

Convenings is a framework for creating and facilitating structured dialogue between multiple AI participants. It provides abstractions for creating dialogue systems with customizable participant behaviors, motivations, and interaction patterns.

The system is built on a metaphor of "convenings" - structured gatherings where participants engage in purposeful dialogue. This approach makes the API intuitive and hides implementation details, allowing for flexible and extensible multi-agent systems.

## Features

- **Participant-based Architecture**: Model dialogue participants with customizable behaviors and motivations
- **Motivation System**: Implement participants with different motivational drivers (truth-seeking, consensus-seeking, etc.)
- **Modular Design**: Extend the system with custom participants, resources, and convening patterns
- **Clean Abstractions**: Clear separation between the public API and internal implementation details
- **Human-in-the-Loop Ready**: Architecture naturally accommodates human participants alongside AI agents
- **Comprehensive Testing**: Extensive unit and integration tests ensure reliability

## Installation

```typescript
// deps.ts
export { 
  ConveningSystem,
  createConvening,
  DialogueParticipant,
  createDialogueParticipant
} from "https://deno.land/x/convenings/mod.ts";

export type {
  IConveningSystem,
  IParticipant,
  IResource,
  IConveningOutcome,
  DialogueStyle,
  DialogueParticipantConfig
} from "https://deno.land/x/convenings/mod.ts";
```

## Quick Start

```typescript
import { 
  createConvening, 
  createDialogueParticipant 
} from "./deps.ts";

// Create dialogue participants
const alice = createDialogueParticipant({
  name: "Alice",
  dialogueStyle: "cooperative",
  motivation: "truth-seeking"
});

const bob = createDialogueParticipant({
  name: "Bob",
  dialogueStyle: "inquisitive",
  motivation: "consensus-seeking"
});

// Create a convening with participants
const dialogue = createConvening({
  participants: [alice, bob],
  topic: "The future of AI governance",
  maxRounds: 5
});

// Start the dialogue
const outcome = await dialogue.facilitate();
console.log(outcome.summary);
```

## Core Concepts

### Convening System

The `ConveningSystem` is the main entry point for creating and managing convenings. It provides access to participant and resource registries.

### Participants

Participants are the agents that engage in dialogue. The system comes with built-in participant types:

- `DialogueParticipant`: A general-purpose dialogue participant
- Motivation-specific participants: Truth-seeking, consensus-seeking, etc.

### Resources

Resources are tools and capabilities available to participants during a convening.

### Facilitators

Facilitators manage the flow of dialogue in a convening, ensuring that participants interact according to defined patterns.

## Development

### Prerequisites

- [Deno](https://deno.land/) v1.34 or higher

### Environment Setup

The project uses environment variables for configuration, particularly for API keys when working with external LLM providers.

1. Copy the example environment file:
   ```bash
   cp .devcontainer/.env.example .devcontainer/.env
   ```

2. Edit `.devcontainer/.env` and add your API keys:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

3. If using VS Code with the Dev Container extension, the environment variables will be automatically loaded when you open the project in a container.

> **Note**: The examples using OpenRouter (like the debate workflow) require a valid OPENROUTER_API_KEY to be set.

### Running Tests

```bash
deno test --allow-read
```

### Running Coverage

```bash
deno test --coverage=coverage
deno run -A scripts/combine_coverage.ts
```

## Documentation

For more detailed documentation, refer to the context network documentation in the `context-network/` directory.

Key documentation includes:

- Architecture: `context-network/elements/multi-agent-dialogue/architecture.md`
- Motivation System: `context-network/elements/multi-agent-dialogue/motivation_system.md`
- Design Decisions: `context-network/decisions/`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
