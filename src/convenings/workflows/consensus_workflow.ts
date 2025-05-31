/**
 * Consensus Workflow Implementation
 * Specialized workflow for consensus-seeking dialogues
 */

import { 
  DialogueWorkflow, 
  DialogueParticipant, 
  DialogueWorkflowConfig,
  DialogueWorkflowResult,
  DialogueState
} from "./dialogue_workflow.ts";

/**
 * Point of consensus in a dialogue
 */
export interface ConsensusPoint {
  /**
   * Description of the consensus point
   */
  description: string;
  
  /**
   * Confidence level in this consensus (0.0 to 1.0)
   */
  confidence: number;
  
  /**
   * IDs of participants who support this consensus
   */
  supportingParticipants: string[];
  
  /**
   * Turn at which this consensus was identified
   */
  identifiedAtTurn: number;
}

/**
 * Configuration for a consensus workflow
 */
export interface ConsensusWorkflowConfig extends DialogueWorkflowConfig {
  /**
   * Threshold for considering a point as consensus (0.0 to 1.0)
   * Default: 0.8 (80% agreement)
   */
  consensusThreshold?: number;
  
  /**
   * Number of stable turns required to finalize consensus
   * Default: 3
   */
  requiredStableTurns?: number;
  
  /**
   * System prompt template for consensus-seeking dialogues
   */
  consensusPromptTemplate?: string;
  
  /**
   * Whether to explicitly prompt participants to work toward consensus
   * Default: true
   */
  explicitConsensusGuide?: boolean;
}

/**
 * Result of a consensus workflow with consensus-specific information
 */
export interface ConsensusWorkflowResult extends DialogueWorkflowResult {
  /**
   * Points of consensus reached during the dialogue
   */
  consensusPoints: ConsensusPoint[];
  
  /**
   * Overall consensus level achieved (0.0 to 1.0)
   */
  consensusLevel: number;
  
  /**
   * Number of turns required to reach consensus
   */
  turnsToConsensus: number;
  
  /**
   * Whether consensus was successfully reached
   */
  consensusReached: boolean;
}

/**
 * Specialized workflow for consensus-seeking dialogues
 */
export class ConsensusWorkflow extends DialogueWorkflow {
  private consensusConfig: Required<ConsensusWorkflowConfig>;
  private consensusPoints: ConsensusPoint[] = [];
  private stableConsensusCount = 0;
  
  /**
   * Create a new consensus workflow
   * 
   * @param topic - Topic for the dialogue
   * @param participants - Participants in the dialogue
   * @param config - Configuration for the consensus dialogue
   */
  constructor(
    topic: string,
    participants: DialogueParticipant[],
    config: ConsensusWorkflowConfig = {}
  ) {
    // Set up consensus-specific defaults
    const consensusPromptTemplate = config.consensusPromptTemplate ?? 
      "This is a consensus-seeking dialogue about {topic} between {participantNames}. " +
      "The goal is to reach agreement on key points related to the topic. " +
      "Each participant should express their views clearly, listen to others, " +
      "and work toward finding common ground whenever possible.";
    
    // Create the base workflow with consensus settings
    super(topic, participants, {
      ...config,
      systemPromptTemplate: consensusPromptTemplate,
      // Add custom exit condition for consensus
      exitCondition: (state: DialogueState) => this.checkConsensusReached(state),
    });
    
    // Store consensus-specific configuration
    this.consensusConfig = {
      consensusThreshold: config.consensusThreshold ?? 0.8,
      requiredStableTurns: config.requiredStableTurns ?? 3,
      consensusPromptTemplate: consensusPromptTemplate,
      explicitConsensusGuide: config.explicitConsensusGuide ?? true,
      ...config as Required<DialogueWorkflowConfig>,
    };
  }
  
  /**
   * Run the consensus dialogue to completion
   * 
   * @returns Result of the consensus dialogue
   */
  async run(): Promise<ConsensusWorkflowResult> {
    // Run the dialogue using the base implementation
    const baseResult = await super.run();
    
    // Calculate consensus metrics
    const consensusLevel = this.calculateOverallConsensus();
    const consensusReached = consensusLevel >= this.consensusConfig.consensusThreshold;
    
    // Return consensus-specific result
    return {
      ...baseResult,
      consensusPoints: this.consensusPoints,
      consensusLevel,
      turnsToConsensus: consensusReached ? baseResult.messages.length : -1,
      consensusReached,
    };
  }
  
  /**
   * Check if consensus has been reached based on the dialogue state
   * 
   * @param state - Current state of the dialogue
   * @returns Whether consensus has been reached
   */
  private checkConsensusReached(state: DialogueState): boolean {
    // Skip consensus check if we don't have enough messages
    if (state.messages.length < state.participants.length * 2) {
      return false;
    }
    
    // Analyze recent messages for consensus
    this.updateConsensusPoints(state);
    
    // Calculate current consensus level
    const currentConsensus = this.calculateOverallConsensus();
    
    // Check if we've reached the consensus threshold
    if (currentConsensus >= this.consensusConfig.consensusThreshold) {
      // Increment stable consensus counter
      this.stableConsensusCount++;
      
      // Check if we've had stable consensus for enough turns
      return this.stableConsensusCount >= this.consensusConfig.requiredStableTurns;
    } else {
      // Reset stable consensus counter
      this.stableConsensusCount = 0;
      return false;
    }
  }
  
  /**
   * Update consensus points based on dialogue state
   * 
   * @param state - Current state of the dialogue
   */
  private updateConsensusPoints(state: DialogueState): void {
    // In a real implementation, this would use advanced NLP to identify points of consensus
    // For this implementation, we'll use a simplified approach
    
    // For demonstration purposes, we'll consider consensus if the same keyword appears
    // in messages from different participants
    
    // Get recent messages (last complete round of discussion)
    const recentMessages = state.messages.slice(-state.participants.length);
    
    // Extract keywords from recent messages
    // This is a simplified approach - in a real implementation, use NLP
    const keywords = new Map<string, Set<string>>();
    
    for (const message of recentMessages) {
      // Simple keyword extraction (words with 5+ characters)
      // In a real implementation, use proper keyword extraction
      const extractedKeywords = message.content
        .toLowerCase()
        .split(/\W+/)
        .filter(word => word.length >= 5);
      
      // Record which participant mentioned each keyword
      for (const keyword of extractedKeywords) {
        if (!keywords.has(keyword)) {
          keywords.set(keyword, new Set<string>());
        }
        keywords.get(keyword)!.add(message.participantId);
      }
    }
    
    // Check for keywords mentioned by most or all participants
    for (const [keyword, participants] of keywords.entries()) {
      // Calculate agreement level for this keyword
      const agreementLevel = participants.size / state.participants.length;
      
      // Check if this meets our threshold
      if (agreementLevel >= this.consensusConfig.consensusThreshold) {
        // Check if we already have this consensus point
        const existingPoint = this.consensusPoints.find(point => 
          point.description.toLowerCase().includes(keyword)
        );
        
        if (existingPoint) {
          // Update existing consensus point
          existingPoint.confidence = Math.max(existingPoint.confidence, agreementLevel);
          // Add any new supporting participants
          for (const participant of participants) {
            if (!existingPoint.supportingParticipants.includes(participant)) {
              existingPoint.supportingParticipants.push(participant);
            }
          }
        } else {
          // Create new consensus point
          this.consensusPoints.push({
            description: `Agreement on ${keyword}`,
            confidence: agreementLevel,
            supportingParticipants: Array.from(participants),
            identifiedAtTurn: state.currentTurn,
          });
        }
      }
    }
  }
  
  /**
   * Calculate the overall consensus level based on consensus points
   * 
   * @returns Overall consensus level (0.0 to 1.0)
   */
  private calculateOverallConsensus(): number {
    if (this.consensusPoints.length === 0) {
      return 0;
    }
    
    // Calculate weighted average of consensus point confidences
    const totalConfidence = this.consensusPoints.reduce(
      (sum, point) => sum + point.confidence, 
      0
    );
    
    return totalConfidence / this.consensusPoints.length;
  }
}

/**
 * Create a new consensus workflow
 * 
 * @param topic - Topic for the dialogue
 * @param participants - Participants in the dialogue
 * @param config - Configuration for the consensus dialogue
 * @returns New consensus workflow
 */
export function createConsensusWorkflow(
  topic: string,
  participants: DialogueParticipant[],
  config?: ConsensusWorkflowConfig
): ConsensusWorkflow {
  return new ConsensusWorkflow(topic, participants, config);
}
