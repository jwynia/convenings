/**
 * Contextual Participant Implementation
 * 
 * A concrete implementation of MotivatedDialogueParticipant that adapts
 * its behavior based on conversation context and its motivations.
 */

import { IStringUtils } from "../../../utils/mod.ts";
import { 
  MotivatedDialogueParticipant, 
  MotivatedDialogueParticipantConfig 
} from "./motivated_participant.ts";
import { 
  DialogueContext, 
  DialogueTurn 
} from "./interfaces.ts";

/**
 * Extended configuration for contextual participants
 */
export interface ContextualParticipantConfig extends MotivatedDialogueParticipantConfig {
  /**
   * How much to adapt to conversation context (0-1)
   */
  adaptability?: number;
  
  /**
   * How verbose responses should be (0-1)
   */
  verbosity?: number;
  
  /**
   * Custom response templates
   */
  responseTemplates?: {
    /**
     * Template for high consensus-seeking motivation
     */
    consensusSeeking?: string;
    
    /**
     * Template for high truth-seeking motivation
     */
    truthSeeking?: string;
    
    /**
     * Template for balanced motivation state
     */
    balanced?: string;
    
    /**
     * Template for when no strong motivations present
     */
    neutral?: string;
  };
}

/**
 * Default response templates for different motivation states
 */
const DEFAULT_RESPONSE_TEMPLATES = {
  consensusSeeking: "I see some different viewpoints here. Perhaps we can find common ground on {topic}?",
  truthSeeking: "That's an interesting claim about {topic}. Could you share more evidence to support that?",
  balanced: "I understand what you're saying about {topic}. Let me offer a perspective that considers both accuracy and agreement.",
  neutral: "I've been following the discussion on {topic} and have some thoughts to share."
};

/**
 * A concrete implementation of MotivatedDialogueParticipant that adapts
 * its responses based on its active motivations and conversation context.
 */
export class ContextualParticipant extends MotivatedDialogueParticipant {
  /**
   * How much the participant adapts to conversation context
   */
  private adaptability: number;
  
  /**
   * How verbose the participant's responses are
   */
  private verbosity: number;
  
  /**
   * Custom response templates for different motivation states
   */
  private responseTemplates: {
    consensusSeeking: string;
    truthSeeking: string;
    balanced: string;
    neutral: string;
  };
  
  /**
   * Create a new contextual participant
   * 
   * @param config - Configuration for the participant
   * @param stringUtils - String utilities implementation
   */
  constructor(
    config: ContextualParticipantConfig,
    stringUtils: IStringUtils
  ) {
    super(config, stringUtils);
    
    this.adaptability = config.adaptability ?? 0.7;
    this.verbosity = config.verbosity ?? 0.5;
    
    // Use provided templates or defaults
    this.responseTemplates = {
      consensusSeeking: config.responseTemplates?.consensusSeeking ?? DEFAULT_RESPONSE_TEMPLATES.consensusSeeking,
      truthSeeking: config.responseTemplates?.truthSeeking ?? DEFAULT_RESPONSE_TEMPLATES.truthSeeking,
      balanced: config.responseTemplates?.balanced ?? DEFAULT_RESPONSE_TEMPLATES.balanced,
      neutral: config.responseTemplates?.neutral ?? DEFAULT_RESPONSE_TEMPLATES.neutral
    };
  }
  
  /**
   * Execute a dialogue turn with contextual awareness of motivations
   * 
   * @param input - The input message
   * @returns The participant's response
   */
  async execute(input: string): Promise<string> {
    try {
      // For special commands, use the parent implementation
      if (
        input.toLowerCase().includes("hello") ||
        input.toLowerCase().includes("hi") ||
        input.toLowerCase().includes("bye") ||
        input.toLowerCase().includes("goodbye")
      ) {
        return super.execute(input);
      }
      
      // Create a minimal dialogue context for motivation processing
      const context: DialogueContext = {
        history: [
          {
            participantId: 'user', // Assuming input is from a user
            message: input,
            timestamp: Date.now()
          }
        ],
        topics: this.extractTopics(input),
        participants: [this], // Just this participant for simplicity
        metadata: {}
      };
      
      // Determine which motivation is currently most active
      const dominantMotivation = await this.determineDominantMotivation(context);
      
      // Generate a response based on the dominant motivation
      const response = this.generateContextualResponse(input, dominantMotivation);
      
      // Create a dialogue turn to update motivation states
      const turn: DialogueTurn = {
        participantId: 'user',
        message: input,
        timestamp: Date.now()
      };
      
      // Update motivation states based on the input
      await this.updateMotivationStates(turn, context);
      
      // Return the response, respecting max length
      return this.stringUtils.truncateString(response, this.maxResponseLength);
    } catch (error) {
      // Return error message if something goes wrong
      return this.templates.error;
    }
  }
  
  /**
   * Generate a response based on the dominant motivation
   * 
   * @param input - User input
   * @param dominantMotivation - The currently dominant motivation
   * @returns Generated response
   */
  protected generateContextualResponse(
    input: string, 
    dominantMotivation: string | null
  ): string {
    // Extract the topic from the input
    const topic = this.extractPrimaryTopic(input);
    
    // Select template based on dominant motivation
    let template: string;
    
    switch (dominantMotivation) {
      case "consensus-seeking":
        template = this.responseTemplates.consensusSeeking;
        break;
        
      case "truth-seeking":
        template = this.responseTemplates.truthSeeking;
        break;
        
      case "balanced":
        template = this.responseTemplates.balanced;
        break;
        
      default:
        // Use style-based response if no strong motivation
        return super.generateResponse(input);
    }
    
    // Format template with topic
    return this.stringUtils.formatString(template, { topic });
  }
  
  /**
   * Determine which motivation is currently dominant
   * 
   * @param context - Current dialogue context
   * @returns ID of dominant motivation, "balanced" for multiple strong ones, or null for none
   */
  private async determineDominantMotivation(
    context: DialogueContext
  ): Promise<string | null> {
    // If no motivations, return null
    if (this.motivations.length === 0) {
      return null;
    }
    
    // Calculate desire values for each motivation
    const desires = await Promise.all(
      this.motivations.map(async ({ motivation }) => {
        const state = this.motivationStates.get(motivation.id)!;
        const desire = await motivation.calculateDesire(this, state, context);
        return { 
          id: motivation.id, 
          desire: desire, 
          weight: this.getMotivationWeight(motivation.id) 
        };
      })
    );
    
    // Find the strongest motivations (those with desire > 0.6)
    const strongMotivations = desires.filter(d => d.desire > 0.6);
    
    // If multiple strong motivations, return "balanced"
    if (strongMotivations.length > 1) {
      return "balanced";
    }
    
    // If one strong motivation, return its ID
    if (strongMotivations.length === 1) {
      return strongMotivations[0].id;
    }
    
    // Otherwise, find the motivation with the highest desire
    const strongest = desires.reduce(
      (prev, current) => (current.desire > prev.desire) ? current : prev,
      { id: null, desire: 0, weight: 0 }
    );
    
    // Only return it if desire is at least moderate (> 0.4)
    return strongest.desire > 0.4 ? strongest.id : null;
  }
  
  /**
   * Extract topics from a message
   * 
   * @param message - Message to extract topics from
   * @returns Array of detected topics
   */
  private extractTopics(message: string): string[] {
    // Simple topic extraction (more sophisticated in a real implementation)
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
   * Extract the primary topic from a message
   * 
   * @param message - Message to extract topic from
   * @returns Most significant topic or fallback string
   */
  private extractPrimaryTopic(message: string): string {
    const topics = this.extractTopics(message);
    
    if (topics.length === 0) {
      // If no topics found, extract the most significant words
      const words = message.split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !["what", "when", "where", "which", "this", "that", "these", "those", "with"].includes(word.toLowerCase()));
      
      if (words.length > 0) {
        return words[Math.floor(words.length / 2)]; // Choose word from middle
      }
      
      return "this topic"; // Fallback
    }
    
    // Return the first topic if available
    return topics[0];
  }
}

/**
 * Create a contextual participant with the specified configuration
 * 
 * @param config - Configuration for the contextual participant
 * @param stringUtils - Optional string utilities implementation
 * @returns A new ContextualParticipant instance
 */
export function createContextualParticipant(
  config: ContextualParticipantConfig,
  stringUtils?: IStringUtils
): ContextualParticipant {
  return new ContextualParticipant(config, stringUtils);
}
