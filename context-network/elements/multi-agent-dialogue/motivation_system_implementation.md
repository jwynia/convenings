# Motivation System Implementation

## Purpose
This document details the implementation of the motivation system for multi-agent dialogues in the Convenings framework.

## Classification
- **Domain:** Multi-Agent Dialogue
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Content

### Overview

The motivation system drives agent behaviors in multi-agent dialogues by providing internal motivations that influence when and how agents choose to participate in conversations. It implements the concepts described in the motivation_system.md architecture document.

### Core Components

1. **Interfaces (`interfaces.ts`)**
   - `DialogueContext`: Represents the current state of a dialogue
   - `DialogueTurn`: Represents a single turn in a dialogue
   - `EmotionalState`: Represents the emotional state of a participant
   - `MotivationState`: Tracks the internal state of a motivation
   - `BiddingContext`: Context for determining speaking order
   - `BidResult`: Result of a bid to speak
   - `IMotivation`: Core interface for all motivations

2. **Base Classes (`motivated_participant.ts`)**
   - `MotivatedDialogueParticipant`: Abstract base class that extends DialogueParticipant with motivation-driven behavior
   - Provides the infrastructure for motivation management, state tracking, and bidding

3. **Motivation Implementations**
   - `ConsensusSeekingMotivation`: Drives participants to work toward agreement
   - `TruthSeekingMotivation`: Drives participants to uncover facts and evidence

4. **Concrete Participants**
   - `ContextualParticipant`: Adapts its behavior based on active motivations

### Implementation Details

#### Motivation State Management

Each motivation maintains its own state, which includes:
- Satisfaction level (0-1)
- Urgency level (0-1)
- Agreement levels with other participants
- Topics that have been addressed
- Emotional state (valence and arousal)
- Additional metadata

States are updated after each dialogue turn, reflecting how the conversation affects the motivation.

#### Bidding System

The bidding system determines speaking order by having participants calculate a "desire to speak" value:

1. Each motivation calculates its desire to speak
2. Desires are aggregated using one of three strategies:
   - Weighted average (default)
   - Maximum value
   - Probabilistic selection
3. Context modifiers adjust the desire based on turn-taking patterns
4. The final bid includes a value, reasoning, and motivation breakdown

#### Contextual Response Generation

The ContextualParticipant generates responses based on its dominant motivation:

1. Analyze input to determine which motivation is most active
2. Select a response template based on the dominant motivation
3. Format the template with the detected topic
4. Apply any style adjustments from the base DialogueParticipant

### Extension Points

The system is designed to be extensible:

1. **New Motivations**: Create new classes implementing the IMotivation interface
2. **New Aggregation Strategies**: Add to the MotivatedDialogueParticipant
3. **Advanced Response Templates**: Enhance ContextualParticipant
4. **Emotional State Processing**: Improve the emotional state tracking

## Relationships
- **Parent Nodes:** 
  - [Multi-Agent Dialogue Architecture](./architecture.md) - is-parent-of - Overall architecture
  - [Motivation System](./motivation_system.md) - is-parent-of - Conceptual design
- **Child Nodes:** None
- **Related Nodes:**
  - [Bidding Strategies](./bidding_strategies.md) - implements - Turn-taking mechanisms
  - [MASTRA Integration](./mastra_integration.md) - relates-to - LLM integration

## Navigation Guide
- **When to Use:** When implementing or modifying agent motivations
- **Next Steps:** 
  - See bidding_strategies.md for turn-taking mechanisms
  - See simulation_modes.md for testing and simulation

## Metadata
- **Created:** 5/31/2025
- **Last Updated:** 5/31/2025
- **Updated By:** Cline

## Change History
- 5/31/2025: Initial documentation of the motivation system implementation
