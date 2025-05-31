/**
 * Dialogue Workflow Implementation
 * Core workflow for multi-agent dialogue orchestration
 */

import { IAgent } from "../../utils/interfaces.ts";
import { IStringUtils } from "../../utils/interfaces.ts";
import { createStringUtils } from "../../utils/string_utils.ts";

/**
 * Participant in a dialogue
 */
export interface DialogueParticipant {
  /**
   * Unique identifier for the participant
   */
  id: string;
  
  /**
   * Display name for the participant
   */
  name: string;
  
  /**
   * Agent that powers this participant
   */
  agent: IAgent;
  
  /**
   * Role of the participant in the dialogue
   */
  role?: string;
  
  /**
   * Optional configuration for the participant
   */
  config?: Record<string, unknown>;
}

/**
 * Message in a dialogue
 */
export interface DialogueMessage {
  /**
   * ID of the participant who sent the message
   */
  participantId: string;
  
  /**
   * Content of the message
   */
  content: string;
  
  /**
   * Timestamp when the message was sent
   */
  timestamp: number;
  
  /**
   * Optional metadata about the message
   */
  metadata?: Record<string, unknown>;
}

/**
 * State of a dialogue
 */
export interface DialogueState {
  /**
   * Unique identifier for the dialogue
   */
  id: string;
  
  /**
   * Topic of the dialogue
   */
  topic: string;
  
  /**
   * Participants in the dialogue
   */
  participants: DialogueParticipant[];
  
  /**
   * History of messages in the dialogue
   */
  messages: DialogueMessage[];
  
  /**
   * Current turn in the dialogue
   */
  currentTurn: number;
  
  /**
   * Whether the dialogue is complete
   */
  isComplete: boolean;
  
  /**
   * Timestamp when the dialogue started
   */
  startTime: number;
  
  /**
   * Timestamp when the dialogue ended (if complete)
   */
  endTime?: number;
  
  /**
   * Additional context for the dialogue
   */
  context: Record<string, unknown>;
}

/**
 * Configuration for a dialogue workflow
 */
export interface DialogueWorkflowConfig {
  /**
   * Maximum number of turns in the dialogue
   * Default: 10
   */
  maxTurns?: number;
  
  /**
   * Maximum duration of the dialogue in milliseconds
   * Default: 5 minutes
   */
  maxDuration?: number;
  
  /**
   * System prompt template for the dialogue
   * Can include placeholders like {topic}, {participantNames}
   */
  systemPromptTemplate?: string;
  
  /**
   * Whether to include the system prompt in each turn
   * Default: true
   */
  includeSystemPrompt?: boolean;
  
  /**
   * Optional function to determine when the dialogue should end
   */
  exitCondition?: (state: DialogueState) => boolean;
}

/**
 * Result of a dialogue workflow
 */
export interface DialogueWorkflowResult {
  /**
   * Unique identifier for the dialogue
   */
  id: string;
  
  /**
   * Topic of the dialogue
   */
  topic: string;
  
  /**
   * Complete history of messages
   */
  messages: DialogueMessage[];
  
  /**
   * Whether the dialogue completed successfully
   */
  success: boolean;
  
  /**
   * Reason the dialogue ended
   */
  endReason: string;
  
  /**
   * Duration of the dialogue in milliseconds
   */
  duration: number;
  
  /**
   * Summary of the dialogue (if generated)
   */
  summary?: string;
  
  /**
   * Additional outputs from the dialogue
   */
  outputs?: Record<string, unknown>;
}

/**
 * Core workflow for multi-agent dialogues
 */
export class DialogueWorkflow {
  private config: Required<DialogueWorkflowConfig>;
  private state: DialogueState;
  private stringUtils: IStringUtils;
  
  /**
   * Create a new dialogue workflow
   * 
   * @param topic - Topic for the dialogue
   * @param participants - Participants in the dialogue
   * @param config - Configuration for the dialogue
   */
  constructor(
    topic: string,
    participants: DialogueParticipant[],
    config: DialogueWorkflowConfig = {}
  ) {
    // Ensure we have at least 2 participants
    if (participants.length < 2) {
      throw new Error("Dialogue requires at least 2 participants");
    }
    
    // Set up default configuration
    this.config = {
      maxTurns: config.maxTurns ?? 10,
      maxDuration: config.maxDuration ?? 5 * 60 * 1000, // 5 minutes
      systemPromptTemplate: config.systemPromptTemplate ?? 
        "This is a dialogue about {topic} between {participantNames}. " +
        "Each participant should stay in character and engage meaningfully with the topic.",
      includeSystemPrompt: config.includeSystemPrompt ?? true,
      exitCondition: config.exitCondition ?? (() => false),
    };
    
    // Initialize dialogue state
    this.state = {
      id: crypto.randomUUID(),
      topic,
      participants,
      messages: [],
      currentTurn: 0,
      isComplete: false,
      startTime: Date.now(),
      context: {},
    };
    
    // Initialize string utilities
    this.stringUtils = createStringUtils();
  }
  
  /**
   * Run the dialogue to completion
   * 
   * @returns Result of the dialogue
   */
  async run(): Promise<DialogueWorkflowResult> {
    try {
      let endReason = "completed";
      
      // Run until exit condition is met
      while (!this.shouldExit()) {
        // Execute the next turn
        await this.executeTurn();
        
        // Check if we've reached max turns
        if (this.state.currentTurn >= this.config.maxTurns) {
          endReason = "max_turns_reached";
          break;
        }
        
        // Check if we've exceeded max duration
        if (Date.now() - this.state.startTime >= this.config.maxDuration) {
          endReason = "max_duration_reached";
          break;
        }
        
        // Increment turn counter
        this.state.currentTurn++;
      }
      
      // Mark dialogue as complete
      this.state.isComplete = true;
      this.state.endTime = Date.now();
      
      // Generate dialogue result
      return {
        id: this.state.id,
        topic: this.state.topic,
        messages: this.state.messages,
        success: true,
        endReason,
        duration: this.state.endTime - this.state.startTime,
      };
    } catch (error) {
      // Handle any errors during dialogue execution
      console.error("Error in dialogue workflow:", error);
      
      return {
        id: this.state.id,
        topic: this.state.topic,
        messages: this.state.messages,
        success: false,
        endReason: `error: ${error.message}`,
        duration: Date.now() - this.state.startTime,
      };
    }
  }
  
  /**
   * Check if the dialogue should exit
   * 
   * @returns Whether the dialogue should exit
   */
  private shouldExit(): boolean {
    // Check custom exit condition
    return this.state.isComplete || this.config.exitCondition(this.state);
  }
  
  /**
   * Execute a single turn of the dialogue
   */
  private async executeTurn(): Promise<void> {
    // Determine which participant's turn it is
    const participantIndex = this.state.currentTurn % this.state.participants.length;
    const participant = this.state.participants[participantIndex];
    
    // Generate the prompt for this turn
    const prompt = await this.generatePrompt(participant);
    
    // Get response from the participant's agent
    const response = await participant.agent.execute(prompt);
    
    // Record the message
    const message: DialogueMessage = {
      participantId: participant.id,
      content: response,
      timestamp: Date.now(),
      metadata: {
        turnNumber: this.state.currentTurn,
      },
    };
    
    this.state.messages.push(message);
  }
  
  /**
   * Generate a prompt for a participant's turn
   * 
   * @param participant - The participant whose turn it is
   * @returns Prompt for the participant
   */
  private async generatePrompt(participant: DialogueParticipant): Promise<string> {
    // Get system prompt
    const systemPrompt = this.getSystemPrompt();
    
    // Build dialogue history
    const dialogueHistory = this.formatDialogueHistory();
    
    // Construct the full prompt
    const prompt = [
      this.config.includeSystemPrompt ? systemPrompt : "",
      `The current topic is: ${this.state.topic}`,
      "",
      "Dialogue history:",
      dialogueHistory,
      "",
      `It is now ${participant.name}'s turn to speak.`,
    ].filter(Boolean).join("\n");
    
    return prompt;
  }
  
  /**
   * Get the system prompt for the dialogue
   * 
   * @returns Formatted system prompt
   */
  private getSystemPrompt(): string {
    const participantNames = this.state.participants
      .map(p => p.name)
      .join(", ");
    
    return this.stringUtils.formatString(
      this.config.systemPromptTemplate,
      {
        topic: this.state.topic,
        participantNames,
      }
    );
  }
  
  /**
   * Format the dialogue history for inclusion in prompts
   * 
   * @returns Formatted dialogue history
   */
  private formatDialogueHistory(): string {
    if (this.state.messages.length === 0) {
      return "No messages yet.";
    }
    
    // Get the participant name map
    const participantMap = new Map(
      this.state.participants.map(p => [p.id, p.name])
    );
    
    // Format each message
    return this.state.messages
      .map(msg => {
        const name = participantMap.get(msg.participantId) || msg.participantId;
        return `${name}: ${msg.content}`;
      })
      .join("\n\n");
  }
}

/**
 * Create a new dialogue workflow
 * 
 * @param topic - Topic for the dialogue
 * @param participants - Participants in the dialogue
 * @param config - Configuration for the dialogue
 * @returns New dialogue workflow
 */
export function createDialogueWorkflow(
  topic: string,
  participants: DialogueParticipant[],
  config?: DialogueWorkflowConfig
): DialogueWorkflow {
  return new DialogueWorkflow(topic, participants, config);
}
