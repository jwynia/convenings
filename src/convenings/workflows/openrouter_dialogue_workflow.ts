/**
 * OpenRouter Dialogue Workflow Implementation
 * Dialogue workflow that uses OpenRouter for creating agents
 */

import { 
  DialogueWorkflow, 
  DialogueParticipant,
  DialogueWorkflowConfig 
} from "./dialogue_workflow.ts";
import { 
  createMotivatedDialogueParticipant,
  MotivatedDialogueParticipantConfig 
} from "../participants/mod.ts";
import { 
  OpenRouterClient, 
  OpenRouterConfig,
  createOpenRouterAgent 
} from "../../mastra/openrouter_client.ts";

/**
 * Configuration for an OpenRouter dialogue participant
 */
export interface OpenRouterParticipantConfig extends Omit<MotivatedDialogueParticipantConfig, "agentConfig"> {
  /**
   * System prompt for the participant
   */
  systemPrompt: string;
  
  /**
   * Model to use for the participant
   * If not specified, uses the client's default model
   */
  model?: string;
  
  /**
   * Temperature for generation (0.0 to 1.0)
   * If not specified, uses the client's default temperature
   */
  temperature?: number;
}

/**
 * Configuration for an OpenRouter dialogue workflow
 */
export interface OpenRouterDialogueWorkflowConfig extends DialogueWorkflowConfig {
  /**
   * OpenRouter API configuration
   */
  openRouterConfig: OpenRouterConfig;
  
  /**
   * Participant configurations
   */
  participantConfigs: OpenRouterParticipantConfig[];
}

/**
 * Create a dialogue workflow using OpenRouter for agent creation
 * 
 * @param topic - Topic for the dialogue
 * @param config - Configuration for the workflow
 * @returns New dialogue workflow with OpenRouter agents
 */
export async function createOpenRouterDialogueWorkflow(
  topic: string,
  config: OpenRouterDialogueWorkflowConfig
): Promise<DialogueWorkflow> {
  // Create OpenRouter client
  const client = new OpenRouterClient(config.openRouterConfig);
  
  // Create participants
  const participants: DialogueParticipant[] = [];
  
  for (const participantConfig of config.participantConfigs) {
    // Create agent
    const agent = createOpenRouterAgent(
      {
        id: participantConfig.id || crypto.randomUUID(),
        systemPrompt: participantConfig.systemPrompt,
        model: participantConfig.model,
        temperature: participantConfig.temperature,
      },
      client
    );
    
    // Create participant
    const participant = createMotivatedDialogueParticipant(
      {
        ...participantConfig,
        agentConfig: {
          id: agent.id,
          systemPrompt: participantConfig.systemPrompt,
        },
      },
      agent
    );
    
    participants.push(participant);
  }
  
  // Create dialogue workflow
  return new DialogueWorkflow(topic, participants, config);
}

/**
 * Create a simple dialogue with predefined OpenRouter participants
 * 
 * @param topic - Topic for the dialogue
 * @param openRouterConfig - Configuration for OpenRouter
 * @param workflowConfig - Additional workflow configuration
 * @returns New dialogue workflow with predefined participants
 */
export async function createSimpleOpenRouterDialogue(
  topic: string,
  openRouterConfig: OpenRouterConfig,
  workflowConfig?: Omit<DialogueWorkflowConfig, "exitCondition">
): Promise<DialogueWorkflow> {
  // Define default participants
  const defaultParticipants: OpenRouterParticipantConfig[] = [
    {
      name: "Moderator",
      role: "moderator",
      systemPrompt: `You are a moderator in a dialogue about ${topic}. 
Your job is to guide the conversation, ask insightful questions, 
and ensure all participants have a chance to express their views.
Keep the discussion on topic and constructive.`,
      primaryMotivation: "facilitation",
      dialogueStyle: "cooperative",
    },
    {
      name: "Expert",
      role: "expert",
      systemPrompt: `You are a subject matter expert on ${topic}.
Provide factual information, correct misconceptions, and offer
nuanced perspectives based on the latest research and evidence.
Be clear, precise, and educational in your responses.`,
      primaryMotivation: "truth-seeking",
      dialogueStyle: "analytical",
    },
    {
      name: "Advocate",
      role: "advocate",
      systemPrompt: `You are an advocate in a dialogue about ${topic}.
Your role is to present compelling arguments for positions that
might benefit people or causes related to this topic.
Be passionate but fair, and focus on constructive solutions.`,
      primaryMotivation: "advocacy",
      secondaryMotivations: {
        "consensus-seeking": 0.7,
      },
      dialogueStyle: "assertive",
    }
  ];
  
  // Create the workflow
  return createOpenRouterDialogueWorkflow(topic, {
    openRouterConfig,
    participantConfigs: defaultParticipants,
    maxTurns: 10,
    ...workflowConfig,
  });
}
