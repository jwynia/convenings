/**
 * Motivation System Interfaces
 * 
 * Defines the core interfaces for the motivation system that drives agent behaviors
 * in multi-agent dialogues.
 */

import { IParticipant } from "../../interfaces.ts";

/**
 * Represents the dialogue context available to motivations
 */
export interface DialogueContext {
  /**
   * The history of messages in the dialogue
   */
  history: DialogueTurn[];
  
  /**
   * Current active topics in the dialogue
   */
  topics: string[];
  
  /**
   * Participants involved in the dialogue
   */
  participants: IParticipant[];
  
  /**
   * Additional metadata about the dialogue context
   */
  metadata: Record<string, unknown>;
}

/**
 * Represents a turn in a dialogue
 */
export interface DialogueTurn {
  /**
   * The participant who spoke
   */
  participantId: string;
  
  /**
   * The content of the message
   */
  message: string;
  
  /**
   * When the message was sent
   */
  timestamp: number;
  
  /**
   * Optional metadata for the turn
   */
  metadata?: Record<string, unknown>;
}

/**
 * Represents the emotional state of a participant
 */
export interface EmotionalState {
  /**
   * Valence (positive/negative) from -1 to 1
   */
  valence: number;
  
  /**
   * Arousal (activation level) from 0 to 1
   */
  arousal: number;
}

/**
 * The internal state of a motivation
 */
export interface MotivationState {
  /**
   * How satisfied the motivation is (0-1)
   */
  satisfaction: number;
  
  /**
   * How urgent the motivation feels (0-1)
   */
  urgency: number;
  
  /**
   * Agreement levels with other participants
   */
  agreement: Map<string, number>;
  
  /**
   * Topics that have been addressed
   */
  topicsAddressed: Set<string>;
  
  /**
   * Emotional state related to this motivation
   */
  emotionalState: EmotionalState;
  
  /**
   * Additional metadata for the state
   */
  metadata: Record<string, unknown>;
}

/**
 * Context for bidding to determine speaking order
 */
export interface BiddingContext extends DialogueContext {
  /**
   * Time since last turn
   */
  timeSinceLastTurn: number;
  
  /**
   * Number of turns since this participant last spoke
   */
  turnsSinceLastSpoke: number;
  
  /**
   * Whether this is a new topic
   */
  isNewTopic: boolean;
}

/**
 * Result of a bid to speak
 */
export interface BidResult {
  /**
   * The bid value (0-1)
   */
  value: number;
  
  /**
   * Reasoning behind the bid
   */
  reasoning: string;
  
  /**
   * Breakdown of how motivations contributed
   */
  motivationBreakdown?: Record<string, number>;
  
  /**
   * How context influenced the bid
   */
  contextInfluence?: string;
}

/**
 * Core motivation interface that all motivations must implement
 */
export interface IMotivation {
  /**
   * Unique identifier for the motivation
   */
  id: string;
  
  /**
   * Human-readable name for the motivation
   */
  name: string;
  
  /**
   * Calculate the desire to speak (0-1)
   * 
   * @param participant - The participant with this motivation
   * @param state - Current state of the motivation
   * @param context - Current dialogue context
   * @returns A number between 0-1 representing desire to speak
   */
  calculateDesire(
    participant: IParticipant,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number>;
  
  /**
   * Update the motivation state after a dialogue turn
   * 
   * @param state - Current state of the motivation
   * @param turn - The dialogue turn that just occurred
   * @param context - Current dialogue context
   * @returns Updated motivation state
   */
  updateState(
    state: MotivationState,
    turn: DialogueTurn,
    context: DialogueContext
  ): MotivationState;
  
  /**
   * Check if the motivation's goals are satisfied
   * 
   * @param state - Current state of the motivation
   * @returns Whether the motivation is satisfied
   */
  isSatisfied(state: MotivationState): boolean;
}

/**
 * Configuration for a motivated participant
 */
export interface MotivatedParticipantConfig {
  /**
   * Motivations and their relative weights
   */
  motivations: Array<{
    motivation: IMotivation;
    weight: number;
  }>;
  
  /**
   * How to aggregate motivation desires
   */
  aggregationStrategy?: "weighted" | "max" | "probabilistic";
}
