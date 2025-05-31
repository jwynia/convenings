/**
 * Mock implementation of IMastraCore for integration testing
 * Provides a controlled test environment without invoking real LLM APIs
 */

import {
  IAgent,
  IAgentConfig,
  IMastraCore,
  ITool,
  IToolConfig,
  IWorkflowResult,
} from "../../utils/interfaces.ts";
import { MockAgent, createMockAgent } from "./mock_agent.ts";
import { MockTool, createMockTool } from "./mock_tool.ts";

/**
 * Configuration for the mock Mastra core
 */
export interface MockMastraCoreConfig {
  /**
   * Predefined responses for specific workflow executions
   */
  workflowResponses?: Record<string, Record<string, IWorkflowResult>>;
  
  /**
   * Default agent factory override
   */
  defaultAgentFactory?: (config: IAgentConfig) => IAgent;
  
  /**
   * Default tool factory override
   */
  defaultToolFactory?: (config: IToolConfig) => ITool;
  
  /**
   * Whether to log all operations
   */
  logOperations?: boolean;
}

/**
 * Recorded operation in the mock Mastra core
 */
export interface CoreOperation {
  type: "createAgent" | "createTool" | "executeWorkflow";
  params: unknown;
  result: unknown;
  timestamp: Date;
}

/**
 * Implementation of IMastraCore for testing purposes
 * Provides controlled agent and tool creation without external dependencies
 */
export class MockMastraCore implements IMastraCore {
  private config: MockMastraCoreConfig;
  private agents: Map<string, IAgent> = new Map();
  private tools: Map<string, ITool> = new Map();
  private operations: CoreOperation[] = [];
  
  constructor(config: MockMastraCoreConfig = {}) {
    this.config = {
      ...config,
      logOperations: config.logOperations !== undefined ? config.logOperations : true,
    };
  }
  
  /**
   * Create a new agent with the given configuration
   * 
   * @param config - Configuration for the agent
   * @returns The created agent
   */
  createAgent(config: IAgentConfig): IAgent {
    // Use custom factory if provided, otherwise create a mock agent
    const agent = this.config.defaultAgentFactory
      ? this.config.defaultAgentFactory(config)
      : createMockAgent({
          ...config,
          defaultResponse: `Default response from mock agent ${config.id}`,
        });
    
    // Store the agent for future reference
    this.agents.set(config.id, agent);
    
    // Log the operation if enabled
    if (this.config.logOperations) {
      this.operations.push({
        type: "createAgent",
        params: { ...config },
        result: { id: agent.id },
        timestamp: new Date(),
      });
    }
    
    return agent;
  }
  
  /**
   * Create a new tool with the given configuration
   * 
   * @param config - Configuration for the tool
   * @returns The created tool
   */
  createTool(config: IToolConfig): ITool {
    // Use custom factory if provided, otherwise create a mock tool
    const tool = this.config.defaultToolFactory
      ? this.config.defaultToolFactory(config)
      : createMockTool({
          ...config,
          defaultResponse: { success: true, message: `Default response from mock tool ${config.id}` },
        });
    
    // Store the tool for future reference
    this.tools.set(config.id, tool);
    
    // Log the operation if enabled
    if (this.config.logOperations) {
      this.operations.push({
        type: "createTool",
        params: { ...config },
        result: { id: tool.id },
        timestamp: new Date(),
      });
    }
    
    return tool;
  }
  
  /**
   * Execute a workflow with the given ID and parameters
   * 
   * @param workflowId - Identifier for the workflow to execute
   * @param params - Parameters for workflow execution
   * @returns Result of workflow execution
   */
  async executeWorkflow(
    workflowId: string,
    params: Record<string, unknown>,
  ): Promise<IWorkflowResult> {
    let result: IWorkflowResult;
    
    // Check if we have a predefined response for this workflow and params
    if (
      this.config.workflowResponses &&
      this.config.workflowResponses[workflowId]
    ) {
      // Try to find an exact match by stringifying the params
      const paramsKey = JSON.stringify(params);
      if (this.config.workflowResponses[workflowId][paramsKey]) {
        result = this.config.workflowResponses[workflowId][paramsKey];
      } else {
        // Default workflow result if no specific match
        result = {
          id: `${workflowId}-${Date.now()}`,
          status: "success",
          output: `Mock workflow ${workflowId} executed with params: ${JSON.stringify(params)}`,
        };
      }
    } else {
      // Default workflow result
      result = {
        id: `${workflowId}-${Date.now()}`,
        status: "success",
        output: `Mock workflow ${workflowId} executed with params: ${JSON.stringify(params)}`,
      };
    }
    
    // Log the operation if enabled
    if (this.config.logOperations) {
      this.operations.push({
        type: "executeWorkflow",
        params: { workflowId, params: { ...params } },
        result: { ...result },
        timestamp: new Date(),
      });
    }
    
    // Simulate some processing time to make tests more realistic
    await new Promise((resolve) => setTimeout(resolve, 20));
    
    return result;
  }
  
  /**
   * Get all agents created by this core instance
   */
  getAgents(): Map<string, IAgent> {
    return new Map(this.agents);
  }
  
  /**
   * Get all tools created by this core instance
   */
  getTools(): Map<string, ITool> {
    return new Map(this.tools);
  }
  
  /**
   * Get all recorded operations
   */
  getOperations(): CoreOperation[] {
    return [...this.operations];
  }
  
  /**
   * Clear all recorded operations
   */
  clearOperations(): void {
    this.operations = [];
  }
  
  /**
   * Reset the entire core state
   * Clears all agents, tools, and operations
   */
  reset(): void {
    this.agents.clear();
    this.tools.clear();
    this.operations = [];
  }
}

/**
 * Factory function to create a mock Mastra core
 * 
 * @param config - Configuration for the mock Mastra core
 * @returns A new mock Mastra core instance
 */
export function createMockMastraCore(config: MockMastraCoreConfig = {}): MockMastraCore {
  return new MockMastraCore(config);
}
