/**
 * Workflows Module
 * Exports dialogue workflow components for Convenings
 */

// Export dialogue workflow
export {
  DialogueWorkflow,
  createDialogueWorkflow,
  type DialogueParticipant,
  type DialogueMessage,
  type DialogueState,
  type DialogueWorkflowConfig,
  type DialogueWorkflowResult
} from "./dialogue_workflow.ts";

// Export consensus workflow
export {
  ConsensusWorkflow,
  createConsensusWorkflow,
  type ConsensusPoint,
  type ConsensusWorkflowConfig,
  type ConsensusWorkflowResult
} from "./consensus_workflow.ts";

// Export OpenRouter dialogue workflow
export {
  createOpenRouterDialogueWorkflow,
  createSimpleOpenRouterDialogue,
  type OpenRouterParticipantConfig,
  type OpenRouterDialogueWorkflowConfig
} from "./openrouter_dialogue_workflow.ts";
