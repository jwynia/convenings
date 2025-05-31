/**
 * Core interfaces for the Convenings system
 * Provides interface definitions for participants, resources, and convenings
 */

/**
 * Participant interface for dependency injection
 * Represents an entity that can participate in a convening
 */
export interface IParticipant {
  /**
   * Unique identifier for the participant
   */
  id: string;

  /**
   * Execute a request with the participant
   *
   * @param input - The input to process
   * @returns The participant's response
   */
  execute(input: string): Promise<string>;
}

/**
 * Resource interface for dependency injection
 * Represents a tool or utility that can be used in a convening
 */
export interface IResource {
  /**
   * Unique identifier for the resource
   */
  id: string;

  /**
   * Execute the resource with the given parameters
   *
   * @param params - Parameters for resource execution
   * @returns Result of resource execution
   */
  execute(params: Record<string, unknown>): Promise<unknown>;
}

/**
 * Participant configuration interface
 */
export interface IParticipantConfig {
  /**
   * Unique identifier for the participant
   */
  id: string;

  /**
   * Model identifier to use for the participant
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
 * Resource configuration interface
 */
export interface IResourceConfig {
  /**
   * Unique identifier for the resource
   */
  id: string;

  /**
   * Description of the resource's functionality
   */
  description: string;

  /**
   * Function to handle resource execution
   */
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Convening outcome interface
 */
export interface IConveningOutcome {
  /**
   * Unique identifier for the convening
   */
  id: string;

  /**
   * Status of convening execution
   */
  status: "success" | "error";

  /**
   * Output from convening execution
   */
  output: unknown;
}

/**
 * Core Convenings functionality interface
 */
export interface IConveningSystem {
  /**
   * Create a new participant
   *
   * @param config - Configuration for the participant
   * @returns The created participant
   */
  createParticipant(config: IParticipantConfig): IParticipant;

  /**
   * Create a new resource
   *
   * @param config - Configuration for the resource
   * @returns The created resource
   */
  createResource(config: IResourceConfig): IResource;

  /**
   * Execute a convening activity
   *
   * @param activityId - Identifier for the activity to execute
   * @param params - Parameters for activity execution
   * @returns Result of activity execution
   */
  executeActivity(
    activityId: string,
    params: Record<string, unknown>,
  ): Promise<IConveningOutcome>;
}

/**
 * Participant registry interface for dependency injection
 * Allows custom participant creation logic to be injected
 */
export interface IParticipantRegistry {
  /**
   * Create a participant with the specified configuration
   *
   * @param config - Configuration for the participant
   * @returns The created participant
   */
  createParticipant(config: IParticipantConfig): IParticipant;
}

/**
 * Resource registry interface for dependency injection
 * Allows custom resource creation logic to be injected
 */
export interface IResourceRegistry {
  /**
   * Create a resource with the specified configuration
   *
   * @param config - Configuration for the resource
   * @returns The created resource
   */
  createResource(config: IResourceConfig): IResource;
}

/**
 * Convening facilitator interface for dependency injection
 * Allows custom activity execution logic to be injected
 */
export interface IConveningFacilitator {
  /**
   * Execute an activity with the specified parameters
   *
   * @param activityId - Identifier for the activity to execute
   * @param params - Parameters for activity execution
   * @returns Result of activity execution
   */
  executeActivity(
    activityId: string,
    params: Record<string, unknown>,
  ): Promise<IConveningOutcome>;
}
