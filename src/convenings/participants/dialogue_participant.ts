/**
 * Dialogue Participant Implementation
 * Core participant class for multi-agent dialogues
 */

import { IAgent, IAgentConfig } from "../../utils/interfaces.ts";
import { 
  IBiddingStrategy,
  BiddingStrategyFactory,
  Bid,
  BidContext
} from "./bidding/mod.ts";
import { DialogueState } from "../workflows/dialogue_workflow.ts";

/**
 * Configuration for a dialogue participant
 */
export interface DialogueParticipantConfig {
  /**
   * Unique identifier for the participant
   * If not provided, a random UUID will be generated
   */
  id?: string;
  
  /**
   * Display name for the participant
   */
  name: string;
  
  /**
   * Agent configuration for the participant
   */
  agentConfig: IAgentConfig;
  
  /**
   * Role of the participant in dialogues
   */
  role?: string;
  
  /**
   * Dialogue style for the participant
   */
  dialogueStyle?: "cooperative" | "competitive" | "inquisitive" | "assertive" | "analytical";
  
  /**
   * Bidding strategy for the participant
   * If not provided, a default strategy will be used
   */
  biddingStrategy?: IBiddingStrategy;
  
  /**
   * Motivations for the participant
   * Key-value pairs of motivation types and their strengths (0.0 to 1.0)
   */
  motivations?: Record<string, number>;
}

/**
 * Core dialogue participant class
 */
export class DialogueParticipant {
  /**
   * Unique identifier for the participant
   */
  readonly id: string;
  
  /**
   * Display name for the participant
   */
  readonly name: string;
  
  /**
   * Agent that powers this participant
   */
  readonly agent: IAgent;
  
  /**
   * Role of the participant in dialogues
   */
  readonly role?: string;
  
  /**
   * Dialogue style for the participant
   */
  readonly dialogueStyle?: string;
  
  /**
   * Bidding strategy for the participant
   */
  protected biddingStrategy: IBiddingStrategy;
  
  /**
   * Motivations for the participant
   */
  protected motivations: Record<string, number>;
  
  /**
   * Create a new dialogue participant
   * 
   * @param config - Configuration for the participant
   * @param agent - Agent implementation (if not provided, will be created from config.agentConfig)
   */
  constructor(
    config: DialogueParticipantConfig,
    agent?: IAgent
  ) {
    this.id = config.id ?? crypto.randomUUID();
    this.name = config.name;
    this.role = config.role;
    this.dialogueStyle = config.dialogueStyle;
    this.motivations = config.motivations ?? {};
    
    // Set up agent
    if (agent) {
      this.agent = agent;
    } else if (config.agentConfig) {
      // In a real implementation, this would create the agent from the config
      // For now, we'll create a simple placeholder agent
      this.agent = {
        id: this.id,
        execute: async (input: string) => `${this.name} responds to: ${input}`,
      };
    } else {
      throw new Error("Either agent or agentConfig must be provided");
    }
    
    // Set up bidding strategy
    this.biddingStrategy = config.biddingStrategy ?? 
      BiddingStrategyFactory.createDefaultStrategy();
  }
  
  /**
   * Calculate a bid for the participant's turn
   * 
   * @param dialogueState - Current state of the dialogue
   * @returns The calculated bid
   */
  async calculateBid(dialogueState: DialogueState): Promise<Bid> {
    const context: BidContext = {
      dialogueState,
      participantId: this.id,
      context: {
        motivations: this.motivations,
        dialogueStyle: this.dialogueStyle,
        role: this.role,
      },
    };
    
    return this.biddingStrategy.calculateBid(context);
  }
  
  /**
   * Generate a response for the participant's turn
   * 
   * @param prompt - Prompt for the participant
   * @returns The participant's response
   */
  async generateResponse(prompt: string): Promise<string> {
    return this.agent.execute(prompt);
  }
  
  /**
   * Update the participant's motivations
   * 
   * @param motivations - New or updated motivations
   */
  updateMotivations(motivations: Record<string, number>): void {
    for (const [motivation, strength] of Object.entries(motivations)) {
      this.motivations[motivation] = Math.max(0, Math.min(1, strength));
    }
  }
  
  /**
   * Get the participant's current motivations
   * 
   * @returns Current motivations
   */
  getMotivations(): Record<string, number> {
    return { ...this.motivations };
  }
  
  /**
   * Create a serializable representation of the participant
   * 
   * @returns Serializable representation
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      dialogueStyle: this.dialogueStyle,
      motivations: this.motivations,
    };
  }
}

/**
 * Create a new dialogue participant
 * 
 * @param config - Configuration for the participant
 * @param agent - Agent implementation (optional)
 * @returns New dialogue participant
 */
export function createDialogueParticipant(
  config: DialogueParticipantConfig,
  agent?: IAgent
): DialogueParticipant {
  return new DialogueParticipant(config, agent);
}
