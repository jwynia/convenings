/**
 * Motivation System Module
 * 
 * Exports all components of the motivation system for use in multi-agent dialogues.
 */

// Export interfaces
export * from "./interfaces.ts";

// Export base motivated participant
export * from "./motivated_participant.ts";

// Export motivation implementations
export * from "./consensus_seeking_motivation.ts";
export * from "./truth_seeking_motivation.ts";

// Export concrete participant implementations
export * from "./contextual_participant.ts";
