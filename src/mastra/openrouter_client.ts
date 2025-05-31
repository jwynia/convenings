/**
 * OpenRouter Client Implementation
 * Provides integration with OpenRouter API for accessing multiple LLM providers
 */

import { IAgent, IAgentConfig } from "../utils/interfaces.ts";

/**
 * Configuration for OpenRouter client
 */
export interface OpenRouterConfig {
  /**
   * API key for OpenRouter
   */
  apiKey: string;
  
  /**
   * Default model to use for completions
   * Examples: "openai/gpt-4o", "anthropic/claude-3-opus"
   */
  defaultModel: string;
  
  /**
   * Base URL for OpenRouter API
   * Defaults to official OpenRouter API endpoint
   */
  baseUrl?: string;
  
  /**
   * Request timeout in milliseconds
   * Defaults to 60000 (60 seconds)
   */
  timeout?: number;
  
  /**
   * Default temperature for completions
   * Defaults to 0.7
   */
  temperature?: number;
  
  /**
   * Maximum number of tokens to generate
   * Defaults to 1000
   */
  maxTokens?: number;
  
  /**
   * Array of fallback models to try if the primary model fails
   */
  fallbackModels?: string[];
}

/**
 * Message structure for chat completions
 */
export interface ChatMessage {
  /**
   * Role of the message sender (system, user, assistant)
   */
  role: "system" | "user" | "assistant";
  
  /**
   * Content of the message
   */
  content: string;
}

/**
 * Options for chat completions
 */
export interface ChatCompletionOptions {
  /**
   * Model to use for completion
   * If not specified, uses defaultModel from config
   */
  model?: string;
  
  /**
   * Temperature for completion (0.0 to 1.0)
   */
  temperature?: number;
  
  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Stop sequences to end generation
   */
  stopSequences?: string[];
}

/**
 * Client for communicating with OpenRouter API
 */
export class OpenRouterClient {
  private config: OpenRouterConfig;
  
  /**
   * Create a new OpenRouter client
   * 
   * @param config - Configuration for the client
   */
  constructor(config: OpenRouterConfig) {
    this.config = {
      baseUrl: "https://openrouter.ai/api/v1",
      timeout: 60000,
      temperature: 0.7,
      maxTokens: 1000,
      ...config,
    };
    
    if (!this.config.apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    
    if (!this.config.defaultModel) {
      throw new Error("Default model is required");
    }
  }
  
  /**
   * Send a chat completion request to OpenRouter
   * 
   * @param messages - Array of messages for the chat completion
   * @param options - Options for the completion
   * @returns The completion response
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatMessage> {
    const model = options.model || this.config.defaultModel;
    const temperature = options.temperature ?? this.config.temperature;
    const maxTokens = options.maxTokens ?? this.config.maxTokens;
    
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
          "HTTP-Referer": "https://github.com/user/convenings", // Identifying the client
          "X-Title": "Convenings Multi-Agent Dialogue System", // Project name for OpenRouter analytics
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stop: options.stopSequences,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        role: "assistant",
        content: data.choices[0].message.content,
      };
    } catch (error) {
      // If there are fallback models and this wasn't already a fallback attempt
      if (this.config.fallbackModels?.length && model === this.config.defaultModel) {
        console.warn(`Error with primary model ${model}, trying fallback: ${error.message}`);
        
        // Try fallback models in sequence
        for (const fallbackModel of this.config.fallbackModels) {
          try {
            return await this.chatCompletion(messages, {
              ...options,
              model: fallbackModel,
            });
          } catch (fallbackError) {
            console.warn(`Fallback model ${fallbackModel} failed: ${fallbackError.message}`);
            // Continue to next fallback
          }
        }
      }
      
      // Re-throw if all fallbacks failed or there are no fallbacks
      throw error;
    }
  }
  
  /**
   * Send a text completion request to OpenRouter
   * 
   * @param prompt - The prompt for text completion
   * @param options - Options for the completion
   * @returns The completion text
   */
  async textCompletion(
    prompt: string,
    options: ChatCompletionOptions = {},
  ): Promise<string> {
    // Convert to chat format for OpenRouter API
    const messages: ChatMessage[] = [
      { role: "user", content: prompt },
    ];
    
    const response = await this.chatCompletion(messages, options);
    return response.content;
  }
}

/**
 * Agent implementation that uses OpenRouter for completion
 */
export class OpenRouterAgent implements IAgent {
  /**
   * Unique identifier for the agent
   */
  id: string;
  
  private client: OpenRouterClient;
  private systemPrompt: string;
  private model: string;
  private temperature: number;
  
  /**
   * Create a new OpenRouter agent
   * 
   * @param config - Agent configuration
   * @param client - OpenRouter client to use
   */
  constructor(config: IAgentConfig, client: OpenRouterClient) {
    this.id = config.id;
    this.client = client;
    this.systemPrompt = config.systemPrompt as string || 
      "You are a helpful AI assistant.";
    this.model = config.model || client.config.defaultModel;
    this.temperature = (config.temperature as number) || 0.7;
  }
  
  /**
   * Execute a request with the agent
   * 
   * @param input - The input to process
   * @returns The agent's response
   */
  async execute(input: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: input },
    ];
    
    const response = await this.client.chatCompletion(messages, {
      model: this.model,
      temperature: this.temperature,
    });
    
    return response.content;
  }
}

/**
 * Create an OpenRouter client with the specified configuration
 * 
 * @param config - Configuration for the client
 * @returns New OpenRouter client
 */
export function createOpenRouterClient(config: OpenRouterConfig): OpenRouterClient {
  return new OpenRouterClient(config);
}

/**
 * Create an agent that uses OpenRouter for completion
 * 
 * @param config - Agent configuration
 * @param client - OpenRouter client to use
 * @returns New OpenRouter agent
 */
export function createOpenRouterAgent(
  config: IAgentConfig, 
  client: OpenRouterClient
): IAgent {
  return new OpenRouterAgent(config, client);
}
