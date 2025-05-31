# Convenings Naming Convention

## Purpose
This document records the decision to rename interfaces and classes to align with the "Convenings" metaphor and hide implementation details.

## Classification
- **Domain:** Architecture
- **Stability:** Static
- **Abstraction:** Conceptual
- **Confidence:** High

## Content

### Context

The original codebase had interfaces and classes named after "Mastra" (e.g., `IMastraCore`, `IAgentProvider`, etc.), which leaked implementation details through the public API. This violated the design principle of abstraction by exposing internal implementation details to consuming applications.

### Decision

We decided to rename all public-facing interfaces and classes to align with the "Convenings" metaphor, while keeping the Mastra implementation internal. This approach:

1. Hides implementation details from consuming applications
2. Creates a more intuitive API based on the domain language
3. Makes the API more self-descriptive and user-friendly
4. Allows for future implementation changes without breaking the public API
5. Supports human-in-the-loop scenarios more naturally

### Interface Renaming Strategy

| Original Name | New Name | Rationale |
|--------------|-----------|-----------|
| `IMastraCore` | `IConveningSystem` | Reflects the system's purpose of facilitating convenings |
| `IAgent` | `IParticipant` | Participants join convenings, more intuitive than "agent" |
| `IAgentConfig` | `IParticipantConfig` | Configuration for participants |
| `IAgentProvider` | `IParticipantRegistry` | Registry for managing participants |
| `ITool` | `IResource` | Resources are used in convenings |
| `IToolConfig` | `IResourceConfig` | Configuration for resources |
| `IToolProvider` | `IResourceRegistry` | Registry for managing resources |
| `IWorkflowResult` | `IConveningOutcome` | Results from a convening |
| `IWorkflowProvider` | `IConveningFacilitator` | Facilitates the convening process |
| `ConversationAgent` | `DialogueParticipant` | More specific to conversational interactions |

### Implementation Approach

1. Created new interfaces in `src/convenings/interfaces.ts` with the renamed interfaces
2. Implemented adapter classes in `src/convenings/implementation.ts` to adapt the Mastra implementation to the new interfaces
3. Created a new `DialogueParticipant` implementation in `src/convenings/participants/dialogue_participant.ts` to replace the `ConversationAgent`
4. Updated the main module (`src/mod.ts`) to export only the new interfaces and implementations
5. Kept the original Mastra implementation intact but hidden from the public API

### Benefits

1. **Clarity**: The API now clearly communicates the purpose and domain of the library.
2. **Abstraction**: Implementation details are hidden behind well-defined interfaces.
3. **Consistency**: All public-facing interfaces follow the same naming convention.
4. **Extensibility**: The system can be extended with new implementations without changing the public API.
5. **Human Integration**: The metaphor naturally accommodates human-in-the-loop scenarios.

### Considerations for Human-in-the-Loop

The new naming convention supports human-in-the-loop implementations:

- The `IParticipant` interface can be implemented by both AI and human participants
- The terminology naturally extends to mixed scenarios (humans and AI working together)
- The API doesn't assume participants are purely computational

### Trade-offs

1. **Migration Cost**: Existing code that uses the Mastra interfaces directly will need to be updated.
2. **Learning Curve**: New terminology might require some adjustment for developers familiar with the old API.
3. **Maintenance Overhead**: The adapter pattern introduces an additional layer that must be maintained.

### Alternatives Considered

1. **Keeping Original Names**: Rejected because it continues to leak implementation details.
2. **Partial Renaming**: Rejected because it would lead to inconsistent naming conventions.
3. **Full Rewrite**: Rejected as unnecessary when the adapter pattern can bridge the gap.

## Relationships
- **Parent Nodes:** 
  - [foundation/principles.md] - guided-by - Design principles guided this decision
- **Child Nodes:** None
- **Related Nodes:** 
  - [elements/multi-agent-dialogue/architecture.md] - impacts - Changes the architecture presentation
  - [elements/multi-agent-dialogue/mastra_integration.md] - abstracts - Creates abstraction over Mastra

## Navigation Guidance
- **Access Context:** Use when understanding the API design or extending the system
- **Common Next Steps:** Typically review implementation details or specific interface definitions
- **Related Tasks:** API design, system extension, migration planning
- **Update Patterns:** Should only be updated if the overall naming strategy changes

## Metadata
- **Created:** 2025-05-31
- **Last Updated:** 2025-05-31
- **Updated By:** AI Assistant

## Change History
- 2025-05-31: Initial creation of decision record
