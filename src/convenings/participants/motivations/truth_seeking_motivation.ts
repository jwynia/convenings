/**
 * Truth Seeking Motivation Implementation
 * 
 * Implements a motivation that drives participants to uncover facts,
 * seek evidence, and promote accuracy in discussions.
 */

import { IParticipant } from "../../interfaces.ts";
import {
  DialogueContext,
  DialogueTurn,
  IMotivation,
  MotivationState
} from "./interfaces.ts";

/**
 * Configuration options for the truth seeking motivation
 */
export interface TruthSeekingConfig {
  /**
   * Threshold for what's considered sufficient evidence (0-1)
   */
  evidenceThreshold: number;

  /**
   * How often to question claims (0-1)
   */
  questioningRate: number;

  /**
   * Urgency for seeking clarification (0-1)
   */
  clarificationUrgency: number;

  /**
   * Whether to prioritize uncertainty reduction
   */
  prioritizeUncertainty?: boolean;
}

/**
 * A motivation that drives participants to seek truth and evidence
 */
export class TruthSeekingMotivation implements IMotivation {
  /**
   * Unique identifier for this motivation
   */
  id = "truth-seeking";

  /**
   * Human-readable name for this motivation
   */
  name = "Truth Seeking";

  /**
   * Create a new truth seeking motivation
   * 
   * @param config - Configuration options
   */
  constructor(
    private config: TruthSeekingConfig = {
      evidenceThreshold: 0.7,
      questioningRate: 0.6,
      clarificationUrgency: 0.8
    }
  ) {}

  /**
   * Calculate the desire to speak based on the truth-seeking motivation
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
    const unsubstantiatedClaims = await this.findUnsubstantiatedClaims(context);
    const contradictions = await this.detectContradictions(context);
    const ambiguities = await this.identifyAmbiguities(context);
    
    // High desire when truth is unclear
    const clarityNeed = (
      unsubstantiatedClaims * 0.4 +
      contradictions * 0.4 +
      ambiguities * 0.2
    );
    
    // If we have uncertainty but no one is addressing it
    if (clarityNeed > 0.5 && !this.isBeingAddressed(context, "evidence")) {
      return Math.min(1, clarityNeed * this.config.clarificationUrgency);
    }
    
    // Lower desire when recent evidence has been provided
    const recentEvidence = this.detectRecentEvidence(context);
    if (recentEvidence > this.config.evidenceThreshold) {
      return Math.max(0.1, clarityNeed * 0.3);
    }
    
    // Higher desire when contradictions exist and uncertainty reduction is prioritized
    if (contradictions > 0.7 && this.config.prioritizeUncertainty) {
      return Math.min(0.9, 0.5 + contradictions * 0.4);
    }
    
    // Moderate desire otherwise
    return Math.min(0.8, clarityNeed * 0.7);
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
    
    // Track new topics that have been addressed
    const topics = this.extractTopics(turn.message);
    topics.forEach(topic => newState.topicsAddressed.add(topic));
    
    // Update emotional state based on evidence quality
    const evidenceQuality = this.assessEvidenceQuality(turn.message);
    newState.emotionalState.valence = evidenceQuality > 0.5 ? 
      Math.min(1, newState.emotionalState.valence + 0.1) : 
      Math.max(-1, newState.emotionalState.valence - 0.1);
    
    // Arousal increases with contradictions and ambiguities
    const contradictions = this.quickContradictionCheck(context);
    newState.emotionalState.arousal = contradictions > 0.5 ?
      Math.min(1, newState.emotionalState.arousal + 0.1) :
      Math.max(0, newState.emotionalState.arousal - 0.05);
    
    // Increase urgency when unsubstantiated claims are detected
    const claimsWithoutEvidence = this.quickUnsubstantiatedClaimCheck(turn.message);
    if (claimsWithoutEvidence > 0.5) {
      newState.urgency = Math.min(1, newState.urgency + 0.2);
    } else if (evidenceQuality > this.config.evidenceThreshold) {
      // Decrease urgency when good evidence is provided
      newState.urgency = Math.max(0, newState.urgency - 0.15);
    }
    
    // Update satisfaction based on evidence quality in the conversation
    const recentEvidence = this.detectRecentEvidence(context);
    newState.satisfaction = recentEvidence > this.config.evidenceThreshold ? 
      Math.min(1, newState.satisfaction + 0.1) : 
      Math.max(0, newState.satisfaction - 0.1);
    
    return newState;
  }

  /**
   * Check if the motivation's goals are satisfied
   * 
   * @param state - Current state of the motivation
   * @returns Whether truth has been adequately established
   */
  isSatisfied(state: MotivationState): boolean {
    // Truth seeking is satisfied when satisfaction exceeds threshold
    return state.satisfaction > this.config.evidenceThreshold;
  }

  /**
   * Find claims that lack evidence in the dialogue
   * 
   * @param context - Current dialogue context
   * @returns Unsubstantiated claims level (0-1)
   */
  private async findUnsubstantiatedClaims(context: DialogueContext): Promise<number> {
    // In a real implementation, this would use NLP to detect claims and check for evidence
    // For now, use a simple heuristic based on recent messages
    
    const recentTurns = context.history.slice(-5);
    let unsubstantiatedClaimCount = 0;
    let totalClaimCount = 0;
    
    // Look for claim indicators in recent messages
    for (const turn of recentTurns) {
      const message = turn.message.toLowerCase();
      
      // Check for claim indicators
      const hasClaim = 
        message.includes("is that") ||
        message.includes("i believe") ||
        message.includes("i think") ||
        message.includes("must be") ||
        message.includes("definitely") ||
        message.includes("certainly") ||
        message.includes("always") ||
        message.includes("never");
      
      if (hasClaim) {
        totalClaimCount++;
        
        // Check for evidence indicators
        const hasEvidence = 
          message.includes("because") ||
          message.includes("evidence") ||
          message.includes("study") ||
          message.includes("research") ||
          message.includes("according to") ||
          message.includes("shows that") ||
          message.includes("demonstrates") ||
          message.includes("proof");
        
        if (!hasEvidence) {
          unsubstantiatedClaimCount++;
        }
      }
    }
    
    return totalClaimCount === 0 ? 0 : 
      Math.min(1, unsubstantiatedClaimCount / totalClaimCount);
  }

  /**
   * Quick check for unsubstantiated claims without async operations
   * 
   * @param message - Message to analyze
   * @returns Unsubstantiated claims level (0-1)
   */
  private quickUnsubstantiatedClaimCheck(message: string): number {
    const lowerMessage = message.toLowerCase();
    
    // Check for claim indicators
    const hasStrongClaim = 
      lowerMessage.includes("definitely") ||
      lowerMessage.includes("certainly") ||
      lowerMessage.includes("absolutely") ||
      lowerMessage.includes("undoubtedly") ||
      lowerMessage.includes("always") ||
      lowerMessage.includes("never");
    
    const hasModeratedClaim = 
      lowerMessage.includes("i believe") ||
      lowerMessage.includes("i think") ||
      lowerMessage.includes("likely") ||
      lowerMessage.includes("probably");
    
    // Check for evidence indicators
    const hasEvidence = 
      lowerMessage.includes("because") ||
      lowerMessage.includes("evidence") ||
      lowerMessage.includes("research") ||
      lowerMessage.includes("according to") ||
      lowerMessage.includes("suggests that");
    
    if (hasStrongClaim && !hasEvidence) {
      return 0.8;
    } else if (hasModeratedClaim && !hasEvidence) {
      return 0.5;
    } else if ((hasStrongClaim || hasModeratedClaim) && hasEvidence) {
      return 0.2;
    }
    
    return 0;
  }

  /**
   * Detect contradictions in the dialogue
   * 
   * @param context - Current dialogue context
   * @returns Contradiction level (0-1)
   */
  private async detectContradictions(context: DialogueContext): Promise<number> {
    // In a real implementation, this would use NLP to detect logical contradictions
    // For now, use a simple heuristic based on direct contradiction patterns
    
    const recentTurns = context.history.slice(-8);
    let contradictionCount = 0;
    
    if (recentTurns.length < 2) {
      return 0;
    }
    
    // Look for contradiction patterns in sequential messages
    for (let i = 1; i < recentTurns.length; i++) {
      const prevMessage = recentTurns[i - 1].message.toLowerCase();
      const currMessage = recentTurns[i].message.toLowerCase();
      
      if (
        (prevMessage.includes("is") && currMessage.includes("isn't")) ||
        (prevMessage.includes("are") && currMessage.includes("aren't")) ||
        (prevMessage.includes("can") && currMessage.includes("can't")) ||
        (prevMessage.includes("will") && currMessage.includes("won't")) ||
        (prevMessage.includes("do") && currMessage.includes("don't")) ||
        (prevMessage.includes("does") && currMessage.includes("doesn't")) ||
        (currMessage.includes("contrary") && currMessage.includes("to what")) ||
        (currMessage.includes("that's incorrect") || currMessage.includes("that's wrong"))
      ) {
        contradictionCount++;
      }
    }
    
    return Math.min(1, contradictionCount / (recentTurns.length - 1) * 1.5);
  }

  /**
   * Quick check for contradictions without async operations
   * 
   * @param context - Current dialogue context
   * @returns Contradiction level (0-1)
   */
  private quickContradictionCheck(context: DialogueContext): number {
    const recentTurns = context.history.slice(-3);
    
    if (recentTurns.length < 2) {
      return 0;
    }
    
    const lastMessage = recentTurns[recentTurns.length - 1].message.toLowerCase();
    
    // Check if the latest message contains explicit contradiction indicators
    if (
      lastMessage.includes("actually") ||
      lastMessage.includes("incorrect") ||
      lastMessage.includes("not true") ||
      lastMessage.includes("i disagree") ||
      lastMessage.includes("wrong")
    ) {
      return 0.7;
    }
    
    return 0;
  }

  /**
   * Identify ambiguities in the dialogue
   * 
   * @param context - Current dialogue context
   * @returns Ambiguity level (0-1)
   */
  private async identifyAmbiguities(context: DialogueContext): Promise<number> {
    // In a real implementation, this would use NLP to identify ambiguous statements
    // For now, use a simple heuristic based on ambiguity indicators
    
    const recentTurns = context.history.slice(-5);
    let ambiguityCount = 0;
    
    // Look for ambiguity indicators in recent messages
    for (const turn of recentTurns) {
      const message = turn.message.toLowerCase();
      
      if (
        message.includes("unclear") ||
        message.includes("ambiguous") ||
        message.includes("vague") ||
        message.includes("what do you mean") ||
        message.includes("could you clarify") ||
        message.includes("not sure what") ||
        message.includes("confusing")
      ) {
        ambiguityCount++;
      }
    }
    
    return Math.min(1, ambiguityCount / recentTurns.length * 1.5);
  }

  /**
   * Detect recent evidence in the dialogue
   * 
   * @param context - Current dialogue context
   * @returns Evidence quality (0-1)
   */
  private detectRecentEvidence(context: DialogueContext): number {
    const recentTurns = context.history.slice(-5);
    let evidenceScore = 0;
    
    // Look for evidence indicators in recent messages
    for (const turn of recentTurns) {
      const message = turn.message.toLowerCase();
      
      let messageEvidenceScore = 0;
      
      // Strong evidence indicators
      if (
        message.includes("research shows") ||
        message.includes("studies demonstrate") ||
        message.includes("evidence indicates") ||
        message.includes("according to data") ||
        message.includes("statistics show") ||
        message.includes("proven by")
      ) {
        messageEvidenceScore += 0.3;
      }
      
      // Moderate evidence indicators
      if (
        message.includes("because") ||
        message.includes("since") ||
        message.includes("as a result of") ||
        message.includes("due to") ||
        message.includes("example:")
      ) {
        messageEvidenceScore += 0.15;
      }
      
      // Specific numbers or quantities suggest evidence
      if (
        /\d+%/.test(message) ||
        /\d+\.\d+/.test(message) ||
        message.includes("increase") ||
        message.includes("decrease")
      ) {
        messageEvidenceScore += 0.1;
      }
      
      evidenceScore += Math.min(0.4, messageEvidenceScore);
    }
    
    return Math.min(1, evidenceScore);
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
      
      if (issue === "evidence") {
        if (
          message.includes("do you have evidence for") ||
          message.includes("what's your source") ||
          message.includes("can you back that up") ||
          message.includes("how do you know") ||
          message.includes("what makes you say")
        ) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Assess the quality of evidence in a message
   * 
   * @param message - Message to analyze
   * @returns Evidence quality (0-1)
   */
  private assessEvidenceQuality(message: string): number {
    const lowerMessage = message.toLowerCase();
    let evidenceScore = 0;
    
    // Strong evidence indicators
    if (
      lowerMessage.includes("research shows") ||
      lowerMessage.includes("studies demonstrate") ||
      lowerMessage.includes("evidence indicates") ||
      lowerMessage.includes("according to data") ||
      lowerMessage.includes("statistics show")
    ) {
      evidenceScore += 0.5;
    }
    
    // Moderate evidence indicators
    if (
      lowerMessage.includes("because") ||
      lowerMessage.includes("since") ||
      lowerMessage.includes("as a result of") ||
      lowerMessage.includes("due to")
    ) {
      evidenceScore += 0.3;
    }
    
    // Specific numbers or quantities suggest evidence
    if (
      /\d+%/.test(lowerMessage) ||
      /\d+\.\d+/.test(lowerMessage)
    ) {
      evidenceScore += 0.2;
    }
    
    // Citations or references
    if (
      lowerMessage.includes("according to") ||
      lowerMessage.includes("cited in") ||
      lowerMessage.includes("referenced by")
    ) {
      evidenceScore += 0.4;
    }
    
    return Math.min(1, evidenceScore);
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
 * Create a truth seeking motivation with the specified configuration
 * 
 * @param config - Configuration options
 * @returns A new TruthSeekingMotivation instance
 */
export function createTruthSeekingMotivation(
  config?: TruthSeekingConfig
): TruthSeekingMotivation {
  return new TruthSeekingMotivation(config);
}
