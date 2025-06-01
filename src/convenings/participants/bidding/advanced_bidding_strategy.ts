/**
 * Advanced Bidding Strategy Implementation
 * Provides enhanced bidding strategies with contextual awareness, emotional influence,
 * coalition formation, and interruption mechanics.
 */

import { Bid, BidContext, IBiddingStrategy } from "./bidding_strategy.ts";
import { DialogueState } from "../../workflows/dialogue_workflow.ts";
import { EmotionalState } from "../motivations/interfaces.ts";

/**
 * Extended bid context with additional information for advanced bidding
 */
export interface ExtendedBidContext extends BidContext {
  /**
   * Current emotional state of the participant (if available)
   */
  emotionalState?: EmotionalState;
  
  /**
   * Emotional states of other participants (if available)
   */
  otherParticipantEmotions?: Record<string, EmotionalState>;
  
  /**
   * Coalition information (if any)
   */
  coalitions?: Array<{
    members: string[];
    topic: string;
    strength: number;
  }>;
  
  /**
   * Urgency level for the participant (0.0 to 1.0)
   */
  urgencyLevel?: number;
  
  /**
   * Additional context for semantic relevance
   */
  semanticContext?: {
    /**
     * Key terms or concepts currently being discussed
     */
    activeTerms: string[];
    
    /**
     * Participant expertise areas mapped to relevance scores
     */
    participantExpertise: Record<string, Record<string, number>>;
    
    /**
     * Current discussion thread or topic chain
     */
    threadChain: string[];
  };
}

/**
 * Bidding strategy that uses semantic context and relevance to calculate bids
 */
export class ContextualBiddingStrategy implements IBiddingStrategy {
  private baseStrength: number;
  private keywordWeights: Record<string, number>;
  
  /**
   * Create a new contextual bidding strategy
   * 
   * @param baseStrength - Base bid strength to use (0.0 to 1.0)
   * @param keywordWeights - Optional weights for specific keywords or concepts
   */
  constructor(
    baseStrength: number = 0.5,
    keywordWeights: Record<string, number> = {}
  ) {
    this.baseStrength = Math.max(0, Math.min(1, baseStrength));
    this.keywordWeights = keywordWeights;
  }
  
  /**
   * Calculate a bid based on semantic relevance to the current context
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with contextual relevance adjustment
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    const { dialogueState, participantId } = context;
    const extendedContext = context as ExtendedBidContext;
    
    // Start with base strength
    let bidStrength = this.baseStrength;
    let relevanceScore = 0;
    let expertiseScore = 0;
    let threadRelevance = 0;
    
    // Calculate contextual relevance if semantic context is available
    if (extendedContext.semanticContext) {
      // Relevance to active terms
      relevanceScore = this.calculateTermRelevance(
        extendedContext.semanticContext.activeTerms,
        participantId,
        extendedContext
      );
      
      // Expertise relevance
      expertiseScore = this.calculateExpertiseRelevance(
        participantId,
        extendedContext
      );
      
      // Thread chain relevance
      threadRelevance = this.calculateThreadRelevance(
        extendedContext.semanticContext.threadChain,
        dialogueState.messages,
        participantId
      );
      
      // Combine scores with appropriate weights
      const combinedRelevance = (
        (relevanceScore * 0.4) + 
        (expertiseScore * 0.4) + 
        (threadRelevance * 0.2)
      );
      
      // Adjust bid strength based on relevance
      bidStrength = Math.min(1, this.baseStrength + (combinedRelevance * 0.5));
    } else {
      // Fallback to basic context analysis if semantic context not available
      bidStrength = this.calculateBasicContextualRelevance(dialogueState, participantId);
    }
    
    // Prepare detailed reason
    let reason = "Contextual bidding";
    
    if (extendedContext.semanticContext) {
      reason = `Contextual bidding (term relevance: ${relevanceScore.toFixed(2)}, expertise: ${expertiseScore.toFixed(2)}, thread: ${threadRelevance.toFixed(2)})`;
    }
    
    return {
      participantId,
      strength: bidStrength,
      reason,
      metadata: {
        relevanceScore,
        expertiseScore,
        threadRelevance
      }
    };
  }
  
  /**
   * Calculate relevance to currently active terms/concepts
   * 
   * @param activeTerms - Array of active terms in the conversation
   * @param participantId - ID of the participant making the bid
   * @param context - Extended bid context
   * @returns Relevance score (0.0 to 1.0)
   */
  private calculateTermRelevance(
    activeTerms: string[],
    participantId: string,
    context: ExtendedBidContext
  ): number {
    // If no semantic context or no active terms, return low relevance
    if (!activeTerms || activeTerms.length === 0) {
      return 0.2;
    }
    
    // Get participant expertise if available
    const expertise = context.semanticContext?.participantExpertise[participantId] || {};
    
    // Calculate term relevance based on expertise and keyword weights
    let totalRelevance = 0;
    let maxRelevance = 0;
    
    for (const term of activeTerms) {
      // Start with base relevance
      let termRelevance = 0.2;
      
      // Add expertise-based relevance
      if (expertise[term]) {
        termRelevance += expertise[term] * 0.6;
      }
      
      // Add keyword weight if specified
      if (this.keywordWeights[term]) {
        termRelevance += this.keywordWeights[term] * 0.4;
      }
      
      // Keep track of max and total
      maxRelevance = Math.max(maxRelevance, termRelevance);
      totalRelevance += termRelevance;
    }
    
    // Return a balanced score that considers both max and average relevance
    // This ensures high expertise in one key area isn't diluted too much
    const avgRelevance = totalRelevance / activeTerms.length;
    return (maxRelevance * 0.7) + (avgRelevance * 0.3);
  }
  
  /**
   * Calculate relevance based on participant expertise
   * 
   * @param participantId - ID of the participant making the bid
   * @param context - Extended bid context
   * @returns Expertise relevance score (0.0 to 1.0)
   */
  private calculateExpertiseRelevance(
    participantId: string,
    context: ExtendedBidContext
  ): number {
    // If no semantic context or no expertise data, return medium relevance
    if (!context.semanticContext?.participantExpertise[participantId]) {
      return 0.5;
    }
    
    const expertise = context.semanticContext.participantExpertise[participantId];
    const activeTerms = context.semanticContext.activeTerms;
    
    // Calculate average expertise across active terms
    let totalExpertise = 0;
    let relevantTerms = 0;
    
    for (const term of activeTerms) {
      if (expertise[term]) {
        totalExpertise += expertise[term];
        relevantTerms++;
      }
    }
    
    // If no relevant terms match expertise, return low-medium score
    if (relevantTerms === 0) {
      return 0.3;
    }
    
    return totalExpertise / relevantTerms;
  }
  
  /**
   * Calculate relevance to the current discussion thread
   * 
   * @param threadChain - Current chain of discussion topics
   * @param messages - Dialogue message history
   * @param participantId - ID of the participant making the bid
   * @returns Thread relevance score (0.0 to 1.0)
   */
  private calculateThreadRelevance(
    threadChain: string[],
    messages: Array<{content: string; participantId: string}>,
    participantId: string
  ): number {
    // If no thread chain, return medium relevance
    if (!threadChain || threadChain.length === 0) {
      return 0.5;
    }
    
    // Check if participant has recently contributed to the thread
    const recentMessages = messages.slice(-5);
    let participantThreadContributions = 0;
    
    for (const message of recentMessages) {
      if (message.participantId === participantId) {
        // Simple check: see if message content contains thread terms
        // In a real implementation, this would use more sophisticated NLP
        const content = message.content.toLowerCase();
        for (const thread of threadChain) {
          if (content.includes(thread.toLowerCase())) {
            participantThreadContributions++;
            break;
          }
        }
      }
    }
    
    // Calculate thread continuity score
    // Higher if participant has been actively contributing to the thread
    // Lower if participant hasn't been part of the thread discussion
    
    if (participantThreadContributions > 0) {
      // Already participating in thread - higher relevance to continue
      return Math.min(1, 0.6 + (participantThreadContributions * 0.1));
    } else {
      // Not yet participating in thread - moderate relevance to join
      return 0.4;
    }
  }
  
  /**
   * Calculate basic contextual relevance without semantic information
   * 
   * @param dialogueState - Current dialogue state
   * @param participantId - ID of the participant making the bid
   * @returns Basic contextual relevance score (0.0 to 1.0)
   */
  private calculateBasicContextualRelevance(
    dialogueState: DialogueState,
    participantId: string
  ): number {
    // Simple implementation for when semantic context isn't available
    // Get recent messages
    const recentMessages = dialogueState.messages.slice(-3);
    
    // Check if any recent message was directed at this participant
    let wasAddressed = false;
    for (const message of recentMessages) {
      if (message.participantId !== participantId) {
        // Simple check for addressing: message contains participant name/ID
        if (message.content.includes(participantId) || 
            (dialogueState.participants.find(p => p.id === participantId)?.name &&
             message.content.includes(dialogueState.participants.find(p => p.id === participantId)!.name))) {
          wasAddressed = true;
          break;
        }
      }
    }
    
    // If directly addressed, higher relevance
    if (wasAddressed) {
      return Math.min(1, this.baseStrength + 0.3);
    }
    
    return this.baseStrength;
  }
}

/**
 * Bidding strategy influenced by emotional states
 */
export class EmotionalBiddingStrategy implements IBiddingStrategy {
  private baseStrength: number;
  private emotionalResponsiveness: number;
  
  /**
   * Create a new emotion-based bidding strategy
   * 
   * @param baseStrength - Base bid strength to use (0.0 to 1.0)
   * @param emotionalResponsiveness - How strongly emotions affect bidding (0.0 to 1.0)
   */
  constructor(
    baseStrength: number = 0.5,
    emotionalResponsiveness: number = 0.7
  ) {
    this.baseStrength = Math.max(0, Math.min(1, baseStrength));
    this.emotionalResponsiveness = Math.max(0, Math.min(1, emotionalResponsiveness));
  }
  
  /**
   * Calculate a bid based on emotional state and dialogue context
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with emotional adjustment
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    const { dialogueState, participantId } = context;
    const extendedContext = context as ExtendedBidContext;
    
    // Start with base strength
    let bidStrength = this.baseStrength;
    
    // Emotional influence factors
    let ownEmotionImpact = 0;
    let othersEmotionImpact = 0;
    let conversationToneImpact = 0;
    
    // Calculate emotional impacts if emotional state is available
    if (extendedContext.emotionalState) {
      // Impact of participant's own emotional state
      ownEmotionImpact = this.calculateOwnEmotionImpact(extendedContext.emotionalState);
      
      // Impact of other participants' emotions
      othersEmotionImpact = this.calculateOthersEmotionImpact(
        extendedContext.otherParticipantEmotions || {},
        participantId
      );
      
      // Impact of conversation tone
      conversationToneImpact = this.calculateConversationToneImpact(dialogueState);
      
      // Combine emotional impacts with weights
      const emotionalModifier = (
        (ownEmotionImpact * 0.5) + 
        (othersEmotionImpact * 0.3) + 
        (conversationToneImpact * 0.2)
      ) * this.emotionalResponsiveness;
      
      // Apply emotional modifier to bid strength
      bidStrength = Math.max(0, Math.min(1, this.baseStrength + emotionalModifier));
    } else {
      // Fallback to basic emotion detection from message content
      bidStrength = this.calculateBasicEmotionalBid(dialogueState, participantId);
    }
    
    // Prepare detailed reason
    let reason = "Emotion-based bidding";
    
    if (extendedContext.emotionalState) {
      reason = `Emotion-based bidding (own: ${ownEmotionImpact.toFixed(2)}, others: ${othersEmotionImpact.toFixed(2)}, tone: ${conversationToneImpact.toFixed(2)})`;
    }
    
    return {
      participantId,
      strength: bidStrength,
      reason,
      metadata: {
        ownEmotionImpact,
        othersEmotionImpact,
        conversationToneImpact
      }
    };
  }
  
  /**
   * Calculate impact of participant's own emotional state on bidding
   * 
   * @param emotionalState - Emotional state of the participant
   * @returns Impact value (-0.4 to 0.4 typically)
   */
  private calculateOwnEmotionImpact(emotionalState: EmotionalState): number {
    // High arousal (excitement, anger) tends to increase desire to speak
    // Positive valence (happiness) slightly increases desire to speak
    // Negative valence (sadness, anger) has mixed effects depending on arousal
    
    const { valence, arousal } = emotionalState;
    
    // Arousal has strong impact on desire to speak
    const arousalImpact = (arousal - 0.5) * 0.6; // -0.3 to +0.3
    
    // Valence has more nuanced impact
    let valenceImpact = 0;
    
    if (valence > 0) {
      // Positive emotions generally increase desire to speak
      valenceImpact = valence * 0.3; // 0 to +0.3
    } else if (valence < 0 && arousal > 0.7) {
      // High arousal negative emotions (anger) increase desire to speak
      valenceImpact = Math.abs(valence) * 0.2; // 0 to +0.2
    } else if (valence < 0) {
      // Low arousal negative emotions (sadness) decrease desire to speak
      valenceImpact = valence * 0.2; // -0.2 to 0
    }
    
    return arousalImpact + valenceImpact;
  }
  
  /**
   * Calculate impact of other participants' emotional states
   * 
   * @param otherEmotions - Emotional states of other participants
   * @param participantId - ID of the participant making the bid
   * @returns Impact value (-0.3 to 0.3 typically)
   */
  private calculateOthersEmotionImpact(
    otherEmotions: Record<string, EmotionalState>,
    participantId: string
  ): number {
    // If no other emotions are available, no impact
    if (Object.keys(otherEmotions).length === 0) {
      return 0;
    }
    
    // Calculate average valence and arousal
    let totalValence = 0;
    let totalArousal = 0;
    let count = 0;
    
    for (const [id, emotion] of Object.entries(otherEmotions)) {
      if (id !== participantId) {
        totalValence += emotion.valence;
        totalArousal += emotion.arousal;
        count++;
      }
    }
    
    // If no other participants' emotions, no impact
    if (count === 0) {
      return 0;
    }
    
    const avgValence = totalValence / count;
    const avgArousal = totalArousal / count;
    
    // Calculate impact:
    // - High negative emotions with high arousal (anger) might increase desire to calm/moderate
    // - High negative emotions with low arousal (sadness) might increase desire to support
    // - High positive emotions might decrease urgency to speak (things are going well)
    
    let impact = 0;
    
    if (avgValence < -0.3 && avgArousal > 0.6) {
      // Others are angry/upset - increased desire to moderate
      impact = 0.3;
    } else if (avgValence < -0.3 && avgArousal < 0.4) {
      // Others are sad/disappointed - increased desire to support
      impact = 0.2;
    } else if (avgValence > 0.3 && avgArousal > 0.6) {
      // Others are excited/happy - mixed effect
      impact = 0.1;
    } else if (avgValence > 0.3 && avgArousal < 0.4) {
      // Others are content/satisfied - decreased urgency
      impact = -0.1;
    }
    
    return impact;
  }
  
  /**
   * Calculate impact of overall conversation tone
   * 
   * @param dialogueState - Current dialogue state
   * @returns Impact value (-0.2 to 0.2 typically)
   */
  private calculateConversationToneImpact(dialogueState: DialogueState): number {
    // Analyze recent messages for overall tone
    const recentMessages = dialogueState.messages.slice(-5);
    
    if (recentMessages.length === 0) {
      return 0;
    }
    
    // Simple keyword-based tone analysis
    // In a real implementation, this would use sentiment analysis
    const positiveKeywords = [
      "agree", "good", "great", "excellent", "happy",
      "interesting", "positive", "helpful", "like", "appreciate"
    ];
    
    const negativeKeywords = [
      "disagree", "bad", "wrong", "mistake", "sad",
      "difficult", "negative", "unhelpful", "dislike", "concerned"
    ];
    
    const contentionKeywords = [
      "but", "however", "actually", "disagree", "incorrect",
      "wrong", "no", "not", "oppose", "contrary"
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    let contentionCount = 0;
    
    for (const message of recentMessages) {
      const content = message.content.toLowerCase();
      
      for (const keyword of positiveKeywords) {
        if (content.includes(keyword)) {
          positiveCount++;
        }
      }
      
      for (const keyword of negativeKeywords) {
        if (content.includes(keyword)) {
          negativeCount++;
        }
      }
      
      for (const keyword of contentionKeywords) {
        if (content.includes(keyword)) {
          contentionCount++;
        }
      }
    }
    
    // Calculate tone impact
    let impact = 0;
    
    // High contention increases desire to speak (to mediate)
    if (contentionCount > 3) {
      impact += 0.2;
    }
    
    // Strong negative tone increases desire to speak (to support/help)
    if (negativeCount > positiveCount && negativeCount > 3) {
      impact += 0.1;
    }
    
    // Strong positive tone slightly decreases urgency
    if (positiveCount > negativeCount && positiveCount > 3) {
      impact -= 0.1;
    }
    
    return impact;
  }
  
  /**
   * Calculate basic emotional bid without detailed emotional state info
   * 
   * @param dialogueState - Current dialogue state
   * @param participantId - ID of the participant making the bid
   * @returns Basic emotional bid strength (0.0 to 1.0)
   */
  private calculateBasicEmotionalBid(
    dialogueState: DialogueState,
    participantId: string
  ): number {
    // Simple implementation for when emotional state isn't available
    // Check recent messages for emotional content
    const recentMessages = dialogueState.messages.slice(-3);
    
    if (recentMessages.length === 0) {
      return this.baseStrength;
    }
    
    // Simple keyword-based emotion detection
    const emotionalKeywords = [
      "happy", "sad", "angry", "excited", "worried",
      "concerned", "frustrated", "love", "hate", "afraid",
      "anxious", "tired", "confused", "sorry", "proud"
    ];
    
    let emotionalContent = 0;
    
    for (const message of recentMessages) {
      if (message.participantId !== participantId) {
        const content = message.content.toLowerCase();
        
        for (const keyword of emotionalKeywords) {
          if (content.includes(keyword)) {
            emotionalContent++;
          }
        }
      }
    }
    
    // Adjust bid based on emotional content
    if (emotionalContent > 3) {
      // High emotional content - increase bid to respond
      return Math.min(1, this.baseStrength + 0.2);
    } else if (emotionalContent > 0) {
      // Some emotional content - slight increase
      return Math.min(1, this.baseStrength + 0.1);
    }
    
    return this.baseStrength;
  }
}

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
    
    // Calculate opposition factor based on conversation dominance
    if (opposingCoalitionMessages >= 3) {
      // Opposing coalition is dominating - increase bid to counter
      return 0.3;
    } else if (opposingCoalitionMessages >= 2) {
      // Opposing coalition has significant presence - slightly increase bid
      return 0.2;
    } else if (opposingCoalitionMessages >= 1) {
      // Opposing coalition is active - minimal increase
      return 0.1;
    }
    
    // Opposing coalition is not recently active
    return 0;
  }
}
