/**
 * Mock agent implementation for integration testing
 * Provides predictable responses without invoking real LLM APIs
 */

import { IAgent, IAgentConfig } from "../../utils/interfaces.ts";

/**
 * Extended configuration for mock agents
 */
export interface MockAgentConfig extends IAgentConfig {
  /**
   * Predefined responses for specific inputs
   * If not matched, will use defaultResponse
   */
  responses?: Record<string, string>;
  
  /**
   * Default response for inputs without a specific match
   */
  defaultResponse?: string;
  
  /**
   * Whether to log all interactions
   */
  logInteractions?: boolean;
}

/**
 * Recorded interaction with the mock agent
 */
export interface AgentInteraction {
  input: string;
  output: string;
  timestamp: Date;
}

/**
 * Implementation of IAgent that provides predictable responses
 * for testing without calling real LLM APIs
 */
export class MockAgent implements IAgent {
  id: string;
  private config: MockAgentConfig;
  private interactions: AgentInteraction[] = [];

  constructor(config: MockAgentConfig) {
    this.id = config.id;
    this.config = {
      ...config,
      defaultResponse: config.defaultResponse || "Mock response for testing purposes.",
      logInteractions: config.logInteractions !== undefined ? config.logInteractions : true,
    };
  }

  /**
   * Execute a request with the mock agent
   * Returns a predefined response based on input matching
   *
   * @param input - The input to process
   * @returns The mock agent's response
   */
  async execute(input: string): Promise<string> {
    // Determine the appropriate response
    let output: string;
    
    if (this.config.responses && this.config.responses[input]) {
      // Use the exact match if available
      output = this.config.responses[input];
    } else if (this.config.responses) {
      // Check for partial matches using regex patterns as keys
      const partialMatches = Object.entries(this.config.responses).filter(([pattern]) => {
        try {
          return new RegExp(pattern).test(input);
        } catch {
          // If the key isn't a valid regex pattern, treat as a literal string
          return input.includes(pattern);
        }
      });
      
      if (partialMatches.length > 0) {
        // Use the first matching pattern's response
        output = partialMatches[0][1];
      } else {
        // No matches, use default
        output = this.config.defaultResponse!;
      }
    } else {
      // No response mapping, use default
      output = this.config.defaultResponse!;
    }
    
    // Record the interaction if logging is enabled
    if (this.config.logInteractions) {
      this.interactions.push({
        input,
        output,
        timestamp: new Date(),
      });
    }
    
    // Simulate some processing time to make tests more realistic
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    return output;
  }
  
  /**
   * Get all recorded interactions with this mock agent
   */
  getInteractions(): AgentInteraction[] {
    return [...this.interactions];
  }
  
  /**
   * Clear all recorded interactions
   */
  clearInteractions(): void {
    this.interactions = [];
  }
}

/**
 * Factory function to create a mock agent
 * 
 * @param config - Configuration for the mock agent
 * @returns A new mock agent instance
 */
export function createMockAgent(config: MockAgentConfig): MockAgent {
  return new MockAgent(config);
}
