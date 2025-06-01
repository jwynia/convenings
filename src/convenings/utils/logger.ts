/**
 * Logger Implementation
 * Provides logging, token tracking, and budget management
 */

import { ensureDirSync } from "https://deno.land/std@0.171.0/fs/ensure_dir.ts";
import { dirname } from "https://deno.land/std@0.171.0/path/mod.ts";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Log level
   * Default: LogLevel.INFO
   */
  logLevel?: LogLevel;
  
  /**
   * Path to log file
   * If provided, logs will be written to this file
   */
  logFilePath?: string;
  
  /**
   * Whether to output logs to console
   * Default: true
   */
  consoleOutput?: boolean;
  
  /**
   * Whether to append timestamps to log entries
   * Default: true
   */
  includeTimestamps?: boolean;
  
  /**
   * Whether to append log levels to log entries
   * Default: true
   */
  includeLogLevels?: boolean;
  
  /**
   * Whether to format log objects as JSON
   * Default: true
   */
  formatJson?: boolean;
  
  /**
   * Custom logger name
   * Default: "convenings"
   */
  loggerName?: string;
}

/**
 * Budget configuration
 */
export interface BudgetConfig {
  /**
   * Maximum token budget
   * If exceeded, operations will be rejected
   */
  maxTokens?: number;
  
  /**
   * Maximum cost budget in USD
   * If exceeded, operations will be rejected
   */
  maxCost?: number;
  
  /**
   * Threshold at which to log warnings (0.0-1.0)
   * Default: 0.8 (80% of max)
   */
  warningThreshold?: number;
}

/**
 * API usage metrics
 */
export interface ApiUsageMetrics {
  /**
   * Total number of API calls
   */
  totalCalls: number;
  
  /**
   * Total number of input tokens
   */
  inputTokens: number;
  
  /**
   * Total number of output tokens
   */
  outputTokens: number;
  
  /**
   * Total number of tokens (input + output)
   */
  totalTokens: number;
  
  /**
   * Estimated cost in USD
   */
  estimatedCost: number;
  
  /**
   * Breakdown by model
   */
  byModel: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  }>;
}

/**
 * Budget status
 */
export interface BudgetStatus {
  /**
   * Current token usage
   */
  currentTokens: number;
  
  /**
   * Current cost in USD
   */
  currentCost: number;
  
  /**
   * Maximum token budget
   */
  maxTokens?: number;
  
  /**
   * Maximum cost budget in USD
   */
  maxCost?: number;
  
  /**
   * Warning threshold (0.0-1.0)
   */
  warningThreshold: number;
  
  /**
   * Whether budget has been exceeded
   */
  exceeded: boolean;
  
  /**
   * Percentage of budget used (0.0-1.0)
   */
  percentUsed: {
    /**
     * Percentage of token budget used
     */
    tokens: number;
    
    /**
     * Percentage of cost budget used
     */
    cost: number;
  };
}

/**
 * API cost calculation
 */
export interface ApiCost {
  /**
   * Cost per 1K input tokens
   */
  inputCostPer1K: number;
  
  /**
   * Cost per 1K output tokens
   */
  outputCostPer1K: number;
}

/**
 * Logger interface
 */
export interface ILogger {
  /**
   * Log debug message
   * 
   * @param message - Message to log
   * @param data - Additional data to log
   */
  debug(message: string, data?: unknown): void;
  
  /**
   * Log info message
   * 
   * @param message - Message to log
   * @param data - Additional data to log
   */
  info(message: string, data?: unknown): void;
  
  /**
   * Log warning message
   * 
   * @param message - Message to log
   * @param data - Additional data to log
   */
  warn(message: string, data?: unknown): void;
  
  /**
   * Log error message
   * 
   * @param message - Message to log
   * @param data - Additional data to log
   */
  error(message: string, data?: unknown): void;
  
  /**
   * Start a new log section
   * 
   * @param sectionName - Name of the section
   */
  startSection(sectionName: string): void;
  
  /**
   * End the current log section
   * 
   * @param sectionName - Name of the section to end
   */
  endSection(sectionName: string): void;
  
  /**
   * Track API usage for a model
   * 
   * @param model - Model name
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cost - Cost in USD
   */
  trackApiUsage(model: string, inputTokens: number, outputTokens: number, cost: number): void;
  
  /**
   * Get API usage metrics
   * 
   * @returns API usage metrics
   */
  getApiUsageMetrics(): ApiUsageMetrics;
  
  /**
   * Get budget status
   * 
   * @returns Budget status
   */
  getBudgetStatus(): BudgetStatus;
  
  /**
   * Calculate cost for a model
   * 
   * @param model - Model name
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @returns Cost in USD
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number;
  
  /**
   * Save data to a file
   * 
   * @param data - Data to save
   * @param filePath - File path
   * @param format - File format
   */
  saveToFile(data: unknown, filePath: string, format?: "json" | "md" | "txt"): Promise<void>;
}

/**
 * Model pricing information
 * Prices verified with OpenRouter API documentation
 */
const MODEL_PRICING: Record<string, ApiCost> = {
  // OpenAI models
  "openai/gpt-4": { inputCostPer1K: 0.03, outputCostPer1K: 0.06 },
  "openai/gpt-4o": { inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
  "openai/gpt-4-turbo": { inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
  "openai/gpt-4-1106-preview": { inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
  "openai/gpt-4-vision-preview": { inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
  "openai/gpt-3.5-turbo": { inputCostPer1K: 0.0005, outputCostPer1K: 0.0015 },
  "openai/gpt-3.5-turbo-16k": { inputCostPer1K: 0.001, outputCostPer1K: 0.002 },
  
  // Anthropic models
  "anthropic/claude-3-opus": { inputCostPer1K: 0.015, outputCostPer1K: 0.075 },
  "anthropic/claude-3-sonnet": { inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  "anthropic/claude-3-haiku": { inputCostPer1K: 0.00025, outputCostPer1K: 0.00125 },
  "anthropic/claude-2": { inputCostPer1K: 0.008, outputCostPer1K: 0.024 },
  "anthropic/claude-2.0": { inputCostPer1K: 0.008, outputCostPer1K: 0.024 },
  "anthropic/claude-2.1": { inputCostPer1K: 0.008, outputCostPer1K: 0.024 },
  "anthropic/claude-instant-1": { inputCostPer1K: 0.0008, outputCostPer1K: 0.0024 },
  
  // Google models
  "google/gemini-pro": { inputCostPer1K: 0.00025, outputCostPer1K: 0.0005 },
  "google/gemini-pro-vision": { inputCostPer1K: 0.00025, outputCostPer1K: 0.0005 },
  "google/palm-2-chat-bison": { inputCostPer1K: 0.0005, outputCostPer1K: 0.0005 },
  "google/palm-2-codechat-bison": { inputCostPer1K: 0.0005, outputCostPer1K: 0.0005 },
  
  // Mistral models
  "mistral/mistral-7b-instruct": { inputCostPer1K: 0.0002, outputCostPer1K: 0.0002 },
  "mistral/mistral-medium": { inputCostPer1K: 0.0027, outputCostPer1K: 0.0027 },
  "mistral/mistral-small": { inputCostPer1K: 0.0007, outputCostPer1K: 0.0007 },
  "mistral/mistral-large": { inputCostPer1K: 0.008, outputCostPer1K: 0.024 },
  "mistral/mixtral-8x7b-instruct": { inputCostPer1K: 0.0006, outputCostPer1K: 0.0006 },
  
  // Cohere models
  "cohere/command": { inputCostPer1K: 0.0005, outputCostPer1K: 0.0015 },
  "cohere/command-light": { inputCostPer1K: 0.0003, outputCostPer1K: 0.0006 },
  "cohere/command-r": { inputCostPer1K: 0.001, outputCostPer1K: 0.003 },
  "cohere/command-r-plus": { inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  
  // Meta models
  "meta/llama-2-13b-chat": { inputCostPer1K: 0.0004, outputCostPer1K: 0.0004 },
  "meta/llama-2-70b-chat": { inputCostPer1K: 0.0008, outputCostPer1K: 0.0008 },
  "meta/llama-3-8b-instruct": { inputCostPer1K: 0.0002, outputCostPer1K: 0.0002 },
  "meta/llama-3-70b-instruct": { inputCostPer1K: 0.0015, outputCostPer1K: 0.0015 },
  
  // Other models
  "perplexity/pplx-7b-chat": { inputCostPer1K: 0.0004, outputCostPer1K: 0.0004 },
  "perplexity/pplx-70b-chat": { inputCostPer1K: 0.0008, outputCostPer1K: 0.0008 },
  "perplexity/sonar-small-chat": { inputCostPer1K: 0.0002, outputCostPer1K: 0.0002 },
  "perplexity/sonar-medium-chat": { inputCostPer1K: 0.0006, outputCostPer1K: 0.0006 },
  
  // Default fallback pricing (if model not found)
  "default": { inputCostPer1K: 0.005, outputCostPer1K: 0.015 }
};

/**
 * Convert data to JSON string
 * 
 * @param data - Data to convert
 * @returns JSON string
 */
function toJsonString(data: unknown): string {
  if (typeof data === "object" && data !== null) {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  return String(data);
}

/**
 * Logger implementation
 */
export class Logger implements ILogger {
  private config: Required<LoggerConfig>;
  private budget: BudgetConfig;
  private activeSections: Map<string, number> = new Map();
  private apiUsage: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
    byModel: Record<string, {
      calls: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
    }>;
  };
  
  /**
   * Create a new logger
   * 
   * @param config - Logger configuration
   * @param budget - Budget configuration
   */
  constructor(config: LoggerConfig = {}, budget: BudgetConfig = {}) {
    this.config = {
      logLevel: config.logLevel ?? LogLevel.INFO,
      logFilePath: config.logFilePath,
      consoleOutput: config.consoleOutput ?? true,
      includeTimestamps: config.includeTimestamps ?? true,
      includeLogLevels: config.includeLogLevels ?? true,
      formatJson: config.formatJson ?? true,
      loggerName: config.loggerName ?? "convenings",
    };
    
    this.budget = {
      maxTokens: budget.maxTokens,
      maxCost: budget.maxCost,
      warningThreshold: budget.warningThreshold ?? 0.8,
    };
    
    this.apiUsage = {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: 0,
      byModel: {},
    };
    
    // Create log file directory if needed
    if (this.config.logFilePath) {
      try {
        ensureDirSync(dirname(this.config.logFilePath));
      } catch (error) {
        console.error(`Failed to create log directory: ${error.message}`);
      }
    }
    
    // Log initialization
    this.info("Logger initialized", {
      logLevel: this.getLevelName(this.config.logLevel),
      budgetLimits: {
        maxTokens: this.budget.maxTokens,
        maxCost: this.budget.maxCost ? `$${this.budget.maxCost.toFixed(2)}` : "unlimited",
      },
    });
  }
  
  /**
   * Get level name for a log level
   * 
   * @param level - Log level
   * @returns Level name
   */
  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return "DEBUG";
      case LogLevel.INFO: return "INFO";
      case LogLevel.WARN: return "WARN";
      case LogLevel.ERROR: return "ERROR";
      default: return "UNKNOWN";
    }
  }
  
  /**
   * Log a message
   * 
   * @param level - Log level
   * @param message - Message to log
   * @param data - Additional data to log
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.config.logLevel) {
      return;
    }
    
    const timestamp = this.config.includeTimestamps ? new Date().toISOString() : "";
    const levelName = this.config.includeLogLevels ? this.getLevelName(level) : "";
    const prefix = `${timestamp ? `[${timestamp}] ` : ""}${levelName ? `[${levelName}] ` : ""}[${this.config.loggerName}]`;
    
    let logEntry = `${prefix} ${message}`;
    
    if (data !== undefined) {
      if (this.config.formatJson && typeof data === "object" && data !== null) {
        logEntry += `\n${toJsonString(data)}`;
      } else {
        logEntry += ` ${String(data)}`;
      }
    }
    
    // Output to console
    if (this.config.consoleOutput) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(logEntry);
          break;
        case LogLevel.INFO:
          console.info(logEntry);
          break;
        case LogLevel.WARN:
          console.warn(logEntry);
          break;
        case LogLevel.ERROR:
          console.error(logEntry);
          break;
      }
    }
    
    // Write to log file
    if (this.config.logFilePath) {
      try {
        Deno.writeTextFileSync(
          this.config.logFilePath,
          logEntry + "\n",
          { append: true, create: true }
        );
      } catch (error) {
        console.error(`Failed to write to log file: ${error.message}`);
      }
    }
  }
  
  /**
   * Log debug message
   * 
   * @param message - Message to log
   * @param data - Additional data to log
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log info message
   * 
   * @param message - Message to log
   * @param data - Additional data to log
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log warning message
   * 
   * @param message - Message to log
   * @param data - Additional data to log
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log error message
   * 
   * @param message - Message to log
   * @param data - Additional data to log
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  /**
   * Start a new log section
   * 
   * @param sectionName - Name of the section
   */
  startSection(sectionName: string): void {
    const startTime = Date.now();
    this.activeSections.set(sectionName, startTime);
    this.debug(`Starting section: ${sectionName}`);
  }
  
  /**
   * End the current log section
   * 
   * @param sectionName - Name of the section to end
   */
  endSection(sectionName: string): void {
    const startTime = this.activeSections.get(sectionName);
    
    if (startTime) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.debug(`Ended section: ${sectionName}`, { 
        durationMs: duration,
        durationSec: (duration / 1000).toFixed(2)
      });
      this.activeSections.delete(sectionName);
    } else {
      this.warn(`Attempted to end unknown section: ${sectionName}`);
    }
  }
  
  /**
   * Track API usage for a model
   * 
   * @param model - Model name
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cost - Cost in USD
   */
  trackApiUsage(model: string, inputTokens: number, outputTokens: number, cost: number): void {
    // Initialize model tracking if not exists
    if (!this.apiUsage.byModel[model]) {
      this.apiUsage.byModel[model] = {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
      };
    }
    
    // Update overall usage
    this.apiUsage.calls++;
    this.apiUsage.inputTokens += inputTokens;
    this.apiUsage.outputTokens += outputTokens;
    this.apiUsage.totalTokens += (inputTokens + outputTokens);
    this.apiUsage.cost += cost;
    
    // Update model-specific usage
    const modelUsage = this.apiUsage.byModel[model];
    modelUsage.calls++;
    modelUsage.inputTokens += inputTokens;
    modelUsage.outputTokens += outputTokens;
    modelUsage.totalTokens += (inputTokens + outputTokens);
    modelUsage.cost += cost;
    
    // Check if budget is exceeded
    const budgetStatus = this.getBudgetStatus();
    
    if (budgetStatus.exceeded) {
      this.warn("Budget exceeded!", {
        tokens: {
          current: budgetStatus.currentTokens,
          max: budgetStatus.maxTokens,
          percentUsed: (budgetStatus.percentUsed.tokens * 100).toFixed(1) + "%",
        },
        cost: {
          current: `$${budgetStatus.currentCost.toFixed(4)}`,
          max: budgetStatus.maxCost ? `$${budgetStatus.maxCost.toFixed(4)}` : "unlimited",
          percentUsed: (budgetStatus.percentUsed.cost * 100).toFixed(1) + "%",
        },
      });
    } else if (
      (budgetStatus.maxTokens && budgetStatus.percentUsed.tokens >= this.budget.warningThreshold!) ||
      (budgetStatus.maxCost && budgetStatus.percentUsed.cost >= this.budget.warningThreshold!)
    ) {
      this.warn("Budget warning - approaching limit", {
        tokens: {
          current: budgetStatus.currentTokens,
          max: budgetStatus.maxTokens,
          percentUsed: (budgetStatus.percentUsed.tokens * 100).toFixed(1) + "%",
        },
        cost: {
          current: `$${budgetStatus.currentCost.toFixed(4)}`,
          max: budgetStatus.maxCost ? `$${budgetStatus.maxCost.toFixed(4)}` : "unlimited",
          percentUsed: (budgetStatus.percentUsed.cost * 100).toFixed(1) + "%",
        },
      });
    }
    
    // Log detailed usage for debug
    this.debug("API usage tracked", { 
      model, 
      inputTokens, 
      outputTokens, 
      totalTokens: inputTokens + outputTokens,
      cost: `$${cost.toFixed(6)}`,
      totalUsage: {
        calls: this.apiUsage.calls,
        totalTokens: this.apiUsage.totalTokens,
        totalCost: `$${this.apiUsage.cost.toFixed(6)}`,
      }
    });
  }
  
  /**
   * Get API usage metrics
   * 
   * @returns API usage metrics
   */
  getApiUsageMetrics(): ApiUsageMetrics {
    return {
      totalCalls: this.apiUsage.calls,
      inputTokens: this.apiUsage.inputTokens,
      outputTokens: this.apiUsage.outputTokens,
      totalTokens: this.apiUsage.totalTokens,
      estimatedCost: this.apiUsage.cost,
      byModel: Object.fromEntries(
        Object.entries(this.apiUsage.byModel).map(([model, usage]) => [
          model,
          {
            calls: usage.calls,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
            estimatedCost: usage.cost,
          }
        ])
      ),
    };
  }
  
  /**
   * Get budget status
   * 
   * @returns Budget status
   */
  getBudgetStatus(): BudgetStatus {
    const currentTokens = this.apiUsage.totalTokens;
    const currentCost = this.apiUsage.cost;
    const { maxTokens, maxCost, warningThreshold } = this.budget;
    
    // Calculate percentages
    const tokenPercent = maxTokens ? currentTokens / maxTokens : 0;
    const costPercent = maxCost ? currentCost / maxCost : 0;
    
    // Check if exceeded
    const exceeded = (maxTokens && currentTokens > maxTokens) || 
                     (maxCost && currentCost > maxCost);
    
    return {
      currentTokens,
      currentCost,
      maxTokens,
      maxCost,
      warningThreshold: warningThreshold!,
      exceeded,
      percentUsed: {
        tokens: tokenPercent,
        cost: costPercent,
      },
    };
  }
  
  /**
   * Calculate cost for a model
   * 
   * @param model - Model name
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @returns Cost in USD
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Find pricing for this model
    let pricing = MODEL_PRICING[model];
    
    // Try to find by prefix if exact match not found
    if (!pricing) {
      const modelPrefix = Object.keys(MODEL_PRICING).find(prefix => model.startsWith(prefix));
      pricing = modelPrefix ? MODEL_PRICING[modelPrefix] : MODEL_PRICING.default;
    }
    
    // Calculate cost
    const inputCost = (inputTokens / 1000) * pricing.inputCostPer1K;
    const outputCost = (outputTokens / 1000) * pricing.outputCostPer1K;
    
    return inputCost + outputCost;
  }
  
  /**
   * Generate output directory path with timestamp
   * 
   * @param basePath - Base path for output
   * @param type - Type of convening (debate, dialogue, etc.)
   * @param scriptPath - Optional path of the executed script, used to organize outputs
   * @returns Path to the output directory
   */
  createOutputDirectory(
    basePath?: string, 
    type: string = "convening",
    scriptPath?: string
  ): string {
    // Default to outputs directory if no path provided
    const outputsDir = basePath || "./outputs";
    
    // Generate timestamp
    const timestamp = new Date().toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "");
    
    // Extract the date part (YYYY-MM-DD) from the timestamp
    const datePart = timestamp.substring(0, 10);
    
    // Process the script path to determine output location
    let scriptDir = "";
    let scriptBaseName = "";
    
    if (scriptPath) {
      this.debug(`Using script path for output organization: ${scriptPath}`);
      
      // Extract directory and filename from the script path
      const lastSlashIndex = scriptPath.lastIndexOf('/');
      
      if (lastSlashIndex !== -1) {
        // Get the directory part (e.g., "examples" from "examples/debate_example.ts")
        scriptDir = scriptPath.substring(0, lastSlashIndex);
        
        // Get the filename without extension (e.g., "debate_example" from "debate_example.ts")
        const fullFilename = scriptPath.substring(lastSlashIndex + 1);
        scriptBaseName = fullFilename.replace(/\.[^/.]+$/, ""); // Remove extension
      } else {
        // Just a filename with no directory
        scriptBaseName = scriptPath.replace(/\.[^/.]+$/, "");
      }
      
      this.debug(`Extracted script directory: "${scriptDir}", base name: "${scriptBaseName}"`);
    }
    
    // Create directory structure based on available information
    let fullPath;
    const dirName = `${timestamp}_${type}`;
    
    if (scriptDir) {
      // Place output in scriptDir/date/timestamp_type directory
      fullPath = `${scriptDir}/${datePart}/${dirName}`;
      this.debug(`Using script directory structure: ${fullPath}`);
    } else {
      // No script directory found, fallback to date/timestamp_type in current directory
      fullPath = `${datePart}/${dirName}`;
      this.debug(`No script directory found, using date structure: ${fullPath}`);
    }
    
    // Ensure directory exists
    ensureDirSync(fullPath);
    ensureDirSync(`${fullPath}/messages`);
    
    this.info(`Created output directory: ${fullPath}`);
    return fullPath;
  }

  /**
   * Save data to a file
   * 
   * @param data - Data to save
   * @param filePath - File path
   * @param format - File format
   */
  async saveToFile(
    data: unknown, 
    filePath: string, 
    format: "json" | "md" | "txt" = "json"
  ): Promise<void> {
    try {
      // Create directory if it doesn't exist
      ensureDirSync(dirname(filePath));
      
      let content = "";
      
      switch (format) {
        case "json":
          content = JSON.stringify(data, null, 2);
          break;
          
        case "md":
          content = this.convertToMarkdown(data);
          break;
          
        case "txt":
          content = this.convertToText(data);
          break;
          
        default:
          content = JSON.stringify(data, null, 2);
      }
      
      await Deno.writeTextFile(filePath, content);
      this.info(`Data saved to ${filePath}`);
    } catch (error) {
      this.error(`Failed to save to file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Convert data to Markdown
   * 
   * @param data - Data to convert
   * @returns Markdown string
   */
  private convertToMarkdown(data: unknown): string {
    if (typeof data !== "object" || data === null) {
      return String(data);
    }
    
    // Check if it's a debate result
    if ("topic" in data && "messages" in data && Array.isArray((data as any).messages)) {
      return this.formatDebateMarkdown(data as any);
    }
    
    // Generic object to markdown
    let markdown = "";
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "object" && value !== null) {
        markdown += `## ${key}\n\n`;
        markdown += `${JSON.stringify(value, null, 2)}\n\n`;
      } else {
        markdown += `## ${key}\n\n${value}\n\n`;
      }
    }
    
    return markdown;
  }
  
  /**
   * Format debate result as Markdown
   * 
   * @param debate - Debate result
   * @returns Markdown string
   */
  private formatDebateMarkdown(debate: any): string {
    let md = `# Debate: ${debate.topic}\n\n`;
    
    // Add metadata
    md += `- **Date:** ${new Date().toISOString()}\n`;
    md += `- **Completed Rounds:** ${debate.completedRounds}\n`;
    md += `- **Total Turns:** ${debate.totalTurns}\n`;
    
    if (debate.apiUsage) {
      md += `- **Total Tokens:** ${debate.apiUsage.totalTokens}\n`;
      md += `- **Estimated Cost:** $${debate.apiUsage.estimatedCost.toFixed(4)}\n`;
    }
    
    md += "\n";
    
    // Add scores if available
    if (debate.scores && Object.keys(debate.scores).length > 0) {
      md += "## Scores\n\n";
      
      for (const [participantId, score] of Object.entries(debate.scores)) {
        const participant = debate.messages.find((m: any) => m.participantId === participantId);
        const name = participant ? participant.participantId : participantId;
        md += `### ${name}: ${(score as any).total.toFixed(2)}\n\n`;
        
        // Add score breakdown
        if ((score as any).breakdown) {
          md += "| Criterion | Score | Weighted |\n";
          md += "|-----------|-------|----------|\n";
          
          for (const [criterion, criterionScore] of Object.entries((score as any).breakdown)) {
            md += `| ${criterion} | ${(criterionScore as any).raw.toFixed(1)} | ${(criterionScore as any).weighted.toFixed(2)} |\n`;
          }
          
          md += "\n";
        }
      }
    }
    
    // Add summary
    if (debate.summary) {
      md += "## Debate Summary\n\n";
      md += `${debate.summary}\n\n`;
    }
    
    // Add transcript
    md += "## Transcript\n\n";
    
    for (const message of debate.messages) {
      const participantId = message.participantId;
      md += `### ${participantId}\n\n`;
      md += `${message.content}\n\n`;
      md += "---\n\n";
    }
    
    return md;
  }
  
  /**
   * Convert data to plain text
   * 
   * @param data - Data to convert
   * @returns Text string
   */
  private convertToText(data: unknown): string {
    if (typeof data !== "object" || data === null) {
      return String(data);
    }
    
    // Check if it's a debate result
    if ("topic" in data && "messages" in data && Array.isArray((data as any).messages)) {
      return this.formatDebateText(data as any);
    }
    
    // Generic object to text
    let text = "";
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "object" && value !== null) {
        text += `${key}:\n${JSON.stringify(value, null, 2)}\n\n`;
      } else {
        text += `${key}: ${value}\n\n`;
      }
    }
    
    return text;
  }
  
  /**
   * Format debate result as plain text
   * 
   * @param debate - Debate result
   * @returns Text string
   */
  private formatDebateText(debate: any): string {
    let text = `DEBATE: ${debate.topic}\n\n`;
    
    // Add metadata
    text += `Date: ${new Date().toISOString()}\n`;
    text += `Completed Rounds: ${debate.completedRounds}\n`;
    text += `Total Turns: ${debate.totalTurns}\n`;
    
    if (debate.apiUsage) {
      text += `Total Tokens: ${debate.apiUsage.totalTokens}\n`;
      text += `Estimated Cost: $${debate.apiUsage.estimatedCost.toFixed(4)}\n`;
    }
    
    text += "\n";
    
    // Add scores if available
    if (debate.scores && Object.keys(debate.scores).length > 0) {
      text += "SCORES\n\n";
      
      for (const [participantId, score] of Object.entries(debate.scores)) {
        const participant = debate.messages.find((m: any) => m.participantId === participantId);
        const name = participant ? participant.participantId : participantId;
        text += `${name}: ${(score as any).total.toFixed(2)}\n`;
        
        // Add score breakdown
        if ((score as any).breakdown) {
          for (const [criterion, criterionScore] of Object.entries((score as any).breakdown)) {
            text += `  ${criterion}: ${(criterionScore as any).raw.toFixed(1)} (weighted: ${(criterionScore as any).weighted.toFixed(2)})\n`;
          }
        }
        
        text += "\n";
      }
    }
    
    // Add summary
    if (debate.summary) {
      text += "DEBATE SUMMARY\n\n";
      text += `${debate.summary}\n\n`;
    }
    
    // Add transcript
    text += "TRANSCRIPT\n\n";
    
    for (const message of debate.messages) {
      const participantId = message.participantId;
      text += `[${participantId}]\n\n`;
      text += `${message.content}\n\n`;
      text += "---\n\n";
    }
    
    return text;
  }
}

/**
 * Create a new logger
 * 
 * @param config - Logger configuration
 * @param budget - Budget configuration
 * @returns New logger instance
 */
export function createLogger(
  config: LoggerConfig = {}, 
  budget: BudgetConfig = {}
): ILogger {
  return new Logger(config, budget);
}
