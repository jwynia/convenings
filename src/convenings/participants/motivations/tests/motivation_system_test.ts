/**
 * Tests for the motivation system
 * 
 * Verifies that motivations and motivated participants work correctly.
 */

import { assertEquals, assertExists, assertNotEquals } from "https://deno.land/std/testing/asserts.ts";
import { createStringUtils } from "../../../../utils/mod.ts";
import { 
  createContextualParticipant,
  createConsensusSeekingMotivation,
  createTruthSeekingMotivation,
  DialogueContext,
  MotivationState
} from "../mod.ts";

// Mock values for testing
const mockEmotionalState = { valence: 0, arousal: 0.5 };
const mockMotivationState: MotivationState = {
  satisfaction: 0.5,
  urgency: 0.5,
  agreement: new Map(),
  topicsAddressed: new Set(),
  emotionalState: mockEmotionalState,
  metadata: {}
};

// Mock dialog context for testing
const createMockContext = (messages: string[] = []): DialogueContext => {
  return {
    history: messages.map((message, i) => ({
      participantId: `participant-${i % 2}`,
      message,
      timestamp: Date.now() - (messages.length - i) * 1000
    })),
    topics: ["testing", "motivation", "system"],
    participants: [],
    metadata: {}
  };
};

// Mock participant for testing
const mockParticipant = {
  id: "test-participant",
  execute: async (input: string) => `Responding to: ${input}`
};

Deno.test("ConsensusSeekingMotivation - Basic functionality", async () => {
  const motivation = createConsensusSeekingMotivation();
  
  // Test creation
  assertExists(motivation);
  assertEquals(motivation.id, "consensus-seeking");
  assertEquals(motivation.name, "Consensus Seeking");
  
  // Test initial state with no disagreement
  const context = createMockContext([
    "Let's discuss the topic.",
    "I think we should consider all viewpoints."
  ]);
  
  const desire = await motivation.calculateDesire(mockParticipant, mockMotivationState, context);
  
  // Should have moderate desire with no clear disagreement
  assertEquals(typeof desire, "number");
  assert(desire >= 0 && desire <= 1, "Desire should be between 0 and 1");
});

Deno.test("ConsensusSeekingMotivation - Responds to disagreement", async () => {
  const motivation = createConsensusSeekingMotivation();
  
  // Create context with disagreement
  const context = createMockContext([
    "I think A is the best approach.",
    "I disagree. B is clearly better.",
    "No, you're wrong about that."
  ]);
  
  const desire = await motivation.calculateDesire(mockParticipant, mockMotivationState, context);
  
  // Should have higher desire with disagreement
  assert(desire > 0.5, "Desire should be higher when disagreement is present");
  
  // Test state updates with disagreement
  const updatedState = motivation.updateState(mockMotivationState, context.history[1], context);
  
  // Should update urgency when disagreement detected
  assertNotEquals(updatedState.urgency, mockMotivationState.urgency);
});

Deno.test("TruthSeekingMotivation - Basic functionality", async () => {
  const motivation = createTruthSeekingMotivation();
  
  // Test creation
  assertExists(motivation);
  assertEquals(motivation.id, "truth-seeking");
  assertEquals(motivation.name, "Truth Seeking");
  
  // Test initial state with no claims
  const context = createMockContext([
    "Let's discuss the topic.",
    "What are your thoughts on this?"
  ]);
  
  const desire = await motivation.calculateDesire(mockParticipant, mockMotivationState, context);
  
  // Should have moderate desire with no clear claims
  assertEquals(typeof desire, "number");
  assert(desire >= 0 && desire <= 1, "Desire should be between 0 and 1");
});

Deno.test("TruthSeekingMotivation - Responds to unsubstantiated claims", async () => {
  const motivation = createTruthSeekingMotivation();
  
  // Create context with unsubstantiated claims
  const context = createMockContext([
    "I think A is definitely the best approach.",
    "B always works better in these situations.",
    "This is certainly the right way to do it."
  ]);
  
  const desire = await motivation.calculateDesire(mockParticipant, mockMotivationState, context);
  
  // Should have higher desire with unsubstantiated claims
  assert(desire > 0.5, "Desire should be higher when unsubstantiated claims are present");
  
  // Test state updates with claims
  const updatedState = motivation.updateState(mockMotivationState, context.history[1], context);
  
  // Should update urgency when claims without evidence are detected
  assertNotEquals(updatedState.urgency, mockMotivationState.urgency);
});

Deno.test("ContextualParticipant - Creates with motivations", () => {
  const consensusMotivation = createConsensusSeekingMotivation();
  const truthMotivation = createTruthSeekingMotivation();
  
  const participant = createContextualParticipant({
    id: "test-motivated-participant",
    model: "test-model",
    maxResponseLength: 500,
    motivatedConfig: {
      motivations: [
        { motivation: consensusMotivation, weight: 0.7 },
        { motivation: truthMotivation, weight: 0.3 }
      ],
      aggregationStrategy: "weighted"
    }
  }, createStringUtils());
  
  assertExists(participant);
  assertEquals(participant.id, "test-motivated-participant");
});

Deno.test("ContextualParticipant - Generates responses", async () => {
  const consensusMotivation = createConsensusSeekingMotivation();
  const truthMotivation = createTruthSeekingMotivation();
  
  const participant = createContextualParticipant({
    id: "test-motivated-participant",
    model: "test-model",
    maxResponseLength: 500,
    motivatedConfig: {
      motivations: [
        { motivation: consensusMotivation, weight: 0.7 },
        { motivation: truthMotivation, weight: 0.3 }
      ],
      aggregationStrategy: "weighted"
    }
  }, createStringUtils());
  
  // Test basic response
  const response1 = await participant.execute("Hello");
  assertExists(response1);
  assert(response1.length > 0, "Should generate a response");
  
  // Test response to disagreement
  const response2 = await participant.execute("I completely disagree with what you're saying about testing.");
  assertExists(response2);
  assert(response2.length > 0, "Should generate a response to disagreement");
  assert(response2.includes("testing") || response2.includes("disagree"), 
    "Response should acknowledge the topic or disagreement");
});

// Helper function for assertions
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
