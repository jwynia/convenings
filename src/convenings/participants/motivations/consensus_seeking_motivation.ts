/**
 * Consensus Seeking Motivation Implementation
 * 
 * Implements a motivation that drives participants to work toward agreement
 * and find common ground in discussions.
 */

import { IParticipant } from "../../interfaces.ts";
import {
  DialogueContext,
  DialogueTurn,
  IMotivation,
  MotivationState
} from "./interfaces.ts";

/**
 * Configuration options for the consensus seeking motivation
 */
export interface ConsensusSeekingConfig {
  /**
   * Target agreement level considered to be consensus (0-1)
   */
  targetAgreement: number;

  /**
   * How willing the participant is to compromise (0-1)
   */
  compromiseWillingness: number;

  /**
   * How quickly patience decays when no progress is made
   */
  patienceDecayRate: number;

  /**
   * Whether to actively mediate disagreements
   */
  activeMediationEnabled?: boolean;
}

/**
 * A motivation that drives participants to seek consensus and agreement
 */
export class ConsensusSeekingMotivation implements IMotivation {
  /**
   * Unique identifier for this motivation
   */
  id = "consensus-seeking";

  /**
   * Human-readable name for this motivation
   */
  name = "Consensus Seeking";

  /**
   * Create a new consensus seeking motivation
   * 
   * @param config - Configuration options
   */
  constructor(
    private config: ConsensusSeekingConfig = {
      targetAgreement: 0.8,
      compromiseWillingness: 0.7,
      patienceDecayRate: 0.05
    }
  ) {}

  /**
   * Calculate the desire to speak based on the consensus-seeking motivation
   * 
   * @param participant - The participant with this motivation
   * @param state - Current state of the motivation
   * @param context - Current dialogue context
   * @returns Desire to speak (0-1)
   */
  async calculateDesire(
    participant: IParticipant,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number> {
    const disagreementLevel = await this.analyzeDisagreement(context);
    const recentCompromises = this.detectRecentCompromises(context);
    
    // High desire when disagreement exists but compromise is emerging
    if (disagreementLevel > 0.3 && recentCompromises > 0) {
      return Math.min(0.9, disagreementLevel + recentCompromises * 0.3);
    }
    
    // Also high desire when significant disagreement and no one addressing it
    if (disagreementLevel > 0.6 && !this.isBeingAddressed(context, "disagreement")) {
      return 0.8;
    }
    
    // Low desire when consensus is near
    if (state.agreement.size > 0) {
      const avgAgreement = Array.from(state.agreement.values())
        .reduce((a, b) => a + b, 0) / state.agreement.size;
      
      if (avgAgreement > this.config.targetAgreement) {
        return 0.1; // Minimal desire to speak when consensus reached
      }
    }
    
    // Desire increases with disagreement level when active mediation is enabled
    if (this.config.activeMediationEnabled && disagreementLevel > 0.4) {
      return Math.min(0.85, 0.5 + disagreementLevel * 0.5);
    }
    
    // Moderate desire otherwise
    return 0.3 + disagreementLevel * 0.3;
  }

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
  ): MotivationState {
    // Create a copy of the state to modify
    const newState = this.cloneMotivationState(state);
    
    // Update agreement levels with participants
    this.updateAgreementLevels(newState, turn, context);
    
    // Track new topics that have been addressed
    const topics = this.extractTopics(turn.message);
    topics.forEach(topic => newState.topicsAddressed.add(topic));
    
    // Update emotional state based on progress toward consensus
    const consensusProgress = this.assessConsensusProgress(context);
    newState.emotionalState.valence = consensusProgress > 0 ? 
      Math.min(1, newState.emotionalState.valence + 0.1) : 
      Math.max(-1, newState.emotionalState.valence - 0.1);
    
    // Increase urgency when disagreement is detected but not being addressed
    const disagreementLevel = this.quickDisagreementCheck(context);
    if (disagreementLevel > 0.5 && !this.isBeingAddressed(context, "disagreement")) {
      newState.urgency = Math.min(1, newState.urgency + this.config.patienceDecayRate);
    } else if (consensusProgress > 0) {
      // Decrease urgency when progress is being made
      newState.urgency = Math.max(0, newState.urgency - 0.1);
    }
    
    // Update satisfaction based on overall agreement levels
    if (newState.agreement.size > 0) {
      const avgAgreement = Array.from(newState.agreement.values())
        .reduce((a, b) => a + b, 0) / newState.agreement.size;
      
      newState.satisfaction = avgAgreement > this.config.targetAgreement ? 
        Math.min(1, newState.satisfaction + 0.2) : 
        Math.max(0, newState.satisfaction - 0.1);
    }
    
    return newState;
  }

  /**
   * Check if the motivation's goals are satisfied
   * 
   * @param state - Current state of the motivation
   * @returns Whether consensus has been reached
   */
  isSatisfied(state: MotivationState): boolean {
    // Consensus is reached when average agreement exceeds target
    if (state.agreement.size === 0) {
      return false;
    }
    
    const avgAgreement = Array.from(state.agreement.values())
      .reduce((a, b) => a + b, 0) / state.agreement.size;
    
    return avgAgreement >= this.config.targetAgreement;
  }

  /**
   * Analyze the level of disagreement in the dialogue
   * 
   * @param context - Current dialogue context
   * @returns Disagreement level (0-1)
   */
  private async analyzeDisagreement(context: DialogueContext): Promise<number> {
    // In a real implementation, this would use NLP or sentiment analysis
    // For now, use a simple heuristic based on recent messages
    
    const recentTurns = context.history.slice(-5);
    let disagreementCount = 0;
    
    // Look for disagreement indicators in recent messages
    for (const turn of recentTurns) {
      const message = turn.message.toLowerCase();
      
      if (
        message.includes("disagree") ||
        message.includes("not true") ||
        message.includes("incorrect") ||
        message.includes("i don't think") ||
        message.includes("but actually") ||
        message.includes("contrary") ||
        (message.includes("no") && message.length < 100) // Short "no" responses
      ) {
        disagreementCount++;
      }
    }
    
    return Math.min(1, disagreementCount / Math.max(1, recentTurns.length) * 1.5);
  }

  /**
   * Quick check for disagreement without async operations
   * 
   * @param context - Current dialogue context
   * @returns Disagreement level (0-1)
   */
  private quickDisagreementCheck(context: DialogueContext): number {
    const recentTurns = context.history.slice(-3);
    let disagreementCount = 0;
    
    for (const turn of recentTurns) {
      const message = turn.message.toLowerCase();
      
      if (
        message.includes("disagree") ||
        message.includes("not true") ||
        message.includes("incorrect")
      ) {
        disagreementCount++;
      }
    }
    
    return Math.min(1, disagreementCount / Math.max(1, recentTurns.length) * 1.5);
  }

  /**
   * Detect recent compromise attempts in the dialogue
   * 
   * @param context - Current dialogue context
   * @returns Compromise strength (0-1)
   */
  private detectRecentCompromises(context: DialogueContext): number {
    const recentTurns = context.history.slice(-5);
    let compromiseCount = 0;
    
    // Look for compromise indicators in recent messages
    for (const turn of recentTurns) {
      const message = turn.message.toLowerCase();
      
      if (
        message.includes("compromise") ||
        message.includes("middle ground") ||
        message.includes("agree partially") ||
        message.includes("common ground") ||
        message.includes("both right") ||
        message.includes("see your point") ||
        message.includes("fair enough")
      ) {
        compromiseCount++;
      }
    }
    
    return Math.min(1, compromiseCount / Math.max(1, recentTurns.length) * 1.5);
  }

  /**
   * Check if a particular issue is already being addressed in the dialogue
   * 
   * @param context - Current dialogue context
   * @param issue - The issue to check for
   * @returns Whether the issue is being addressed
   */
  private isBeingAddressed(context: DialogueContext, issue: string): boolean {
    const recentTurns = context.history.slice(-2);
    
    for (const turn of recentTurns) {
      const message = turn.message.toLowerCase();
      
      if (issue === "disagreement") {
        if (
          message.includes("let's find common ground") ||
          message.includes("can we agree") ||
          message.includes("find a compromise") ||
          message.includes("middle ground") ||
          message.includes("both have valid points")
        ) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Update agreement levels with other participants
   * 
   * @param state - Motivation state to update
   * @param turn - Recent dialogue turn
   * @param context - Current dialogue context
   */
  private updateAgreementLevels(
    state: MotivationState,
    turn: DialogueTurn,
    context: DialogueContext
  ): void {
    // In a real implementation, this would use more sophisticated
    // sentiment and agreement analysis to track how much participants agree
    
    const message = turn.message.toLowerCase();
    
    // Find agreement indicators
    if (
      message.includes("agree") ||
      message.includes("good point") ||
      message.includes("exactly") ||
      message.includes("right")
    ) {
      // Increase agreement with the participant who spoke
      const currentAgreement = state.agreement.get(turn.participantId) || 0.5;
      state.agreement.set(
        turn.participantId,
        Math.min(1, currentAgreement + 0.1)
      );
    }
    
    // Find disagreement indicators
    if (
      message.includes("disagree") ||
      message.includes("not true") ||
      message.includes("incorrect") ||
      message.includes("wrong")
    ) {
      // Decrease agreement with the participant who spoke
      const currentAgreement = state.agreement.get(turn.participantId) || 0.5;
      state.agreement.set(
        turn.participantId,
        Math.max(0, currentAgreement - 0.15)
      );
    }
  }

  /**
   * Assess progress toward consensus in recent dialogue
   * 
   * @param context - Current dialogue context
   * @returns Progress value (-1 to 1)
   */
  private assessConsensusProgress(context: DialogueContext): number {
    if (context.history.length < 3) {
      return 0;
    }
    
    const recentTurns = context.history.slice(-3);
    let agreementCount = 0;
    let disagreementCount = 0;
    
    for (const turn of recentTurns) {
      const message = turn.message.toLowerCase();
      
      if (
        message.includes("agree") ||
        message.includes("good point") ||
        message.includes("see your point")
      ) {
        agreementCount++;
      }
      
      if (
        message.includes("disagree") ||
        message.includes("not true") ||
        message.includes("incorrect")
      ) {
        disagreementCount++;
      }
    }
    
    return (agreementCount - disagreementCount) / recentTurns.length;
  }

  /**
   * Extract topics from a message
   * 
   * @param message - Message to extract topics from
   * @returns Array of detected topics
   */
  private extractTopics(message: string): string[] {
    // In a real implementation, this would use NLP to extract meaningful topics
    // For this simplified version, we'll extract potential noun phrases
    
    const topics: string[] = [];
    const words = message.split(/\s+/);
    
    // Find potential topics (longer words that aren't stop words)
    for (const word of words) {
      if (
        word.length > 5 &&
        !["about", "these", "those", "their", "there", "where", "which"].includes(word.toLowerCase())
      ) {
        topics.push(word);
      }
    }
    
    return topics;
  }

  /**
   * Create a deep copy of a motivation state
   * 
   * @param state - State to clone
   * @returns Cloned state
   */
  private cloneMotivationState(state: MotivationState): MotivationState {
    return {
      satisfaction: state.satisfaction,
      urgency: state.urgency,
      agreement: new Map(state.agreement),
      topicsAddressed: new Set(state.topicsAddressed),
      emotionalState: { ...state.emotionalState },
      metadata: { ...state.metadata }
    };
  }
}

/**
 * Create a consensus seeking motivation with the specified configuration
 * 
 * @param config - Configuration options
 * @returns A new ConsensusSeekingMotivation instance
 */
export function createConsensusSeekingMotivation(
  config?: ConsensusSeekingConfig
): ConsensusSeekingMotivation {
  return new ConsensusSeekingMotivation(config);
}
