/**
 * Mock implementations of Convenings interfaces for integration testing
 * Provides controlled test environment without invoking external services
 */

import {
  IConveningFacilitator,
  IConveningOutcome,
  IConveningSystem,
  IParticipant,
  IParticipantConfig,
  IParticipantRegistry,
  IResource,
  IResourceConfig,
  IResourceRegistry,
} from "../../convenings/interfaces.ts";

/**
 * Extended configuration for mock participants
 */
export interface MockParticipantConfig extends IParticipantConfig {
  /**
   * Predefined responses for specific inputs
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
 * Recorded interaction with a mock participant
 */
export interface ParticipantInteraction {
  input: string;
  output: string;
  timestamp: Date;
}

/**
 * Implementation of IParticipant for testing purposes
 */
export class MockParticipant implements IParticipant {
  id: string;
  private config: MockParticipantConfig;
  private interactions: ParticipantInteraction[] = [];

  constructor(config: MockParticipantConfig) {
    this.id = config.id;
    this.config = {
      ...config,
      defaultResponse: config.defaultResponse || `Default response from mock participant ${config.id}`,
      logInteractions: config.logInteractions !== undefined ? config.logInteractions : true,
    };
  }

  /**
   * Execute a request with the mock participant
   * 
   * @param input - The input to process
   * @returns The participant's response
   */
  async execute(input: string): Promise<string> {
    // Determine the appropriate response
    let output: string;
    
    if (this.config.responses && this.config.responses[input]) {
      // Use exact match if available
      output = this.config.responses[input];
    } else if (this.config.responses) {
      // Check for partial matches
      const partialMatches = Object.entries(this.config.responses).filter(([pattern]) => {
        try {
          return new RegExp(pattern).test(input);
        } catch {
          return input.includes(pattern);
        }
      });
      
      output = partialMatches.length > 0
        ? partialMatches[0][1]
        : this.config.defaultResponse!;
    } else {
      // No response mapping, use default
      output = this.config.defaultResponse!;
    }
    
    // Record the interaction if enabled
    if (this.config.logInteractions) {
      this.interactions.push({
        input,
        output,
        timestamp: new Date(),
      });
    }
    
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    return output;
  }
  
  /**
   * Get all recorded interactions
   */
  getInteractions(): ParticipantInteraction[] {
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
 * Extended configuration for mock resources
 */
export interface MockResourceConfig extends IResourceConfig {
  /**
   * Predefined responses for specific parameter combinations
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
 * Recorded invocation of a mock resource
 */
export interface ResourceInvocation {
  params: Record<string, unknown>;
  result: unknown;
  timestamp: Date;
}

/**
 * Implementation of IResource for testing purposes
 */
export class MockResource implements IResource {
  id: string;
  private config: MockResourceConfig;
  private invocations: ResourceInvocation[] = [];

  constructor(config: MockResourceConfig) {
    this.id = config.id;
    this.config = {
      ...config,
      description: config.description || `Mock resource ${config.id} for testing`,
      defaultResponse: config.defaultResponse !== undefined ? config.defaultResponse : { success: true, message: "Mock resource response" },
      logInvocations: config.logInvocations !== undefined ? config.logInvocations : true,
    };
  }

  /**
   * Execute the resource with the given parameters
   * 
   * @param params - Parameters for resource execution
   * @returns Result of resource execution
   */
  async execute(params: Record<string, unknown>): Promise<unknown> {
    // Determine the appropriate response
    let result: unknown;
    
    if (this.config.responses) {
      // Try to find an exact match
      const paramsKey = JSON.stringify(params);
      if (this.config.responses[paramsKey]) {
        result = this.config.responses[paramsKey];
      } else {
        // Check for partial matches
        const matchingKey = Object.keys(this.config.responses).find((key) => {
          try {
            const keyParams = JSON.parse(key);
            return Object.entries(keyParams).every(([k, v]) => 
              params[k] !== undefined && JSON.stringify(params[k]) === JSON.stringify(v)
            );
          } catch {
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
    
    // Record the invocation if enabled
    if (this.config.logInvocations) {
      this.invocations.push({
        params: { ...params },
        result,
        timestamp: new Date(),
      });
    }
    
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    return result;
  }
  
  /**
   * Get all recorded invocations
   */
  getInvocations(): ResourceInvocation[] {
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
 * Implementation of IParticipantRegistry for testing purposes
 */
export class MockParticipantRegistry implements IParticipantRegistry {
  private participants: Map<string, IParticipant> = new Map();
  private creationLog: { config: IParticipantConfig, timestamp: Date }[] = [];
  
  /**
   * Create a participant with the specified configuration
   * 
   * @param config - Configuration for the participant
   * @returns The created participant
   */
  createParticipant(config: IParticipantConfig): IParticipant {
    const participant = new MockParticipant({
      ...config,
      defaultResponse: `Default response from registry-created participant ${config.id}`,
    });
    
    this.participants.set(config.id, participant);
    this.creationLog.push({
      config: { ...config },
      timestamp: new Date(),
    });
    
    return participant;
  }
  
  /**
   * Get all participants created by this registry
   */
  getParticipants(): Map<string, IParticipant> {
    return new Map(this.participants);
  }
  
  /**
   * Get the creation log
   */
  getCreationLog(): { config: IParticipantConfig, timestamp: Date }[] {
    return [...this.creationLog];
  }
  
  /**
   * Clear the creation log
   */
  clearCreationLog(): void {
    this.creationLog = [];
  }
}

/**
 * Implementation of IResourceRegistry for testing purposes
 */
export class MockResourceRegistry implements IResourceRegistry {
  private resources: Map<string, IResource> = new Map();
  private creationLog: { config: IResourceConfig, timestamp: Date }[] = [];
  
  /**
   * Create a resource with the specified configuration
   * 
   * @param config - Configuration for the resource
   * @returns The created resource
   */
  createResource(config: IResourceConfig): IResource {
    const resource = new MockResource({
      ...config,
      defaultResponse: { success: true, message: `Default response from registry-created resource ${config.id}` },
    });
    
    this.resources.set(config.id, resource);
    this.creationLog.push({
      config: { ...config },
      timestamp: new Date(),
    });
    
    return resource;
  }
  
  /**
   * Get all resources created by this registry
   */
  getResources(): Map<string, IResource> {
    return new Map(this.resources);
  }
  
  /**
   * Get the creation log
   */
  getCreationLog(): { config: IResourceConfig, timestamp: Date }[] {
    return [...this.creationLog];
  }
  
  /**
   * Clear the creation log
   */
  clearCreationLog(): void {
    this.creationLog = [];
  }
}

/**
 * Configuration for the mock convening facilitator
 */
export interface MockFacilitatorConfig {
  /**
   * Predefined outcomes for specific activity executions
   */
  activityOutcomes?: Record<string, Record<string, IConveningOutcome>>;
  
  /**
   * Whether to log all executions
   */
  logExecutions?: boolean;
}

/**
 * Implementation of IConveningFacilitator for testing purposes
 */
export class MockConveningFacilitator implements IConveningFacilitator {
  private config: MockFacilitatorConfig;
  private executionLog: { activityId: string, params: Record<string, unknown>, outcome: IConveningOutcome, timestamp: Date }[] = [];
  
  constructor(config: MockFacilitatorConfig = {}) {
    this.config = {
      ...config,
      logExecutions: config.logExecutions !== undefined ? config.logExecutions : true,
    };
  }
  
  /**
   * Execute an activity with the specified parameters
   * 
   * @param activityId - Identifier for the activity to execute
   * @param params - Parameters for activity execution
   * @returns Result of activity execution
   */
  async executeActivity(
    activityId: string,
    params: Record<string, unknown>,
  ): Promise<IConveningOutcome> {
    let outcome: IConveningOutcome;
    
    // Check if we have a predefined outcome
    if (
      this.config.activityOutcomes &&
      this.config.activityOutcomes[activityId]
    ) {
      // Try to find an exact match
      const paramsKey = JSON.stringify(params);
      if (this.config.activityOutcomes[activityId][paramsKey]) {
        outcome = this.config.activityOutcomes[activityId][paramsKey];
      } else {
        // Default outcome
        outcome = {
          id: `${activityId}-${Date.now()}`,
          status: "success",
          output: `Mock activity ${activityId} executed with params: ${JSON.stringify(params)}`,
        };
      }
    } else {
      // Default outcome
      outcome = {
        id: `${activityId}-${Date.now()}`,
        status: "success",
        output: `Mock activity ${activityId} executed with params: ${JSON.stringify(params)}`,
      };
    }
    
    // Log the execution if enabled
    if (this.config.logExecutions) {
      this.executionLog.push({
        activityId,
        params: { ...params },
        outcome: { ...outcome },
        timestamp: new Date(),
      });
    }
    
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 20));
    
    return outcome;
  }
  
  /**
   * Get the execution log
   */
  getExecutionLog(): { activityId: string, params: Record<string, unknown>, outcome: IConveningOutcome, timestamp: Date }[] {
    return [...this.executionLog];
  }
  
  /**
   * Clear the execution log
   */
  clearExecutionLog(): void {
    this.executionLog = [];
  }
}

/**
 * Configuration for the mock convening system
 */
export interface MockConveningSystemConfig {
  /**
   * Participant registry to use
   * If not provided, a new MockParticipantRegistry will be created
   */
  participantRegistry?: IParticipantRegistry;
  
  /**
   * Resource registry to use
   * If not provided, a new MockResourceRegistry will be created
   */
  resourceRegistry?: IResourceRegistry;
  
  /**
   * Convening facilitator to use
   * If not provided, a new MockConveningFacilitator will be created
   */
  facilitator?: IConveningFacilitator;
  
  /**
   * Whether to log all operations
   */
  logOperations?: boolean;
}

/**
 * Implementation of IConveningSystem for testing purposes
 */
export class MockConveningSystem implements IConveningSystem {
  private participantRegistry: IParticipantRegistry;
  private resourceRegistry: IResourceRegistry;
  private facilitator: IConveningFacilitator;
  private config: MockConveningSystemConfig;
  private operationLog: { type: string, params: unknown, timestamp: Date }[] = [];
  
  constructor(config: MockConveningSystemConfig = {}) {
    this.participantRegistry = config.participantRegistry || new MockParticipantRegistry();
    this.resourceRegistry = config.resourceRegistry || new MockResourceRegistry();
    this.facilitator = config.facilitator || new MockConveningFacilitator();
    
    this.config = {
      ...config,
      logOperations: config.logOperations !== undefined ? config.logOperations : true,
    };
  }
  
  /**
   * Create a new participant
   * 
   * @param config - Configuration for the participant
   * @returns The created participant
   */
  createParticipant(config: IParticipantConfig): IParticipant {
    // Log the operation if enabled
    if (this.config.logOperations) {
      this.operationLog.push({
        type: "createParticipant",
        params: { ...config },
        timestamp: new Date(),
      });
    }
    
    return this.participantRegistry.createParticipant(config);
  }
  
  /**
   * Create a new resource
   * 
   * @param config - Configuration for the resource
   * @returns The created resource
   */
  createResource(config: IResourceConfig): IResource {
    // Log the operation if enabled
    if (this.config.logOperations) {
      this.operationLog.push({
        type: "createResource",
        params: { ...config },
        timestamp: new Date(),
      });
    }
    
    return this.resourceRegistry.createResource(config);
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
    // Log the operation if enabled
    if (this.config.logOperations) {
      this.operationLog.push({
        type: "executeActivity",
        params: { activityId, params: { ...params } },
        timestamp: new Date(),
      });
    }
    
    return this.facilitator.executeActivity(activityId, params);
  }
  
  /**
   * Get the operation log
   */
  getOperationLog(): { type: string, params: unknown, timestamp: Date }[] {
    return [...this.operationLog];
  }
  
  /**
   * Clear the operation log
   */
  clearOperationLog(): void {
    this.operationLog = [];
  }
  
  /**
   * Get the participant registry
   */
  getParticipantRegistry(): IParticipantRegistry {
    return this.participantRegistry;
  }
  
  /**
   * Get the resource registry
   */
  getResourceRegistry(): IResourceRegistry {
    return this.resourceRegistry;
  }
  
  /**
   * Get the convening facilitator
   */
  getFacilitator(): IConveningFacilitator {
    return this.facilitator;
  }
}

/**
 * Factory function to create a mock participant
 * 
 * @param config - Configuration for the mock participant
 * @returns A new mock participant instance
 */
export function createMockParticipant(config: MockParticipantConfig): MockParticipant {
  return new MockParticipant(config);
}

/**
 * Factory function to create a mock resource
 * 
 * @param config - Configuration for the mock resource
 * @returns A new mock resource instance
 */
export function createMockResource(config: MockResourceConfig): MockResource {
  return new MockResource(config);
}

/**
 * Factory function to create a mock convening system
 * 
 * @param config - Configuration for the mock convening system
 * @returns A new mock convening system instance
 */
export function createMockConveningSystem(config: MockConveningSystemConfig = {}): MockConveningSystem {
  return new MockConveningSystem(config);
}
