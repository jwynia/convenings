/**
 * Motivated Dialogue Participant Implementation
 * Enhanced participant class with motivation-driven behavior
 */

import { IAgent } from "../../utils/interfaces.ts";
import { DialogueParticipant, DialogueParticipantConfig } from "./dialogue_participant.ts";
import { DialogueState } from "../workflows/dialogue_workflow.ts";
import { 
  IBiddingStrategy, 
  BiddingStrategyFactory, 
  MotivationBiddingStrategy,
  Bid
} from "./bidding/mod.ts";

/**
 * Configuration for a motivated dialogue participant
 */
export interface MotivatedDialogueParticipantConfig extends DialogueParticipantConfig {
  /**
   * Primary motivation type for the participant
   * Examples: "truth-seeking", "consensus-seeking", "competitive", etc.
   */
  primaryMotivation?: string;
  
  /**
   * Secondary motivation types with their strengths
   */
  secondaryMotivations?: Record<string, number>;
  
  /**
   * Whether to adapt motivations based on dialogue context
   * Default: true
   */
  adaptiveMotivations?: boolean;
  
  /**
   * Weight of the motivation-based bidding in the overall bidding strategy
   * Default: 0.6
   */
  motivationBiddingWeight?: number;
}

/**
 * Motivated dialogue participant with enhanced behavioral capabilities
 */
export class MotivatedDialogueParticipant extends DialogueParticipant {
  /**
   * Primary motivation type for the participant
   */
  readonly primaryMotivation?: string;
  
  /**
   * Whether to adapt motivations based on dialogue context
   */
  readonly adaptiveMotivations: boolean;
  
  /**
   * Initial motivations to restore when resetting
   */
  private initialMotivations: Record<string, number>;
  
  /**
   * Emotional state tracking
   */
  private emotionalState: Record<string, number> = {
    interest: 0.5,
    agreement: 0.5,
    engagement: 0.5,
    frustration: 0.0,
  };
  
  /**
   * Create a new motivated dialogue participant
   * 
   * @param config - Configuration for the participant
   * @param agent - Agent implementation (optional)
   */
  constructor(
    config: MotivatedDialogueParticipantConfig,
    agent?: IAgent
  ) {
    // Convert configuration
    const baseConfig: DialogueParticipantConfig = {
      ...config,
    };
    
    // Set up motivations
    const motivations: Record<string, number> = {
      ...(config.secondaryMotivations || {}),
    };
    
    // Add primary motivation if specified
    if (config.primaryMotivation) {
      motivations[config.primaryMotivation] = 1.0;
    }
    
    // Override with explicitly provided motivations
    if (config.motivations) {
      Object.assign(motivations, config.motivations);
    }
    
    baseConfig.motivations = motivations;
    
    // Create base participant
    super(baseConfig, agent);
    
    // Store additional properties
    this.primaryMotivation = config.primaryMotivation;
    this.adaptiveMotivations = config.adaptiveMotivations ?? true;
    this.initialMotivations = { ...motivations };
    
    // Override bidding strategy with a motivation-focused one if not explicitly provided
    if (!config.biddingStrategy) {
      const motivationBiddingWeight = config.motivationBiddingWeight ?? 0.6;
      
      this.biddingStrategy = BiddingStrategyFactory.createCombinedStrategy([
        {
          strategy: BiddingStrategyFactory.createMotivationStrategy(0.7),
          weight: motivationBiddingWeight,
        },
        {
          strategy: BiddingStrategyFactory.createTurnTakingStrategy(0.5),
          weight: 1 - motivationBiddingWeight,
        },
      ]);
    }
  }
  
  /**
   * Calculate a bid for the participant's turn with motivation adjustment
   * 
   * @param dialogueState - Current state of the dialogue
   * @returns The calculated bid
   */
  async calculateBid(dialogueState: DialogueState): Promise<Bid> {
    // Update motivations and emotional state based on dialogue context
    if (this.adaptiveMotivations) {
      this.updateMotivationsFromContext(dialogueState);
      this.updateEmotionalState(dialogueState);
    }
    
    // Calculate bid with enhanced context
    const context = {
      dialogueState,
      participantId: this.id,
      context: {
        motivations: this.motivations,
        dialogueStyle: this.dialogueStyle,
        role: this.role,
        emotionalState: this.emotionalState,
        primaryMotivation: this.primaryMotivation,
      },
    };
    
    return this.biddingStrategy.calculateBid(context);
  }
  
  /**
   * Generate a response for the participant's turn with motivation influence
   * 
   * @param prompt - Prompt for the participant
   * @returns The participant's response
   */
  async generateResponse(prompt: string): Promise<string> {
    // Enhance prompt with motivation information
    const enhancedPrompt = this.enhancePromptWithMotivations(prompt);
    
    // Generate response using the agent
    return this.agent.execute(enhancedPrompt);
  }
  
  /**
   * Reset motivations to their initial state
   */
  resetMotivations(): void {
    this.motivations = { ...this.initialMotivations };
    this.emotionalState = {
      interest: 0.5,
      agreement: 0.5,
      engagement: 0.5,
      frustration: 0.0,
    };
  }
  
  /**
   * Update motivations based on dialogue context
   * 
   * @param dialogueState - Current state of the dialogue
   */
  private updateMotivationsFromContext(dialogueState: DialogueState): void {
    // This is a simplified implementation
    // In a real system, this would analyze dialogue history and context
    // to dynamically adjust motivations based on the conversation flow
    
    const recentMessages = dialogueState.messages.slice(-3);
    
    // Simple example adjustments:
    
    // Increase consensus-seeking motivation if there's disagreement
    if (this.hasMotivation("consensus-seeking") && this.detectDisagreement(recentMessages)) {
      this.adjustMotivation("consensus-seeking", 0.1);
    }
    
    // Increase truth-seeking motivation if factual topics are discussed
    if (this.hasMotivation("truth-seeking") && this.detectFactualDiscussion(recentMessages)) {
      this.adjustMotivation("truth-seeking", 0.1);
    }
    
    // Increase competitive motivation if challenged
    if (this.hasMotivation("competitive") && this.detectChallenge(recentMessages)) {
      this.adjustMotivation("competitive", 0.15);
    }
  }
  
  /**
   * Update emotional state based on dialogue context
   * 
   * @param dialogueState - Current state of the dialogue
   */
  private updateEmotionalState(dialogueState: DialogueState): void {
    // Similar to motivation updates, this is a simplified implementation
    const recentMessages = dialogueState.messages.slice(-3);
    
    // Adjust interest based on topic relevance
    this.emotionalState.interest = Math.min(
      1.0, 
      this.emotionalState.interest + (this.detectTopicRelevance(dialogueState.topic) ? 0.1 : -0.05)
    );
    
    // Adjust agreement based on recent messages
    this.emotionalState.agreement = Math.min(
      1.0,
      this.emotionalState.agreement + (this.detectAgreement(recentMessages) ? 0.1 : -0.05)
    );
    
    // Adjust engagement based on dialogue progress
    const engagementFactor = dialogueState.currentTurn < 10 ? 0.05 : -0.05;
    this.emotionalState.engagement = Math.max(
      0.1,
      Math.min(1.0, this.emotionalState.engagement + engagementFactor)
    );
    
    // Adjust frustration based on repeated disagreements
    if (this.detectRepeatedDisagreement(dialogueState.messages)) {
      this.emotionalState.frustration = Math.min(
        1.0, 
        this.emotionalState.frustration + 0.15
      );
    } else {
      this.emotionalState.frustration = Math.max(
        0.0, 
        this.emotionalState.frustration - 0.05
      );
    }
  }
  
  /**
   * Enhance a prompt with motivation information
   * 
   * @param prompt - Base prompt
   * @returns Enhanced prompt with motivation context
   */
  private enhancePromptWithMotivations(prompt: string): string {
    // Get top motivations
    const sortedMotivations = Object.entries(this.motivations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // Create motivation guidance
    const motivationGuidance = sortedMotivations
      .map(([motivation, strength]) => {
        const strengthDesc = 
          strength > 0.8 ? "strongly" :
          strength > 0.5 ? "moderately" :
          "somewhat";
        
        return `You are ${strengthDesc} motivated by ${motivation}.`;
      })
      .join(" ");
    
    // Create emotional state guidance
    const emotionalGuidance = [];
    
    if (this.emotionalState.interest > 0.7) {
      emotionalGuidance.push("You are very interested in this topic.");
    }
    
    if (this.emotionalState.agreement < 0.3) {
      emotionalGuidance.push("You find yourself disagreeing with much of what has been said.");
    } else if (this.emotionalState.agreement > 0.7) {
      emotionalGuidance.push("You find yourself agreeing with much of what has been said.");
    }
    
    if (this.emotionalState.frustration > 0.7) {
      emotionalGuidance.push("You are feeling frustrated with the lack of progress.");
    }
    
    if (this.emotionalState.engagement < 0.3) {
      emotionalGuidance.push("Your engagement with this conversation is waning.");
    } else if (this.emotionalState.engagement > 0.7) {
      emotionalGuidance.push("You are deeply engaged in this conversation.");
    }
    
    // Combine guidance
    const guidance = [
      motivationGuidance,
      ...emotionalGuidance
    ].filter(Boolean).join(" ");
    
    // Combine with prompt
    return [
      "Here is information about your motivations and state:",
      guidance,
      "",
      prompt
    ].join("\n");
  }
  
  /**
   * Check if the participant has a specific motivation
   * 
   * @param motivation - Motivation to check
   * @returns Whether the participant has the motivation
   */
  private hasMotivation(motivation: string): boolean {
    return !!this.motivations[motivation];
  }
  
  /**
   * Adjust a motivation's strength
   * 
   * @param motivation - Motivation to adjust
   * @param amount - Amount to adjust by (positive or negative)
   */
  private adjustMotivation(motivation: string, amount: number): void {
    if (!this.motivations[motivation]) {
      this.motivations[motivation] = Math.max(0, Math.min(1, amount));
    } else {
      this.motivations[motivation] = Math.max(
        0,
        Math.min(1, this.motivations[motivation] + amount)
      );
    }
  }
  
  /**
   * Detect disagreement in messages
   * 
   * @param messages - Messages to analyze
   * @returns Whether disagreement was detected
   */
  private detectDisagreement(messages: Array<{content: string}>): boolean {
    const disagreementTerms = [
      "disagree", "not true", "incorrect", "i don't think",
      "no, ", "actually,", "on the contrary", "i disagree"
    ];
    
    return messages.some(msg => 
      disagreementTerms.some(term => 
        msg.content.toLowerCase().includes(term)
      )
    );
  }
  
  /**
   * Detect repeated disagreement in messages
   * 
   * @param messages - Messages to analyze
   * @returns Whether repeated disagreement was detected
   */
  private detectRepeatedDisagreement(messages: Array<{content: string}>): boolean {
    // Simplified implementation - count disagreements in recent messages
    const disagreementTerms = [
      "disagree", "not true", "incorrect", "i don't think",
      "no, ", "actually,", "on the contrary", "i disagree"
    ];
    
    const recentMessages = messages.slice(-5);
    let disagreementCount = 0;
    
    for (const msg of recentMessages) {
      if (disagreementTerms.some(term => 
        msg.content.toLowerCase().includes(term)
      )) {
        disagreementCount++;
      }
    }
    
    return disagreementCount >= 2;
  }
  
  /**
   * Detect factual discussion in messages
   * 
   * @param messages - Messages to analyze
   * @returns Whether factual discussion was detected
   */
  private detectFactualDiscussion(messages: Array<{content: string}>): boolean {
    const factualTerms = [
      "fact", "evidence", "study", "research", "according to",
      "statistics", "data", "proven", "scientific", "percentage"
    ];
    
    return messages.some(msg => 
      factualTerms.some(term => 
        msg.content.toLowerCase().includes(term)
      )
    );
  }
  
  /**
   * Detect challenges in messages
   * 
   * @param messages - Messages to analyze
   * @returns Whether a challenge was detected
   */
  private detectChallenge(messages: Array<{content: string}>): boolean {
    const challengeTerms = [
      "prove", "why do you", "how can you", "i challenge", 
      "defend", "justify", "explain why", "evidence for"
    ];
    
    return messages.some(msg => 
      challengeTerms.some(term => 
        msg.content.toLowerCase().includes(term)
      )
    );
  }
  
  /**
   * Detect agreement in messages
   * 
   * @param messages - Messages to analyze
   * @returns Whether agreement was detected
   */
  private detectAgreement(messages: Array<{content: string}>): boolean {
    const agreementTerms = [
      "agree", "good point", "exactly", "that's right", 
      "you're right", "i concur", "precisely", "indeed"
    ];
    
    return messages.some(msg => 
      agreementTerms.some(term => 
        msg.content.toLowerCase().includes(term)
      )
    );
  }
  
  /**
   * Detect topic relevance to motivations
   * 
   * @param topic - Current topic
   * @returns Whether the topic is relevant to motivations
   */
  private detectTopicRelevance(topic: string): boolean {
    // In a real implementation, this would use more sophisticated analysis
    const topicLower = topic.toLowerCase();
    
    for (const motivation of Object.keys(this.motivations)) {
      if (topicLower.includes(motivation.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }
}

/**
 * Create a new motivated dialogue participant
 * 
 * @param config - Configuration for the participant
 * @param agent - Agent implementation (optional)
 * @returns New motivated dialogue participant
 */
export function createMotivatedDialogueParticipant(
  config: MotivatedDialogueParticipantConfig,
  agent?: IAgent
): MotivatedDialogueParticipant {
  return new MotivatedDialogueParticipant(config, agent);
}

/**
 * Create a truth-seeking dialogue participant
 * 
 * @param config - Base configuration for the participant
 * @param agent - Agent implementation (optional)
 * @returns New truth-seeking dialogue participant
 */
export function createTruthSeekingParticipant(
  config: Omit<MotivatedDialogueParticipantConfig, "primaryMotivation">,
  agent?: IAgent
): MotivatedDialogueParticipant {
  return new MotivatedDialogueParticipant({
    ...config,
    primaryMotivation: "truth-seeking",
  }, agent);
}

/**
 * Create a consensus-seeking dialogue participant
 * 
 * @param config - Base configuration for the participant
 * @param agent - Agent implementation (optional)
 * @returns New consensus-seeking dialogue participant
 */
export function createConsensusSeekingParticipant(
  config: Omit<MotivatedDialogueParticipantConfig, "primaryMotivation">,
  agent?: IAgent
): MotivatedDialogueParticipant {
  return new MotivatedDialogueParticipant({
    ...config,
    primaryMotivation: "consensus-seeking",
  }, agent);
}
