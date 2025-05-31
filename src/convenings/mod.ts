/**
 * Convenings module
 * Provides core functionality for multi-agent dialogue and convenings
 */

// Export interfaces
export * from "./interfaces.ts";

// Export implementation
export {
  ConveningSystem,
  createConvening,
  convening,
} from "./implementation.ts";

// Export participants
export * from "./participants/mod.ts";

// Export workflows
export * from "./workflows/mod.ts";

// Export Mastra-OpenRouter integration
export {
  OpenRouterClient,
  OpenRouterAgent,
  createOpenRouterClient,
  createOpenRouterAgent,
  type OpenRouterConfig,
  type ChatMessage,
  type ChatCompletionOptions
} from "../mastra/openrouter_client.ts";

export {
  OpenRouterAgentProvider,
  createOpenRouterAgentProvider,
  withOpenRouter,
  type OpenRouterMastraConfig
} from "../mastra/openrouter_provider.ts";

/**
 * Create a simple multi-agent dialogue on a given topic
 * 
 * @param topic - Topic for the dialogue
 * @param openRouterApiKey - OpenRouter API key
 * @param defaultModel - Default model to use (e.g., "openai/gpt-4o")
 * @returns Promise resolving to the dialogue result
 */
export async function createSimpleDialogue(
  topic: string,
  openRouterApiKey: string,
  defaultModel: string = "openai/gpt-4o"
) {
  // Create a dialogue with default participants
  const dialogue = await createSimpleOpenRouterDialogue(
    topic,
    {
      apiKey: openRouterApiKey,
      defaultModel,
      temperature: 0.7,
      fallbackModels: ["anthropic/claude-3-opus", "anthropic/claude-3-sonnet"]
    }
  );
  
  // Run the dialogue
  return dialogue.run();
}

/**
 * Create a consensus-seeking dialogue on a given topic
 * 
 * @param topic - Topic for the dialogue
 * @param openRouterApiKey - OpenRouter API key
 * @param defaultModel - Default model to use (e.g., "openai/gpt-4o")
 * @returns Promise resolving to the consensus result
 */
export async function createConsensusDialogue(
  topic: string,
  openRouterApiKey: string,
  defaultModel: string = "openai/gpt-4o"
) {
  // Create OpenRouter client
  const client = new OpenRouterClient({
    apiKey: openRouterApiKey,
    defaultModel,
    temperature: 0.7,
    fallbackModels: ["anthropic/claude-3-opus", "anthropic/claude-3-sonnet"]
  });
  
  // Create participants with consensus-seeking focus
  const participants = [
    createConsensusSeekingParticipant({
      name: "Moderator",
      role: "moderator",
      agentConfig: {
        id: "moderator",
        systemPrompt: `You are a moderator in a dialogue about ${topic}. 
Your primary goal is to help the group reach consensus.
Guide the conversation, summarize points of agreement, and
encourage participants to find common ground.`,
      }
    }, createOpenRouterAgent({
      id: "moderator",
      systemPrompt: `You are a moderator in a dialogue about ${topic}. 
Your primary goal is to help the group reach consensus.
Guide the conversation, summarize points of agreement, and
encourage participants to find common ground.`,
    }, client)),
    
    createTruthSeekingParticipant({
      name: "Expert",
      role: "expert",
      agentConfig: {
        id: "expert",
        systemPrompt: `You are a subject matter expert on ${topic}.
Provide factual information to help the group reach an informed consensus.
Focus on areas where evidence can bring clarity to disagreements.`,
      },
      secondaryMotivations: {
        "consensus-seeking": 0.7
      }
    }, createOpenRouterAgent({
      id: "expert",
      systemPrompt: `You are a subject matter expert on ${topic}.
Provide factual information to help the group reach an informed consensus.
Focus on areas where evidence can bring clarity to disagreements.`,
    }, client)),
    
    createConsensusSeekingParticipant({
      name: "Mediator",
      role: "mediator",
      agentConfig: {
        id: "mediator",
        systemPrompt: `You are a skilled mediator in a dialogue about ${topic}.
Your expertise is in identifying underlying interests and needs.
Help participants recognize shared values and potential compromises.`,
      }
    }, createOpenRouterAgent({
      id: "mediator",
      systemPrompt: `You are a skilled mediator in a dialogue about ${topic}.
Your expertise is in identifying underlying interests and needs.
Help participants recognize shared values and potential compromises.`,
    }, client)),
  ];
  
  // Create consensus workflow with the participants
  const consensus = new ConsensusWorkflow(topic, participants, {
    maxTurns: 15,
    consensusThreshold: 0.7,
    requiredStableTurns: 2,
    consensusPromptTemplate: `This is a consensus-seeking dialogue about ${topic}.
The goal is to reach agreement on key points related to this topic.
Each participant should listen carefully to others and work toward
finding common ground and shared understanding.`,
  });
  
  // Run the consensus dialogue
  return consensus.run();
}
