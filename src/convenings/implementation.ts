/**
 * Convenings implementation based on Mastra
 * This file adapts the Mastra implementation to the Convenings interface
 */

import {
  Mastra,
  IAgentProvider,
  IToolProvider,
  IWorkflowProvider,
  DefaultAgentProvider,
  DefaultToolProvider,
  DefaultWorkflowProvider,
} from "../mastra/mod.ts";

import {
  IConveningSystem,
  IParticipant,
  IParticipantConfig,
  IResource,
  IResourceConfig,
  IConveningOutcome,
  IParticipantRegistry,
  IResourceRegistry,
  IConveningFacilitator,
} from "./interfaces.ts";

/**
 * Adapter class to make IAgentProvider compatible with IParticipantRegistry
 */
class ParticipantRegistryAdapter implements IParticipantRegistry {
  constructor(private agentProvider: IAgentProvider) {}

  createParticipant(config: IParticipantConfig): IParticipant {
    // Convert IParticipantConfig to IAgentConfig (they have the same structure)
    return this.agentProvider.createAgent(config);
  }
}

/**
 * Adapter class to make IToolProvider compatible with IResourceRegistry
 */
class ResourceRegistryAdapter implements IResourceRegistry {
  constructor(private toolProvider: IToolProvider) {}

  createResource(config: IResourceConfig): IResource {
    // Convert IResourceConfig to IToolConfig (they have the same structure)
    return this.toolProvider.createTool(config);
  }
}

/**
 * Adapter class to make IWorkflowProvider compatible with IConveningFacilitator
 */
class ConveningFacilitatorAdapter implements IConveningFacilitator {
  constructor(private workflowProvider: IWorkflowProvider) {}

  async executeActivity(
    activityId: string,
    params: Record<string, unknown>,
  ): Promise<IConveningOutcome> {
    // Execute workflow and return result as IConveningOutcome
    return this.workflowProvider.executeWorkflow(activityId, params);
  }
}

/**
 * ConveningSystem implementation that uses Mastra under the hood
 */
export class ConveningSystem implements IConveningSystem {
  private mastra: Mastra;
  private participantRegistry: IParticipantRegistry;
  private resourceRegistry: IResourceRegistry;
  private conveningFacilitator: IConveningFacilitator;

  /**
   * Create a new ConveningSystem
   *
   * @param participantRegistry - Registry for participant creation (optional)
   * @param resourceRegistry - Registry for resource creation (optional)
   * @param conveningFacilitator - Facilitator for convening execution (optional)
   */
  constructor(
    participantRegistry?: IParticipantRegistry,
    resourceRegistry?: IResourceRegistry,
    conveningFacilitator?: IConveningFacilitator,
  ) {
    // Create adapters if not provided
    const agentProvider = participantRegistry
      ? new class implements IAgentProvider {
          createAgent(config: any): any {
            return participantRegistry.createParticipant(config);
          }
        }()
      : new DefaultAgentProvider();

    const toolProvider = resourceRegistry
      ? new class implements IToolProvider {
          createTool(config: any): any {
            return resourceRegistry.createResource(config);
          }
        }()
      : new DefaultToolProvider();

    const workflowProvider = conveningFacilitator
      ? new class implements IWorkflowProvider {
          async executeWorkflow(id: string, params: Record<string, unknown>): Promise<any> {
            return conveningFacilitator.executeActivity(id, params);
          }
        }()
      : new DefaultWorkflowProvider();

    // Create Mastra instance
    this.mastra = new Mastra(agentProvider, toolProvider, workflowProvider);

    // Create adapters for the Mastra providers
    this.participantRegistry = participantRegistry || new ParticipantRegistryAdapter(agentProvider);
    this.resourceRegistry = resourceRegistry || new ResourceRegistryAdapter(toolProvider);
    this.conveningFacilitator = conveningFacilitator || new ConveningFacilitatorAdapter(workflowProvider);
  }

  /**
   * Create a new participant
   *
   * @param config - Configuration for the participant
   * @returns The created participant
   */
  createParticipant(config: IParticipantConfig): IParticipant {
    return this.mastra.createAgent(config);
  }

  /**
   * Create a new resource
   *
   * @param config - Configuration for the resource
   * @returns The created resource
   */
  createResource(config: IResourceConfig): IResource {
    return this.mastra.createTool(config);
  }

  /**
   * Execute a convening activity
   *
   * @param activityId - Identifier for the activity to execute
   * @param params - Parameters for activity execution
   * @returns Result of activity execution
   */
  async executeActivity(
    activityId: string,
    params: Record<string, unknown>,
  ): Promise<IConveningOutcome> {
    return this.mastra.executeWorkflow(activityId, params);
  }
}

/**
 * Create a new ConveningSystem
 *
 * @param participantRegistry - Registry for participant creation (optional)
 * @param resourceRegistry - Registry for resource creation (optional)
 * @param conveningFacilitator - Facilitator for convening execution (optional)
 * @returns A new ConveningSystem
 */
export function createConvening(
  participantRegistry?: IParticipantRegistry,
  resourceRegistry?: IResourceRegistry,
  conveningFacilitator?: IConveningFacilitator,
): IConveningSystem {
  return new ConveningSystem(participantRegistry, resourceRegistry, conveningFacilitator);
}

// Export a default instance for convenience
export const convening = createConvening();
