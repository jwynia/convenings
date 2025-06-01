/**
 * Coalition Bidding Strategy Implementation
 * Provides bidding strategies for coalition formation and dynamics.
 */

import { Bid, BidContext, IBiddingStrategy } from "./bidding_strategy.ts";
import { DialogueState } from "../../workflows/dialogue_workflow.ts";

/**
 * Extended bid context with coalition information
 */
export interface CoalitionBidContext extends BidContext {
  /**
   * Active coalitions in the dialogue
   */
  coalitions: Array<{
    /**
     * IDs of participants in the coalition
     */
    members: string[];
    
    /**
     * Topic or focus of the coalition
     */
    topic: string;
    
    /**
     * Strength of the coalition (0.0 to 1.0)
     */
    strength: number;
    
    /**
     * When the coalition was formed
     */
    formed: number;
    
    /**
     * When the coalition expires (if temporary)
     */
    expires?: number;
  }>;
}

/**
 * Bidding strategy that leverages coalitions between participants
 */
export class CoalitionBiddingStrategy implements IBiddingStrategy {
  private baseStrength: number;
  private coalitionBoost: number;
  
  /**
   * Create a new coalition-based bidding strategy
   * 
   * @param baseStrength - Base bid strength to use (0.0 to 1.0)
   * @param coalitionBoost - How much coalition membership boosts bids (0.0 to 1.0)
   */
  constructor(
    baseStrength: number = 0.5,
    coalitionBoost: number = 0.3
  ) {
    this.baseStrength = Math.max(0, Math.min(1, baseStrength));
    this.coalitionBoost = Math.max(0, Math.min(1, coalitionBoost));
  }
  
  /**
   * Calculate a bid based on coalition membership and dynamics
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with coalition adjustment
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    const { participantId } = context;
    const coalitionContext = context as CoalitionBidContext;
    
    // Start with base strength
    let bidStrength = this.baseStrength;
    let activeCoalition = null;
    let opposingCoalition = null;
    
    // Check if participant is in any coalition
    if (coalitionContext.coalitions) {
      for (const coalition of coalitionContext.coalitions) {
        if (coalition.members.includes(participantId)) {
          activeCoalition = coalition;
          break;
        }
      }
      
      // Check for opposing coalitions (not containing this participant)
      const opposingCoalitions = coalitionContext.coalitions.filter(
        c => !c.members.includes(participantId)
      );
      
      if (opposingCoalitions.length > 0) {
        // Find strongest opposing coalition
        opposingCoalition = opposingCoalitions.reduce(
          (strongest, current) => current.strength > strongest.strength ? current : strongest,
          opposingCoalitions[0]
        );
      }
    }
    
    // Calculate bid based on coalition dynamics
    if (activeCoalition) {
      // In a coalition - boost bid based on coalition strength and role
      const coalitionFactor = this.calculateCoalitionFactor(
        activeCoalition,
        participantId,
        coalitionContext
      );
      
      bidStrength = Math.min(1, this.baseStrength + (coalitionFactor * this.coalitionBoost));
      
      // Prepare response with coalition information
      return {
        participantId,
        strength: bidStrength,
        reason: `Coalition bidding (member of "${activeCoalition.topic}" coalition)`,
        metadata: {
          coalitionId: coalitionContext.coalitions.indexOf(activeCoalition),
          coalitionStrength: activeCoalition.strength,
          coalitionFactor
        }
      };
    } else if (opposingCoalition) {
      // Facing an opposing coalition - adjust bid based on opposition strategy
      const oppositionFactor = this.calculateOppositionFactor(
        opposingCoalition,
        participantId,
        coalitionContext
      );
      
      bidStrength = Math.min(1, this.baseStrength + oppositionFactor);
      
      return {
        participantId,
        strength: bidStrength,
        reason: `Coalition bidding (opposing "${opposingCoalition.topic}" coalition)`,
        metadata: {
          opposingCoalitionId: coalitionContext.coalitions.indexOf(opposingCoalition),
          opposingCoalitionStrength: opposingCoalition.strength,
          oppositionFactor
        }
      };
    }
    
    // Not in a coalition and no significant opposing coalition
    return {
      participantId,
      strength: this.baseStrength,
      reason: "Coalition bidding (no active coalition)",
    };
  }
  
  /**
   * Calculate coalition factor for a participant in a coalition
   * 
   * @param coalition - The coalition the participant belongs to
   * @param participantId - ID of the participant making the bid
   * @param context - Coalition bid context
   * @returns Coalition factor (0.0 to 1.0)
   */
  private calculateCoalitionFactor(
    coalition: CoalitionBidContext["coalitions"][0],
    participantId: string,
    context: CoalitionBidContext
  ): number {
    // Basic coalition factor is the coalition strength
    let factor = coalition.strength;
    
    // Check if it's this participant's turn to speak for the coalition
    // This helps prevent all coalition members from speaking at once
    
    // First, get the speaking order within the coalition
    const memberIndex = coalition.members.indexOf(participantId);
    
    // Get recent speakers from the coalition
    const recentMessages = context.dialogueState.messages.slice(-coalition.members.length);
    const recentCoalitionSpeakers = recentMessages
      .filter(m => coalition.members.includes(m.participantId))
      .map(m => m.participantId);
    
    // If no coalition members have spoken recently, give priority to first member
    if (recentCoalitionSpeakers.length === 0) {
      return memberIndex === 0 ? factor : factor * 0.5;
    }
    
    // If the last coalition speaker was this participant, reduce priority
    if (recentCoalitionSpeakers[recentCoalitionSpeakers.length - 1] === participantId) {
      return factor * 0.3;
    }
    
    // If other coalition members have spoken recently but not this participant,
    // increase priority to maintain balanced coalition representation
    if (!recentCoalitionSpeakers.includes(participantId)) {
      return Math.min(1, factor * 1.2);
    }
    
    return factor;
  }
  
  /**
   * Calculate opposition factor when facing an opposing coalition
   * 
   * @param opposingCoalition - The opposing coalition
   * @param participantId - ID of the participant making the bid
   * @param context - Coalition bid context
   * @returns Opposition factor (-0.2 to 0.3 typically)
   */
  private calculateOppositionFactor(
    opposingCoalition: CoalitionBidContext["coalitions"][0],
    participantId: string,
    context: CoalitionBidContext
  ): number {
    // Check if the opposing coalition has been dominating the conversation
    const recentMessages = context.dialogueState.messages.slice(-5);
    let opposingCoalitionMessages = 0;
    
    for (const message of recentMessages) {
      if (opposingCoalition.members.includes(message.participantId)) {
        opposingCoalitionMessages++;
      }
    }
    
    // If opposing coalition is dominating, increase priority to counter
    if (opposingCoalitionMessages >= 3) {
      return 0.3;
    }
    
    // If the conversation is somewhat balanced, moderate response
    if (opposingCoalitionMessages >= 1) {
      return 0.1;
    }
    
    // If the opposing coalition hasn't been active recently, slightly reduce priority
    return -0.1;
  }
  
  /**
   * Check if conditions are right to form a new coalition
   * 
   * @param dialogueState - Current dialogue state
   * @param participantId - ID of the participant considering coalition
   * @param potentialAllies - IDs of potential coalition members
   * @returns Whether to form a coalition, with topic and potential members
   */
  public static shouldFormCoalition(
    dialogueState: DialogueState,
    participantId: string,
    potentialAllies: string[] = []
  ): { 
    shouldForm: boolean; 
    topic: string; 
    allies: string[];
    strength: number;
  } {
    // Default response - no coalition
    const defaultResponse = {
      shouldForm: false,
      topic: "",
      allies: [],
      strength: 0
    };
    
    // Need at least 3 messages to analyze for coalition potential
    if (dialogueState.messages.length < 3) {
      return defaultResponse;
    }
    
    // Get recent messages
    const recentMessages = dialogueState.messages.slice(-10);
    
    // Look for potential allies based on agreement patterns
    const agreementMap = new Map<string, { count: number; topics: Set<string> }>();
    
    // Analyze recent messages for agreements
    for (let i = 0; i < recentMessages.length - 1; i++) {
      const firstMessage = recentMessages[i];
      const secondMessage = recentMessages[i + 1];
      
      // Look for agreement patterns between participants
      if (firstMessage.participantId !== secondMessage.participantId) {
        const isAgreement = this.detectAgreement(firstMessage.content, secondMessage.content);
        
        if (isAgreement) {
          // Record agreement between these participants
          const pair = [firstMessage.participantId, secondMessage.participantId].sort().join('-');
          
          if (!agreementMap.has(pair)) {
            agreementMap.set(pair, { count: 0, topics: new Set() });
          }
          
          const data = agreementMap.get(pair)!;
          data.count++;
          
          // Extract potential topic from the messages
          const topic = this.extractPotentialTopic(firstMessage.content, secondMessage.content);
          if (topic) {
            data.topics.add(topic);
          }
        }
      }
    }
    
    // No agreements found
    if (agreementMap.size === 0) {
      return defaultResponse;
    }
    
    // Find the strongest agreement pairs involving this participant
    let bestAlly = "";
    let bestCount = 0;
    let bestTopics = new Set<string>();
    
    for (const [pair, data] of agreementMap.entries()) {
      const participants = pair.split('-');
      
      if (participants.includes(participantId) && data.count > bestCount) {
        // Find the other participant in the pair
        const ally = participants[0] === participantId ? participants[1] : participants[0];
        
        // Check if this ally is in the allowed potentialAllies list (if provided)
        if (potentialAllies.length === 0 || potentialAllies.includes(ally)) {
          bestAlly = ally;
          bestCount = data.count;
          bestTopics = data.topics;
        }
      }
    }
    
    // If we found a good ally with multiple agreements
    if (bestAlly && bestCount >= 2) {
      // Determine coalition strength based on agreement count
      const strength = Math.min(0.8, 0.4 + (bestCount * 0.1));
      
      // Get coalition topic (use most common or first if tied)
      const topic = bestTopics.size > 0 ? 
        Array.from(bestTopics)[0] : 
        "Shared perspective";
      
      // Look for additional potential allies
      const additionalAllies = this.findAdditionalAllies(
        agreementMap, 
        participantId, 
        bestAlly,
        topic,
        potentialAllies
      );
      
      return {
        shouldForm: true,
        topic,
        allies: [bestAlly, ...additionalAllies],
        strength
      };
    }
    
    return defaultResponse;
  }
  
  /**
   * Find additional potential allies for a coalition
   * 
   * @param agreementMap - Map of agreements between participants
   * @param participantId - ID of the main participant
   * @param primaryAlly - ID of the primary ally
   * @param topic - Coalition topic
   * @param potentialAllies - Allowed potential allies (if restricted)
   * @returns Array of additional ally IDs
   */
  private static findAdditionalAllies(
    agreementMap: Map<string, { count: number; topics: Set<string> }>,
    participantId: string,
    primaryAlly: string,
    topic: string,
    potentialAllies: string[] = []
  ): string[] {
    const additionalAllies: string[] = [];
    
    // Check for participants who agree with both the main participant and the primary ally
    for (const [pair, data] of agreementMap.entries()) {
      if (data.count < 1 || !data.topics.has(topic)) {
        continue;
      }
      
      const participants = pair.split('-');
      
      // Look for pairs involving either the participant or the primary ally
      if (participants.includes(participantId) || participants.includes(primaryAlly)) {
        // Get the other participant in the pair
        const potentialAlly = participants[0] === participantId || participants[0] === primaryAlly ? 
          participants[1] : participants[0];
        
        // Make sure this isn't the participant or primary ally
        if (potentialAlly !== participantId && 
            potentialAlly !== primaryAlly && 
            !additionalAllies.includes(potentialAlly)) {
          
          // Check if this ally is in the allowed potentialAllies list (if provided)
          if (potentialAllies.length === 0 || potentialAllies.includes(potentialAlly)) {
            additionalAllies.push(potentialAlly);
          }
        }
      }
    }
    
    // Limit to a reasonable coalition size (max 4 total including original participant)
    return additionalAllies.slice(0, 2);
  }
  
  /**
   * Detect agreement between two messages
   * 
   * @param firstContent - Content of the first message
   * @param secondContent - Content of the second message
   * @returns Whether the messages show agreement
   */
  private static detectAgreement(firstContent: string, secondContent: string): boolean {
    // In a real implementation, this would use more sophisticated NLP
    // Simple implementation: look for agreement keywords
    const agreementKeywords = [
      "agree", "yes", "absolutely", "exactly", "correct",
      "right", "support", "concur", "same", "also",
      "too", "likewise", "indeed", "precisely", "definitely"
    ];
    
    const secondContentLower = secondContent.toLowerCase();
    
    for (const keyword of agreementKeywords) {
      if (secondContentLower.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Extract a potential topic from a pair of messages showing agreement
   * 
   * @param firstContent - Content of the first message
   * @param secondContent - Content of the second message
   * @returns Potential topic for the agreement
   */
  private static extractPotentialTopic(firstContent: string, secondContent: string): string {
    // In a real implementation, this would use more sophisticated NLP
    // Simple implementation: identify common nouns or phrases
    
    // Extract common terms
    const firstTerms = this.extractKeyTerms(firstContent);
    const secondTerms = this.extractKeyTerms(secondContent);
    
    // Find terms that appear in both messages
    const commonTerms = firstTerms.filter(term => secondTerms.includes(term));
    
    if (commonTerms.length > 0) {
      // Use the most significant common term
      return commonTerms[0];
    }
    
    // Fallback to most significant term from either message
    if (firstTerms.length > 0) {
      return firstTerms[0];
    }
    
    if (secondTerms.length > 0) {
      return secondTerms[0];
    }
    
    return "Shared perspective";
  }
  
  /**
   * Extract key terms from message content
   * 
   * @param content - Message content
   * @returns Array of key terms
   */
  private static extractKeyTerms(content: string): string[] {
    // In a real implementation, this would use NLP for key term extraction
    // Simple implementation: extract non-common words with 4+ characters
    const words = content.toLowerCase().split(/\W+/);
    const commonWords = new Set([
      "this", "that", "these", "those", "with", "from", "about",
      "have", "which", "would", "could", "should", "what", "when",
      "where", "their", "there", "here", "they", "them", "then",
      "than", "your", "will", "been", "were", "because", "some",
      "very", "just", "make", "like", "even", "also", "into",
      "only", "much", "such", "more", "most", "other", "well"
    ]);
    
    return words
      .filter(word => word.length >= 4 && !commonWords.has(word))
      .slice(0, 5); // Take top 5 terms
  }
}
