/**
 * Bidding Strategy Implementation
 * Provides interfaces and implementations for participant bidding strategies
 */

import { DialogueState } from "../../workflows/dialogue_workflow.ts";

/**
 * Bid from a participant for their turn to speak
 */
export interface Bid {
  /**
   * ID of the participant making the bid
   */
  participantId: string;
  
  /**
   * Strength of the bid (0.0 to 1.0)
   * Higher values indicate stronger desire to speak
   */
  strength: number;
  
  /**
   * Reason for the bid
   */
  reason: string;
  
  /**
   * Optional additional metadata for the bid
   */
  metadata?: Record<string, unknown>;
}

/**
 * Bid context providing information for bid calculation
 */
export interface BidContext {
  /**
   * Current state of the dialogue
   */
  dialogueState: DialogueState;
  
  /**
   * ID of the participant making the bid
   */
  participantId: string;
  
  /**
   * Additional context for the bid
   */
  context?: Record<string, unknown>;
}

/**
 * Interface for bidding strategies
 */
export interface IBiddingStrategy {
  /**
   * Calculate a bid for the participant based on the context
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid
   */
  calculateBid(context: BidContext): Promise<Bid>;
}

/**
 * Basic bidding strategy that uses a static value
 */
export class StaticBiddingStrategy implements IBiddingStrategy {
  private bidStrength: number;
  
  /**
   * Create a new static bidding strategy
   * 
   * @param bidStrength - Static bid strength to use (0.0 to 1.0)
   */
  constructor(bidStrength: number) {
    this.bidStrength = Math.max(0, Math.min(1, bidStrength));
  }
  
  /**
   * Calculate a bid using the static bid strength
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with static strength
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    return {
      participantId: context.participantId,
      strength: this.bidStrength,
      reason: "Static bidding strategy",
    };
  }
}

/**
 * Turn-taking bidding strategy that gives priority to participants who
 * haven't spoken recently or at all
 */
export class TurnTakingBiddingStrategy implements IBiddingStrategy {
  private baseStrength: number;
  
  /**
   * Create a new turn-taking bidding strategy
   * 
   * @param baseStrength - Base bid strength to use (0.0 to 1.0)
   */
  constructor(baseStrength: number = 0.5) {
    this.baseStrength = Math.max(0, Math.min(1, baseStrength));
  }
  
  /**
   * Calculate a bid based on how recently the participant has spoken
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with turn-taking adjustment
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    const { dialogueState, participantId } = context;
    
    // Count recent messages
    let turnsSinceLastSpoke = Infinity;
    const recentMessages = [...dialogueState.messages].reverse();
    
    for (let i = 0; i < recentMessages.length; i++) {
      if (recentMessages[i].participantId === participantId) {
        turnsSinceLastSpoke = i;
        break;
      }
    }
    
    // Calculate bid strength based on turns since last spoke
    // The longer since last spoke, the higher the bid
    let bidStrength = this.baseStrength;
    
    if (turnsSinceLastSpoke === Infinity) {
      // Never spoken - high priority
      bidStrength = Math.min(1, this.baseStrength + 0.4);
    } else if (turnsSinceLastSpoke >= dialogueState.participants.length) {
      // Haven't spoken in a full round - medium-high priority
      bidStrength = Math.min(1, this.baseStrength + 0.2);
    } else if (turnsSinceLastSpoke > 0) {
      // Spoken recently but not the last speaker - normal priority
      bidStrength = this.baseStrength;
    } else {
      // Just spoke - low priority
      bidStrength = Math.max(0, this.baseStrength - 0.3);
    }
    
    return {
      participantId,
      strength: bidStrength,
      reason: `Turn-taking bidding (${turnsSinceLastSpoke} turns since last spoke)`,
    };
  }
}

/**
 * Motivation-based bidding strategy that calculates bids based on
 * participant motivations and dialogue context
 */
export class MotivationBiddingStrategy implements IBiddingStrategy {
  private baseStrength: number;
  
  /**
   * Create a new motivation-based bidding strategy
   * 
   * @param baseStrength - Base bid strength to use (0.0 to 1.0)
   */
  constructor(baseStrength: number = 0.5) {
    this.baseStrength = Math.max(0, Math.min(1, baseStrength));
  }
  
  /**
   * Calculate a bid based on participant motivations
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with motivation adjustment
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    const { dialogueState, participantId, context: bidContext } = context;
    
    // Get participant's motivations (if available)
    const motivations = bidContext?.motivations as Record<string, number> | undefined;
    const currentTopic = dialogueState.topic;
    
    // Default bid
    let bidStrength = this.baseStrength;
    let reason = "Motivation-based bidding";
    
    if (motivations) {
      // Calculate motivation-based bid strength
      // This is a simple implementation - in a real system, this would use
      // more sophisticated analysis of motivations and dialogue context
      
      // Check for topic-relevant motivations
      const topicRelevance = this.calculateTopicRelevance(currentTopic, motivations);
      
      // Check emotional engagement
      const emotionalEngagement = this.calculateEmotionalEngagement(
        dialogueState.messages, 
        participantId
      );
      
      // Calculate final bid strength with motivation adjustments
      bidStrength = Math.min(1, this.baseStrength + (topicRelevance * 0.3) + (emotionalEngagement * 0.2));
      
      reason = `Motivation-based bidding (topic relevance: ${topicRelevance.toFixed(2)}, emotional engagement: ${emotionalEngagement.toFixed(2)})`;
    }
    
    return {
      participantId,
      strength: bidStrength,
      reason,
      metadata: {
        motivations,
      },
    };
  }
  
  /**
   * Calculate relevance of the topic to the participant's motivations
   * 
   * @param topic - Current dialogue topic
   * @param motivations - Participant's motivations
   * @returns Relevance score (0.0 to 1.0)
   */
  private calculateTopicRelevance(
    topic: string, 
    motivations: Record<string, number>
  ): number {
    // In a real implementation, this would use more sophisticated NLP
    // to match topic keywords against motivation keywords
    
    // Simple implementation - check if any motivation keywords appear in the topic
    const topicLower = topic.toLowerCase();
    let maxRelevance = 0;
    
    for (const [motivation, strength] of Object.entries(motivations)) {
      // Check if motivation appears in topic
      if (topicLower.includes(motivation.toLowerCase())) {
        maxRelevance = Math.max(maxRelevance, strength);
      }
    }
    
    return maxRelevance;
  }
  
  /**
   * Calculate emotional engagement based on recent messages
   * 
   * @param messages - Dialogue message history
   * @param participantId - ID of the participant
   * @returns Emotional engagement score (0.0 to 1.0)
   */
  private calculateEmotionalEngagement(
    messages: Array<{content: string; participantId: string}>,
    participantId: string
  ): number {
    // In a real implementation, this would use sentiment analysis to
    // detect emotional engagement
    
    // Simple implementation - check recent messages for emotional indicators
    const recentMessages = messages.slice(-5);
    const emotionalKeywords = [
      "agree", "disagree", "feel", "believe", "important",
      "concerned", "excited", "worried", "happy", "sad",
      "angry", "frustrated", "interested", "curious"
    ];
    
    // Count emotional keywords in recent messages
    let emotionalKeywordCount = 0;
    
    for (const message of recentMessages) {
      if (message.participantId !== participantId) {
        const content = message.content.toLowerCase();
        
        for (const keyword of emotionalKeywords) {
          if (content.includes(keyword)) {
            emotionalKeywordCount++;
          }
        }
      }
    }
    
    // Calculate engagement score
    return Math.min(1, emotionalKeywordCount / 5);
  }
}

/**
 * Combined bidding strategy that merges multiple strategies
 */
export class CombinedBiddingStrategy implements IBiddingStrategy {
  private strategies: Array<{
    strategy: IBiddingStrategy;
    weight: number;
  }>;
  
  /**
   * Create a new combined bidding strategy
   * 
   * @param strategies - Array of strategies with weights
   */
  constructor(
    strategies: Array<{
      strategy: IBiddingStrategy;
      weight: number;
    }>
  ) {
    this.strategies = strategies;
    
    // Normalize weights
    const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight > 0) {
      this.strategies = strategies.map(s => ({
        strategy: s.strategy,
        weight: s.weight / totalWeight,
      }));
    }
  }
  
  /**
   * Calculate a bid by combining multiple strategies
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with combined strength
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    // Calculate bids from all strategies
    const bids = await Promise.all(
      this.strategies.map(s => s.strategy.calculateBid(context))
    );
    
    // Combine bid strengths based on weights
    let combinedStrength = 0;
    const reasons: string[] = [];
    
    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i];
      const weight = this.strategies[i].weight;
      
      combinedStrength += bid.strength * weight;
      reasons.push(bid.reason);
    }
    
    return {
      participantId: context.participantId,
      strength: combinedStrength,
      reason: `Combined bidding: ${reasons.join(" | ")}`,
      metadata: {
        individualBids: bids,
      },
    };
  }
}

/**
 * Factory for creating bidding strategies
 */
export class BiddingStrategyFactory {
  /**
   * Create a static bidding strategy
   * 
   * @param bidStrength - Static bid strength to use
   * @returns New static bidding strategy
   */
  static createStaticStrategy(bidStrength: number): IBiddingStrategy {
    return new StaticBiddingStrategy(bidStrength);
  }
  
  /**
   * Create a turn-taking bidding strategy
   * 
   * @param baseStrength - Base bid strength to use
   * @returns New turn-taking bidding strategy
   */
  static createTurnTakingStrategy(baseStrength?: number): IBiddingStrategy {
    return new TurnTakingBiddingStrategy(baseStrength);
  }
  
  /**
   * Create a motivation-based bidding strategy
   * 
   * @param baseStrength - Base bid strength to use
   * @returns New motivation-based bidding strategy
   */
  static createMotivationStrategy(baseStrength?: number): IBiddingStrategy {
    return new MotivationBiddingStrategy(baseStrength);
  }
  
  /**
   * Create a combined bidding strategy
   * 
   * @param strategies - Array of strategies with weights
   * @returns New combined bidding strategy
   */
  static createCombinedStrategy(
    strategies: Array<{
      strategy: IBiddingStrategy;
      weight: number;
    }>
  ): IBiddingStrategy {
    return new CombinedBiddingStrategy(strategies);
  }
  
  /**
   * Create a default bidding strategy for dialogue participants
   * 
   * @returns Default bidding strategy (combination of turn-taking and motivation)
   */
  static createDefaultStrategy(): IBiddingStrategy {
    return this.createCombinedStrategy([
      {
        strategy: this.createTurnTakingStrategy(0.6),
        weight: 0.6,
      },
      {
        strategy: this.createMotivationStrategy(0.4),
        weight: 0.4,
      },
    ]);
  }
}
