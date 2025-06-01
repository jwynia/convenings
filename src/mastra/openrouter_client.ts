/**
 * OpenRouter Client Implementation
 * Provides integration with OpenRouter API for accessing multiple LLM providers
 */

import { IAgent, IAgentConfig } from "../utils/interfaces.ts";
import { ILogger, createLogger, LogLevel } from "../convenings/utils/logger.ts";

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
  
  /**
   * Logger instance to use for logging
   * If not provided, a default logger will be created
   */
  logger?: ILogger;
  
  /**
   * Log level to use
   * Default: LogLevel.INFO
   */
  logLevel?: LogLevel;
  
  /**
   * Whether to enable token tracking
   * Default: true
   */
  trackTokens?: boolean;
  
  /**
   * Maximum cost budget in USD
   * If exceeded, API calls will be rejected
   */
  maxCost?: number;
  
  /**
   * Maximum token budget
   * If exceeded, API calls will be rejected
   */
  maxTokens?: number;
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
  private logger: ILogger;
  
  /**
   * Access to the configured logger
   */
  get loggerInstance(): ILogger {
    return this.logger;
  }
  
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
      trackTokens: true,
      logLevel: LogLevel.INFO,
      ...config,
    };
    
    if (!this.config.apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    
    if (!this.config.defaultModel) {
      throw new Error("Default model is required");
    }
    
    // Initialize logger
    this.logger = config.logger || createLogger(
      { logLevel: this.config.logLevel },
      {
        maxTokens: this.config.maxTokens,
        maxCost: this.config.maxCost,
      }
    );
    
    this.logger.info(`OpenRouterClient initialized with model: ${this.config.defaultModel}`);
  }
  
  /**
   * Estimate input token count (very rough approximation)
   * 
   * @param messages - Array of messages
   * @returns Estimated token count
   */
  private estimateTokenCount(messages: ChatMessage[]): number {
    // Very rough approximation (4 chars ~ 1 token)
    let totalChars = 0;
    
    for (const message of messages) {
      totalChars += message.content.length;
      totalChars += message.role.length;
      totalChars += 10; // Overhead for message formatting
    }
    
    return Math.ceil(totalChars / 4);
  }
  
  /**
   * Check if proceeding with an API call would exceed budget limits
   * 
   * @param model - Model to use
   * @param estimatedInputTokens - Estimated input token count
   * @returns Whether the budget would be exceeded
   */
  private checkBudgetLimits(model: string, estimatedInputTokens: number): boolean {
    // Check if budget tracking is enabled
    if (!this.config.trackTokens) {
      return false;
    }
    
    // Get current budget status
    const budgetStatus = this.logger.getBudgetStatus();
    
    // If already exceeded, return true
    if (budgetStatus.exceeded) {
      this.logger.warn("Budget already exceeded, cannot proceed with API call");
      return true;
    }
    
    // Estimate the upper bound of what this call might cost
    // Assume max output tokens as a worst-case scenario
    const maxOutputTokens = this.config.maxTokens as number;
    const estimatedCost = this.logger.calculateCost(model, estimatedInputTokens, maxOutputTokens);
    const worstCaseTotalCost = budgetStatus.currentCost + estimatedCost;
    
    // Check if this would exceed cost budget
    if (budgetStatus.maxCost && worstCaseTotalCost > budgetStatus.maxCost) {
      this.logger.warn(`API call would exceed cost budget: $${worstCaseTotalCost.toFixed(4)} > $${budgetStatus.maxCost.toFixed(4)}`);
      return true;
    }
    
    // Check if this would exceed token budget
    const worstCaseTotalTokens = budgetStatus.currentTokens + estimatedInputTokens + maxOutputTokens;
    if (budgetStatus.maxTokens && worstCaseTotalTokens > budgetStatus.maxTokens) {
      this.logger.warn(`API call would exceed token budget: ${worstCaseTotalTokens} > ${budgetStatus.maxTokens}`);
      return true;
    }
    
    return false;
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
    
    // Estimate input tokens
    const estimatedInputTokens = this.estimateTokenCount(messages);
    
    this.logger.debug(`Chat completion request`, {
      model,
      temperature,
      maxTokens,
      messageCount: messages.length,
      estimatedInputTokens,
    });
    
    // Check budget limits
    if (this.checkBudgetLimits(model, estimatedInputTokens)) {
      throw new Error(`Budget limit would be exceeded by this API call`);
    }
    
    try {
      this.logger.startSection(`api_call_${model}`);
      
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
        this.logger.error(`OpenRouter API error (${response.status})`, { error: errorText });
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // Get actual token usage from response if available
      const usage = data.usage || {
        prompt_tokens: estimatedInputTokens,
        completion_tokens: Math.ceil(data.choices[0].message.content.length / 4),
        total_tokens: 0
      };
      
      // Calculate total tokens if not provided
      if (!usage.total_tokens) {
        usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
      }
      
      // Calculate cost
      const cost = this.logger.calculateCost(model, usage.prompt_tokens, usage.completion_tokens);
      
      // Track usage
      if (this.config.trackTokens) {
        this.logger.trackApiUsage(model, usage.prompt_tokens, usage.completion_tokens, cost);
      }
      
      this.logger.info(`API call completed`, {
        model,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: cost.toFixed(6),
      });
      
      this.logger.endSection(`api_call_${model}`);
      
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
