/**
 * Convenings module
 * Provides core functionality for multi-agent dialogue and convenings
 */

// Export interfaces
export * from "./interfaces.ts";

// Export implementation
export {
  ConveningSystem,
  createConvening,
  convening,
} from "./implementation.ts";

// Export participants
export {
  DialogueParticipant,
  createDialogueParticipant,
  type DialogueStyle,
  type DialogueParticipantConfig,
} from "./participants/dialogue_participant.ts";

// Export participant registry implementations
// (to be added as more implementations are created)

// Export resource implementations
// (to be added as implementations are created)

// Export activity implementations
// (to be added as implementations are created)
