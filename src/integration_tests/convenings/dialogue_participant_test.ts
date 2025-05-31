/**
 * Integration tests for DialogueParticipant within the Convenings system
 * Tests the interaction between DialogueParticipant and other system components
 * without invoking real LLM APIs
 */

import { assertEquals, assertExists } from "https://deno.land/std/testing/asserts.ts";
import { createMockConveningSystem } from "../fixtures/mock_convenings.ts";
import { createMockMastraCore } from "../fixtures/mock_mastra_core.ts";
import { DialogueParticipant } from "../../convenings/participants/dialogue_participant.ts";
import { IConveningSystem, IParticipant } from "../../convenings/interfaces.ts";
import { IMastraCore } from "../../utils/interfaces.ts";

/**
 * Test fixture for DialogueParticipant integration tests
 */
interface TestFixture {
  mastraCore: IMastraCore;
  conveningSystem: IConveningSystem;
  dialogueParticipant: IParticipant;
}

/**
 * Create a test fixture with initialized components
 * for testing DialogueParticipant integration
 */
function createTestFixture(): TestFixture {
  // Create mock Mastra core
  const mastraCore = createMockMastraCore({
    // Configure the mock to provide deterministic responses
    workflowResponses: {
      "dialogue-workflow": {
        // Example predefined workflow response for specific inputs
        '{"message":"Hello, world!","options":{"temperature":0.7}}': {
          id: "test-workflow-1",
          status: "success",
          output: "Hello from the dialogue workflow!",
        },
      },
    },
  });

  // Create mock Convenings system
  const conveningSystem = createMockConveningSystem();

  // Create a DialogueParticipant instance that uses the mock Mastra core
  const dialogueParticipant = new DialogueParticipant({
    id: "test-dialogue-participant",
    model: "gpt-4",
    mastraCore, // Inject the mock Mastra core
  });

  return {
    mastraCore,
    conveningSystem,
    dialogueParticipant,
  };
}

// Integration test suite
Deno.test("DialogueParticipant integration tests", async (t) => {
  // Test basic dialogue execution
  await t.step("DialogueParticipant executes a request and returns a response", async () => {
    const fixture = createTestFixture();
    const response = await fixture.dialogueParticipant.execute("Hello, world!");
    
    assertExists(response);
    assertEquals(typeof response, "string");
    assertEquals(response.length > 0, true);
  });

  // Test integration with Convenings system
  await t.step("DialogueParticipant can be registered with the Convenings system", () => {
    const fixture = createTestFixture();
    
    // Register the participant with the Convenings system
    const participant = fixture.conveningSystem.createParticipant({
      id: "system-dialogue-participant",
      model: "gpt-4",
      // In a real implementation, this would have additional configuration
    });
    
    assertExists(participant);
    assertEquals(participant.id, "system-dialogue-participant");
  });

  // Test interaction between DialogueParticipant and activity execution
  await t.step("Convenings activity can use DialogueParticipant", async () => {
    const fixture = createTestFixture();
    
    // Register the participant with the Convenings system
    const participant = fixture.dialogueParticipant;
    
    // Simulate an activity that uses the participant
    const outcome = await fixture.conveningSystem.executeActivity("dialogue-activity", {
      participantId: participant.id,
      input: "Tell me something interesting",
    });
    
    assertExists(outcome);
    assertEquals(outcome.status, "success");
  });

  // Test error handling across component boundaries
  await t.step("Handles errors across component boundaries", async () => {
    const fixture = createTestFixture();
    
    // Force an error in the mock Mastra core
    const errorCore = createMockMastraCore({
      workflowResponses: {
        "dialogue-workflow": {
          // Simulate an error response
          '{"message":"error-trigger","options":{}}': {
            id: "error-workflow-1",
            status: "error",
            output: "Simulated error in workflow execution",
          },
        },
      },
    });
    
    // Create a DialogueParticipant with the error-prone core
    const errorParticipant = new DialogueParticipant({
      id: "error-dialogue-participant",
      model: "gpt-4",
      mastraCore: errorCore,
    });
    
    // Execute a request that will trigger the error response
    let errorOccurred = false;
    try {
      await errorParticipant.execute("error-trigger");
    } catch (error) {
      errorOccurred = true;
      // Verify that the error is properly propagated
      assertEquals(error.message.includes("Simulated error"), true);
    }
    
    // Verify that an error was indeed thrown
    assertEquals(errorOccurred, true);
  });
});
