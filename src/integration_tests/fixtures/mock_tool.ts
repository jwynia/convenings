/**
 * Mock tool implementation for integration testing
 * Provides predictable responses without invoking real external services
 */

import { ITool, IToolConfig } from "../../utils/interfaces.ts";

/**
 * Extended configuration for mock tools
 */
export interface MockToolConfig extends IToolConfig {
  /**
   * Predefined responses for specific parameter combinations
   * Tool will attempt to match parameters to the keys in this record
   */
  responses?: Record<string, unknown>;
  
  /**
   * Default response for parameter combinations without a specific match
   */
  defaultResponse?: unknown;
  
  /**
   * Whether to log all invocations
   */
  logInvocations?: boolean;
}

/**
 * Recorded invocation of the mock tool
 */
export interface ToolInvocation {
  params: Record<string, unknown>;
  result: unknown;
  timestamp: Date;
}

/**
 * Implementation of ITool that provides predictable responses
 * for testing without calling real external services
 */
export class MockTool implements ITool {
  id: string;
  private config: MockToolConfig;
  private invocations: ToolInvocation[] = [];

  constructor(config: MockToolConfig) {
    this.id = config.id;
    this.config = {
      ...config,
      description: config.description || `Mock tool ${config.id} for testing`,
      defaultResponse: config.defaultResponse !== undefined ? config.defaultResponse : { success: true, message: "Mock tool response" },
      logInvocations: config.logInvocations !== undefined ? config.logInvocations : true,
    };
  }

  /**
   * Execute the tool with the given parameters
   * Returns a predefined response based on parameter matching
   *
   * @param params - Parameters for tool execution
   * @returns Result of tool execution
   */
  async execute(params: Record<string, unknown>): Promise<unknown> {
    // Determine the appropriate response
    let result: unknown;
    
    if (this.config.responses) {
      // First try to find an exact match by stringifying the params
      const paramsKey = JSON.stringify(params);
      if (this.config.responses[paramsKey]) {
        result = this.config.responses[paramsKey];
      } else {
        // If no exact match, check if any of the parameter keys exist and match
        const matchingKey = Object.keys(this.config.responses).find((key) => {
          // Try to parse the key as JSON to compare with params
          try {
            const keyParams = JSON.parse(key);
            // Check if all properties in keyParams exist in params with the same values
            return Object.entries(keyParams).every(([k, v]) => 
              params[k] !== undefined && JSON.stringify(params[k]) === JSON.stringify(v)
            );
          } catch {
            // If the key isn't valid JSON, check if it's a parameter name
            return params[key] !== undefined;
          }
        });
        
        result = matchingKey 
          ? this.config.responses[matchingKey]
          : this.config.defaultResponse;
      }
    } else {
      // No response mapping, use default
      result = this.config.defaultResponse;
    }
    
    // Record the invocation if logging is enabled
    if (this.config.logInvocations) {
      this.invocations.push({
        params: { ...params }, // Clone to avoid reference issues
        result,
        timestamp: new Date(),
      });
    }
    
    // Simulate some processing time to make tests more realistic
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    return result;
  }
  
  /**
   * Get all recorded invocations of this mock tool
   */
  getInvocations(): ToolInvocation[] {
    return [...this.invocations];
  }
  
  /**
   * Clear all recorded invocations
   */
  clearInvocations(): void {
    this.invocations = [];
  }
}

/**
 * Factory function to create a mock tool
 * 
 * @param config - Configuration for the mock tool
 * @returns A new mock tool instance
 */
export function createMockTool(config: MockToolConfig): MockTool {
  return new MockTool(config);
}
