/**
 * Convenings - Multi-agent dialogue system
 * Main entry point
 * 
 * This module provides a public API for the Convenings multi-agent dialogue system.
 * It exports interfaces and implementations for creating and managing convenings,
 * which are structured conversations between participants (agents).
 */

// Export the public API from convenings module
export {
  // Core interfaces
  IConveningSystem,
  IParticipant,
  IParticipantConfig,
  IResource,
  IResourceConfig,
  IConveningOutcome,
  IParticipantRegistry,
  IResourceRegistry,
  IConveningFacilitator,
  
  // Implementation
  ConveningSystem,
  createConvening,
  convening,
  
  // Participant implementations
  DialogueParticipant,
  createDialogueParticipant,
  DialogueStyle,
  DialogueParticipantConfig,
} from "./convenings/mod.ts";

// Log startup message
console.log("Convenings system initializing...");
