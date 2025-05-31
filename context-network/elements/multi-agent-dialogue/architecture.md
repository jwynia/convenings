# Multi-Agent Dialogue System Architecture

## Purpose
This document outlines the architecture of the multi-agent dialogue system, including component structures and interaction patterns.

## Classification
- **Domain:** System Architecture
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** High

## Content

### Overview

The multi-agent dialogue system is designed to facilitate flexible interactions between multiple AI agents with different motivations, strategies, and behaviors. The system uses a motivation-driven architecture where agents bid to speak based on their internal state and the conversation context.

```mermaid
graph TD
    A[Dialogue System] --> B[Agents]
    A --> C[Motivations]
    A --> D[Strategies]
    A --> E[Simulation Engine]
    B --> F[MotivatedAgent]
    B --> G[DialogueAgent]
    C --> H[ConsensusSeekingMotivation]
    C --> I[TruthSeekingMotivation]
    C --> J[Other Motivations]
    D --> K[Bidding Strategies]
    D --> L[Selection Strategies]
    D --> M[Exit Conditions]
    E --> N[Simulation Modes]
</mermaid>

### Core Components

#### 1. Agent System

The agent system consists of base agent classes and implementations:

- **Base Agents**:
  - `Agent.ts`: Base agent class with core functionality
  - `DialogueAgent.ts`: Agent specialized for dialogue interactions
  - `MotivatedAgent.ts`: Agent with motivations that influence bidding

- **Implementations**:
  - `DialogueAgent.ts`: Implementation of dialogue-focused agent
  - `MediatorAgent.ts`: Agent that facilitates discussions
  - `ConsensusBuilderAgent.ts`: Agent focused on building consensus

#### 2. Motivation System

Agents have internal motivations that influence their desire to speak:

- **Base Motivations**:
  - `Motivation.ts`: Interface for all motivations
  - `MotivationState.ts`: State tracking for motivations

- **Implementations**:
  - `CompetitiveMotivation.ts`: Drives agents to assert their viewpoint
  - `CollaborativeMotivation.ts`: Drives agents to build on others' ideas
  - `ConsensusSeekingMotivation.ts`: Drives agents to find agreement
  - `TruthSeekingMotivation.ts`: Drives agents to uncover facts
  - `DevilsAdvocateMotivation.ts`: Drives agents to challenge assumptions

#### 3. Strategy System

The strategy system manages how agents interact and how dialogues flow:

- **Bidding Strategies**:
  - `BiddingStrategy.ts`: Base interface for bidding strategies
  - `CompetitiveBidding.ts`: Competitive turn-taking strategy
  - `ConsensusBidding.ts`: Consensus-oriented bidding
  - `TurnTakingBidding.ts`: Structured turn-taking
  - `AdaptiveBidding.ts`: Adapts strategy based on context

- **Selection Strategies**:
  - `SelectionStrategy.ts`: Base interface for selecting next speaker
  - `HighestBidStrategy.ts`: Selects agent with highest bid
  - `ConsensusThresholdStrategy.ts`: Uses thresholds for consensus
  - `ConvergenceStrategy.ts`: Selects based on position convergence
  - `MultiObjectiveStrategy.ts`: Balances multiple objectives

- **Exit Conditions**:
  - `ExitCondition.ts`: Interface for dialogue exit conditions
  - `ConsensusReachedCondition.ts`: Exits when consensus is reached
  - `LowEngagementCondition.ts`: Exits when engagement drops
  - `TimeBasedCondition.ts`: Exits after set time/turns
  - `CompositeCondition.ts`: Combines multiple exit conditions

#### 4. Dialogue Dynamics

Components that track and analyze dialogue state:

- `DialogueDynamics.ts`: Core dynamics tracking
- `ConsensusTracker.ts`: Tracks consensus formation
- `DisagreementAnalyzer.ts`: Analyzes disagreements
- `TopicEvolution.ts`: Tracks how topics evolve

#### 5. Simulation Engine

The engine that orchestrates dialogue simulations:

- `DialogueSimulator.ts`: Core simulation engine
- `SimulationMode.ts`: Different simulation modes
- `SimulationMetrics.ts`: Metrics and analytics

#### 6. Analysis System

Components for analyzing dialogue content:

- `SentimentAnalyzer.ts`: Analyzes sentiment in messages
- `AgreementCalculator.ts`: Calculates agreement levels
- `TopicRelevanceScorer.ts`: Scores topic relevance

### Simulation Modes

The system supports various dialogue modes, each with specific configurations:

- **Consensus**: Focused on building agreement
- **Deliberative**: Focused on exploring topics deeply
- **Discovery**: Maximizes idea generation
- **Pedagogical**: Optimized for knowledge transfer
- **Negotiation**: For finding agreements between positions
- **Problem Solving**: Collaborative solution development
- **Narrative**: Collaborative storytelling
- **Investigative**: Information uncovering
- **Therapeutic**: Emotional support and self-discovery
- **Devils Advocate**: Systematic challenge of assumptions
- **Forecasting**: Future scenario exploration
- **Mediation**: Facilitation between conflicting parties
- **Meta-Cognitive**: Reflection on dialogue process
- **Adaptive**: Dynamically shifts between modes

### Mastra Integration

The system integrates with Mastra through workflows:

- `DialogueWorkflow.ts`: Base workflow for dialogues
- `ConsensusWorkflow.ts`: Workflow for consensus dialogues
- `DeliberationWorkflow.ts`: Workflow for deliberative dialogues

## Relationships
- **Parent Nodes:** 
  - [elements/README.md]
- **Child Nodes:** 
  - [elements/multi-agent-dialogue/motivation_system.md]
  - [elements/multi-agent-dialogue/bidding_strategies.md]
  - [elements/multi-agent-dialogue/simulation_modes.md]
  - [elements/multi-agent-dialogue/mastra_integration.md]
- **Related Nodes:** 
  - [elements/deno/overview.md] - platform for implementation
  - [decisions/decision_index.md] - implementation decisions

## Navigation Guidance
- **Access Context:** Use this document to understand the overall architecture of the multi-agent dialogue system
- **Common Next Steps:** Explore specific sub-components through child nodes
- **Related Tasks:** System implementation, component design, workflow development
- **Update Patterns:** Update when core architectural elements change

## Metadata
- **Created:** 2025-05-31
- **Last Updated:** 2025-05-31
- **Updated By:** AI Assistant

## Change History
- 2025-05-31: Initial creation based on multi-agent-dialogue-system.md
