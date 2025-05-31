/**
 * Mastra integration module
 * Provides core functionality for Mastra agent system
 */

import {
  IAgent,
  IAgentConfig,
  IMastraCore,
  ITool,
  IToolConfig,
  IWorkflowResult,
} from "../utils/interfaces.ts";

/**
 * Agent Provider interface for dependency injection
 * Allows custom agent creation logic to be injected
 */
export interface IAgentProvider {
  /**
   * Create an agent with the specified configuration
   *
   * @param config - Configuration for the agent
   * @returns The created agent
   */
  createAgent(config: IAgentConfig): IAgent;
}

/**
 * Tool Provider interface for dependency injection
 * Allows custom tool creation logic to be injected
 */
export interface IToolProvider {
  /**
   * Create a tool with the specified configuration
   *
   * @param config - Configuration for the tool
   * @returns The created tool
   */
  createTool(config: IToolConfig): ITool;
}

/**
 * Workflow Provider interface for dependency injection
 * Allows custom workflow execution logic to be injected
 */
export interface IWorkflowProvider {
  /**
   * Execute a workflow with the specified parameters
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
 * Default Agent Provider implementation
 */
export class DefaultAgentProvider implements IAgentProvider {
  /**
   * Create an agent with the specified configuration
   *
   * @param config - Configuration for the agent
   * @returns The created agent
   */
  createAgent(config: IAgentConfig): IAgent {
    return {
      id: config.id,
      execute: async (input: string): Promise<string> => {
        return `Agent ${config.id} executed with input: ${input}`;
      },
    };
  }
}

/**
 * Default Tool Provider implementation
 */
export class DefaultToolProvider implements IToolProvider {
  /**
   * Create a tool with the specified configuration
   *
   * @param config - Configuration for the tool
   * @returns The created tool
   */
  createTool(config: IToolConfig): ITool {
    return {
      id: config.id,
      execute: config.handler,
    };
  }
}

/**
 * Default Workflow Provider implementation
 */
export class DefaultWorkflowProvider implements IWorkflowProvider {
  /**
   * Execute a workflow with the specified parameters
   *
   * @param workflowId - Identifier for the workflow to execute
   * @param params - Parameters for workflow execution
   * @returns Result of workflow execution
   */
  async executeWorkflow(
    workflowId: string,
    params: Record<string, unknown>,
  ): Promise<IWorkflowResult> {
    return {
      id: workflowId,
      status: "success",
      output: `Executed workflow ${workflowId} with params: ${
        JSON.stringify(params)
      }`,
    };
  }
}

/**
 * Mastra Core implementation
 * This implements the IMastraCore interface and uses dependency injection
 */
export class Mastra implements IMastraCore {
  private agents: Map<string, IAgent>;
  private tools: Map<string, IToolConfig>;
  private agentProvider: IAgentProvider;
  private toolProvider: IToolProvider;
  private workflowProvider: IWorkflowProvider;

  /**
   * Create a new Mastra instance
   *
   * @param agentProvider - Provider for agent creation (optional)
   * @param toolProvider - Provider for tool creation (optional)
   * @param workflowProvider - Provider for workflow execution (optional)
   */
  constructor(
    agentProvider: IAgentProvider = new DefaultAgentProvider(),
    toolProvider: IToolProvider = new DefaultToolProvider(),
    workflowProvider: IWorkflowProvider = new DefaultWorkflowProvider(),
  ) {
    this.agents = new Map();
    this.tools = new Map();
    this.agentProvider = agentProvider;
    this.toolProvider = toolProvider;
    this.workflowProvider = workflowProvider;
  }

  /**
   * Create a new agent
   *
   * @param config - Configuration for the agent
   * @returns The created agent
   */
  createAgent(config: IAgentConfig): IAgent {
    const agent = this.agentProvider.createAgent(config);
    this.agents.set(config.id, agent);
    return agent;
  }

  /**
   * Create a new tool
   *
   * @param config - Configuration for the tool
   * @returns The created tool
   */
  createTool(config: IToolConfig): ITool {
    this.tools.set(config.id, config);
    return this.toolProvider.createTool(config);
  }

  /**
   * Execute a workflow
   *
   * @param workflowId - Identifier for the workflow to execute
   * @param params - Parameters for workflow execution
   * @returns Result of workflow execution
   */
  async executeWorkflow(
    workflowId: string,
    params: Record<string, unknown>,
  ): Promise<IWorkflowResult> {
    return this.workflowProvider.executeWorkflow(workflowId, params);
  }
}

/**
 * Create a Mastra instance with optional dependencies
 *
 * @param agentProvider - Provider for agent creation (optional)
 * @param toolProvider - Provider for tool creation (optional)
 * @param workflowProvider - Provider for workflow execution (optional)
 * @returns A new Mastra instance
 */
export function createMastra(
  agentProvider?: IAgentProvider,
  toolProvider?: IToolProvider,
  workflowProvider?: IWorkflowProvider,
): IMastraCore {
  return new Mastra(agentProvider, toolProvider, workflowProvider);
}

// Export a default instance for backward compatibility
export const mastra = createMastra();

// Re-export interfaces from utils for convenience
export type {
  IAgent,
  IAgentConfig,
  IMastraCore,
  ITool,
  IToolConfig,
  IWorkflowResult,
};
