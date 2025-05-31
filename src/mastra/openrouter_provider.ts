/**
 * OpenRouter Provider for Mastra
 * Provides a custom agent provider that uses OpenRouter for LLM capabilities
 */

import { IAgent, IAgentConfig } from "../utils/interfaces.ts";
import { IAgentProvider } from "./mod.ts";
import { 
  OpenRouterClient, 
  OpenRouterConfig, 
  createOpenRouterAgent 
} from "./openrouter_client.ts";

/**
 * Agent provider that creates agents using OpenRouter
 */
export class OpenRouterAgentProvider implements IAgentProvider {
  private client: OpenRouterClient;
  
  /**
   * Create a new OpenRouter agent provider
   * 
   * @param config - Configuration for OpenRouter
   */
  constructor(config: OpenRouterConfig) {
    this.client = new OpenRouterClient(config);
  }
  
  /**
   * Create an agent with the specified configuration
   * 
   * @param config - Configuration for the agent
   * @returns The created agent
   */
  createAgent(config: IAgentConfig): IAgent {
    return createOpenRouterAgent(config, this.client);
  }
}

/**
 * Create an OpenRouter agent provider with the specified configuration
 * 
 * @param config - Configuration for OpenRouter
 * @returns New OpenRouter agent provider
 */
export function createOpenRouterAgentProvider(
  config: OpenRouterConfig
): IAgentProvider {
  return new OpenRouterAgentProvider(config);
}

/**
 * Configuration for creating a Mastra instance with OpenRouter
 */
export interface OpenRouterMastraConfig {
  /**
   * OpenRouter API key
   */
  apiKey: string;
  
  /**
   * Default model to use
   */
  defaultModel: string;
  
  /**
   * Base URL for OpenRouter API (optional)
   */
  baseUrl?: string;
  
  /**
   * Array of fallback models (optional)
   */
  fallbackModels?: string[];
  
  /**
   * Default temperature (optional)
   */
  temperature?: number;
}

/**
 * Create a Mastra instance configured to use OpenRouter
 * 
 * @param config - Configuration for OpenRouter integration
 * @returns A factory function that creates an OpenRouter-enabled Mastra instance
 */
export function withOpenRouter(config: OpenRouterMastraConfig) {
  return () => {
    const openRouterConfig: OpenRouterConfig = {
      apiKey: config.apiKey,
      defaultModel: config.defaultModel,
      baseUrl: config.baseUrl,
      fallbackModels: config.fallbackModels,
      temperature: config.temperature
    };
    
    const agentProvider = createOpenRouterAgentProvider(openRouterConfig);
    
    // Return a factory that will be used by createMastra
    return {
      agentProvider
    };
  };
}
