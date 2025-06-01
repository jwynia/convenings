/**
 * Participants Module
 * Exports participant components for Convenings
 */

// Export base dialogue participant
export {
  DialogueParticipant,
  createDialogueParticipant,
  type DialogueParticipantConfig
} from "./dialogue_participant.ts";

// Export motivated dialogue participant
export {
  MotivatedDialogueParticipant,
  createMotivatedDialogueParticipant,
  createTruthSeekingParticipant,
  createConsensusSeekingParticipant,
  type MotivatedDialogueParticipantConfig
} from "./motivated_dialogue_participant.ts";

// Export debate participant
export {
  DebateParticipant,
  DebateModeratorParticipant,
  createDebateParticipant,
  createDebateModerator,
  type DebateRole,
  type DebateFormat,
  type DebateParticipantConfig,
  type CriterionScore,
  type ParticipantScore
} from "./debate_participant.ts";

// Export bidding strategies
export * from "./bidding/mod.ts";
