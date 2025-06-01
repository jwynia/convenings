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
  // Import necessary classes and functions directly
  const { OpenRouterClient } = await import("../mastra/openrouter_client.ts");
  const { createOpenRouterAgent } = await import("../mastra/openrouter_client.ts");
  const { ConsensusWorkflow } = await import("./workflows/consensus_workflow.ts");
  const { createConsensusSeekingParticipant, createTruthSeekingParticipant } = await import("./participants/motivations/mod.ts");
  
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

// Export logger
export * from "./utils/logger.ts";

/**
 * Configuration for creating a debate
 */
export interface CreateDebateOptions {
  /**
   * Format of the debate (formal, casual, educational, competitive)
   * Default: "formal"
   */
  debateFormat?: DebateFormat;
  
  /**
   * Number of argument rounds
   * Default: 2
   */
  roundCount?: number;
  
  /**
   * Maximum tokens for opening statements
   * Default: 300
   */
  openingStatementMaxTokens?: number;
  
  /**
   * Maximum tokens for arguments and rebuttals
   * Default: 250
   */
  argumentMaxTokens?: number;
  
  /**
   * Maximum tokens for closing statements
   * Default: 350
   */
  closingStatementMaxTokens?: number;
  
  /**
   * Whether to enable scoring
   * Default: true
   */
  scoringEnabled?: boolean;
  
  /**
   * Whether to include moderator summaries after each round
   * Default: true
   */
  roundSummariesEnabled?: boolean;
  
  /**
   * Maximum budget in USD
   */
  maxCost?: number;
  
  /**
   * Maximum tokens to use
   */
  maxTokens?: number;
  
  /**
   * Path to save debate transcript and results
   */
  outputFilePath?: string;
  
  /**
   * Format to save debate output in
   * Default: "json"
   */
  outputFormat?: "json" | "md" | "txt";
  
  /**
   * Whether to show debug logs
   * Default: false
   */
  debug?: boolean;
  
  /**
   * Whether to show progress in the console
   * Default: true
   */
  showProgress?: boolean;
  
  /**
   * Temperature for the model (0.0-1.0)
   * Default: 0.7
   */
  temperature?: number;
}

/**
 * Create a debate on a given topic with opposing positions
 * 
 * @param topic - Topic for the debate
 * @param positionA - First position to advocate
 * @param positionB - Second position to advocate
 * @param openRouterApiKey - OpenRouter API key
 * @param defaultModel - Default model to use (e.g., "openai/gpt-4o")
 * @param options - Additional options for the debate
 * @returns Promise resolving to the debate result
 */
export async function createDebate(
  topic: string,
  positionA: string,
  positionB: string,
  openRouterApiKey: string,
  defaultModel: string = "openai/gpt-4o",
  options: CreateDebateOptions = {}
) {
  // Import necessary classes and functions directly
  const { OpenRouterClient } = await import("../mastra/openrouter_client.ts");
  const { createOpenRouterAgent } = await import("../mastra/openrouter_client.ts");
  const { createDebateParticipant, createDebateModerator } = await import("./participants/debate_participant.ts");
  const { DebateWorkflow } = await import("./workflows/debate_workflow.ts");
  const { LogLevel } = await import("./utils/logger.ts");
  
  const debateFormat = options.debateFormat || "formal";
  const temperature = options.temperature || 0.7;
  
  // Create OpenRouter client
  const client = new OpenRouterClient({
    apiKey: openRouterApiKey,
    defaultModel,
    temperature,
    fallbackModels: ["anthropic/claude-3-opus", "anthropic/claude-3-sonnet"],
    trackTokens: true,
    logLevel: options.debug ? LogLevel.DEBUG : LogLevel.INFO,
    maxCost: options.maxCost,
    maxTokens: options.maxTokens
  });
  
  // Create participants for the debate
  const participants = [
    // Moderator
    createDebateModerator({
      name: "Moderator",
      agentConfig: {
        id: "moderator",
        systemPrompt: `You are a neutral moderator for a debate on ${topic}.
Your role is to ensure the debate progresses according to structure and rules,
while remaining neutral on the topic. Guide participants through each phase
of the debate, provide summaries after each round, and evaluate arguments
based on logic, evidence, clarity, and responsiveness.`,
      },
      dialogueStyle: "analytical",
      preferredFormat: debateFormat
    }, createOpenRouterAgent({
      id: "moderator",
      systemPrompt: `You are a neutral moderator for a debate on ${topic}.
Your role is to ensure the debate progresses according to structure and rules,
while remaining neutral on the topic. Guide participants through each phase
of the debate, provide summaries after each round, and evaluate arguments
based on logic, evidence, clarity, and responsiveness.`,
    }, client)),
    
    // Position A Advocate
    createDebateParticipant({
      name: "Advocate A",
      debateRole: "position_advocate",
      position: positionA,
      agentConfig: {
        id: "advocate_a",
        systemPrompt: `You are participating in a structured debate on ${topic}.
You are advocating for the position: "${positionA}".
Present persuasive arguments supporting your position using clear logic,
credible evidence, and addressing counterarguments effectively.`,
      },
      dialogueStyle: "assertive",
      preferredFormat: debateFormat
    }, createOpenRouterAgent({
      id: "advocate_a",
      systemPrompt: `You are participating in a structured debate on ${topic}.
You are advocating for the position: "${positionA}".
Present persuasive arguments supporting your position using clear logic,
credible evidence, and addressing counterarguments effectively.`,
    }, client)),
    
    // Position B Advocate
    createDebateParticipant({
      name: "Advocate B",
      debateRole: "position_advocate",
      position: positionB,
      agentConfig: {
        id: "advocate_b",
        systemPrompt: `You are participating in a structured debate on ${topic}.
You are advocating for the position: "${positionB}".
Present persuasive arguments supporting your position using clear logic,
credible evidence, and addressing counterarguments effectively.`,
      },
      dialogueStyle: "assertive",
      preferredFormat: debateFormat
    }, createOpenRouterAgent({
      id: "advocate_b",
      systemPrompt: `You are participating in a structured debate on ${topic}.
You are advocating for the position: "${positionB}".
Present persuasive arguments supporting your position using clear logic,
credible evidence, and addressing counterarguments effectively.`,
    }, client)),
  ];
  
  // Create debate workflow with the participants
  const debate = new DebateWorkflow(topic, participants, {
    debateFormat,
    roundCount: options.roundCount || 2,
    maxTurns: 30,
    scoringEnabled: options.scoringEnabled !== false,
    roundSummariesEnabled: options.roundSummariesEnabled !== false,
    openingStatementMaxTokens: options.openingStatementMaxTokens,
    argumentMaxTokens: options.argumentMaxTokens,
    closingStatementMaxTokens: options.closingStatementMaxTokens,
    outputFilePath: options.outputFilePath,
    outputFormat: options.outputFormat,
    debug: options.debug,
    showProgress: options.showProgress !== false,
    budget: {
      maxTokens: options.maxTokens,
      maxCost: options.maxCost,
      warningThreshold: 0.8,
    },
    debatePromptTemplate: `This is a structured ${debateFormat} debate on ${topic}.
The debate follows a formal structure with opening statements,
argument rounds with rebuttals, and closing statements.
Each participant should present their position clearly, support it with
evidence and reasoning, and respond directly to opposing arguments.`,
  });
  
  // Run the debate
  return debate.run();
}
