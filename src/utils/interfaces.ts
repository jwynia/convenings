/**
 * Core interfaces for dependency injection
 * Provides interface definitions for injectable services and utilities
 */

/**
 * Agent interface for dependency injection
 */
export interface IAgent {
  /**
   * Unique identifier for the agent
   */
  id: string;

  /**
   * Execute a request with the agent
   *
   * @param input - The input to process
   * @returns The agent's response
   */
  execute(input: string): Promise<string>;
}

/**
 * Tool interface for dependency injection
 */
export interface ITool {
  /**
   * Unique identifier for the tool
   */
  id: string;

  /**
   * Execute the tool with the given parameters
   *
   * @param params - Parameters for tool execution
   * @returns Result of tool execution
   */
  execute(params: Record<string, unknown>): Promise<unknown>;
}

/**
 * Agent configuration interface
 */
export interface IAgentConfig {
  /**
   * Unique identifier for the agent
   */
  id: string;

  /**
   * Model identifier to use for the agent
   */
  model: string;

  /**
   * Optional list of abilities
   */
  abilities?: string[];

  /**
   * Additional configuration options
   */
  [key: string]: unknown;
}

/**
 * Tool configuration interface
 */
export interface IToolConfig {
  /**
   * Unique identifier for the tool
   */
  id: string;

  /**
   * Description of the tool's functionality
   */
  description: string;

  /**
   * Function to handle tool execution
   */
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Workflow result interface
 */
export interface IWorkflowResult {
  /**
   * Unique identifier for the workflow
   */
  id: string;

  /**
   * Status of workflow execution
   */
  status: "success" | "error";

  /**
   * Output from workflow execution
   */
  output: unknown;
}

/**
 * Core Mastra functionality interface
 */
export interface IMastraCore {
  /**
   * Create a new agent
   *
   * @param config - Configuration for the agent
   * @returns The created agent
   */
  createAgent(config: IAgentConfig): IAgent;

  /**
   * Create a new tool
   *
   * @param config - Configuration for the tool
   * @returns The created tool
   */
  createTool(config: IToolConfig): ITool;

  /**
   * Execute a workflow
   *
   * @param workflowId - Identifier for the workflow to execute
   * @param params - Parameters for workflow execution
   * @returns Result of workflow execution
   */
  executeWorkflow(
    workflowId: string,
    params: Record<string, unknown>,
  ): Promise<IWorkflowResult>;
}

/**
 * Interface for string utility functions
 * This allows for dependency injection of string utilities
 */
export interface IStringUtils {
  /**
   * Format a string by replacing placeholders with values
   *
   * @param template - String template with {placeholder} syntax
   * @param values - Object containing values to replace placeholders
   * @returns Formatted string with placeholders replaced
   */
  formatString(template: string, values: Record<string, unknown>): string;

  /**
   * Truncate a string to a maximum length and add ellipsis if truncated
   *
   * @param str - String to truncate
   * @param maxLength - Maximum length of the string
   * @returns Truncated string with ellipsis if needed
   */
  truncateString(str: string, maxLength: number): string;

  /**
   * Capitalize the first letter of each word in a string
   *
   * @param str - String to capitalize
   * @returns String with first letter of each word capitalized
   */
  capitalizeWords(str: string): string;

  /**
   * Generate a slug from a string (URL-friendly version)
   *
   * @param str - String to convert to slug
   * @returns URL-friendly slug
   */
  slugify(str: string): string;
}
