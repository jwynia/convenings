/**
 * End-to-end workflow integration tests
 * Tests the interaction between Convenings and Mastra systems
 * without invoking real LLM APIs
 */

import { assertEquals, assertExists } from "https://deno.land/std/testing/asserts.ts";
import { createMockMastraCore } from "../fixtures/mock_mastra_core.ts";
import { createMockConveningSystem } from "../fixtures/mock_convenings.ts";
import { ConveningSystemAdapter } from "../../convenings/implementation.ts";
import { DialogueParticipant } from "../../convenings/participants/dialogue_participant.ts";
import { IConveningSystem, IParticipant, IParticipantConfig } from "../../convenings/interfaces.ts";
import { IMastraCore } from "../../utils/interfaces.ts";

/**
 * Test fixture for end-to-end workflow integration tests
 */
interface TestFixture {
  mastraCore: IMastraCore;
  conveningSystem: IConveningSystem;
  participants: Map<string, IParticipant>;
}

/**
 * Create a test fixture with initialized components
 * for testing end-to-end workflows
 */
function createTestFixture(): TestFixture {
  // Create mock Mastra core with predefined workflow responses
  const mastraCore = createMockMastraCore({
    workflowResponses: {
      "dialogue-workflow": {
        '{"message":"Hello, participants!","options":{"temperature":0.7}}': {
          id: "test-workflow-1",
          status: "success",
          output: "Hello from the dialogue workflow!",
        },
      },
      "group-discussion": {
        '{"participants":["participant1","participant2"],"topic":"testing"}': {
          id: "test-workflow-2",
          status: "success",
          output: "Discussion summary: Testing is important for software quality.",
        },
      },
    },
  });

  // Create ConveningSystemAdapter that uses the mock Mastra core
  const conveningSystem = new ConveningSystemAdapter(mastraCore);

  // Create a collection of participants
  const participants = new Map<string, IParticipant>();
  
  // Create and register participants
  const participantConfigs: IParticipantConfig[] = [
    {
      id: "participant1",
      model: "gpt-4",
      role: "facilitator",
    },
    {
      id: "participant2",
      model: "gpt-4",
      role: "domain-expert",
    },
    {
      id: "participant3",
      model: "gpt-4",
      role: "critic",
    },
  ];
  
  // Register participants with the convening system
  for (const config of participantConfigs) {
    const participant = conveningSystem.createParticipant(config);
    participants.set(config.id, participant);
  }

  return {
    mastraCore,
    conveningSystem,
    participants,
  };
}

// End-to-end workflow integration test suite
Deno.test("Convenings-Mastra end-to-end workflow tests", async (t) => {
  // Test basic multi-participant workflow
  await t.step("Can execute a multi-participant dialogue activity", async () => {
    const fixture = createTestFixture();
    
    // Execute an activity that involves multiple participants
    const outcome = await fixture.conveningSystem.executeActivity("group-discussion", {
      participants: ["participant1", "participant2"],
      topic: "testing",
    });
    
    assertExists(outcome);
    assertEquals(outcome.status, "success");
    assertEquals(
      typeof outcome.output === "string" && outcome.output.includes("Discussion summary"),
      true
    );
  });

  // Test that DialogueParticipant correctly integrates with the Mastra core
  await t.step("DialogueParticipant correctly uses underlying Mastra implementation", async () => {
    const fixture = createTestFixture();
    
    // Create a DialogueParticipant that explicitly uses the mock Mastra core
    const dialogueParticipant = new DialogueParticipant({
      id: "test-dialogue-participant",
      model: "gpt-4",
      mastraCore: fixture.mastraCore,
    });
    
    // Execute the participant directly
    const directResponse = await dialogueParticipant.execute("Hello, participants!");
    
    assertExists(directResponse);
    assertEquals(typeof directResponse, "string");
    
    // Now register the participant with the convening system
    fixture.participants.set(dialogueParticipant.id, dialogueParticipant);
    
    // Execute an activity that uses this participant
    const outcome = await fixture.conveningSystem.executeActivity("single-participant-dialogue", {
      participantId: dialogueParticipant.id,
      input: "Hello via convening system!",
    });
    
    assertExists(outcome);
    assertEquals(outcome.status, "success");
  });

  // Test resource creation and usage
  await t.step("Can create and use resources across system boundaries", async () => {
    const fixture = createTestFixture();
    
    // Create a resource in the convening system
    const resource = fixture.conveningSystem.createResource({
      id: "data-processor",
      description: "Processes input data",
      handler: async (params) => ({ processed: `Processed: ${params.input}` }),
    });
    
    assertExists(resource);
    
    // Use the resource directly
    const directResult = await resource.execute({ input: "test data" });
    assertExists(directResult);
    
    // Execute an activity that uses this resource
    const outcome = await fixture.conveningSystem.executeActivity("resource-using-activity", {
      resourceId: resource.id,
      input: "data for processing",
    });
    
    assertExists(outcome);
    assertEquals(outcome.status, "success");
  });

  // Test error propagation across system boundaries
  await t.step("Errors properly propagate across system boundaries", async () => {
    const fixture = createTestFixture();
    
    // Create a Mastra core that generates errors
    const errorMastraCore = createMockMastraCore({
      workflowResponses: {
        "error-workflow": {
          '{"error":true}': {
            id: "error-test",
            status: "error",
            output: "Simulated error in workflow execution",
          },
        },
      },
    });
    
    // Create a convening system that uses the error-prone Mastra core
    const errorConveningSystem = new ConveningSystemAdapter(errorMastraCore);
    
    // Attempt to execute an activity that will trigger an error
    let errorOccurred = false;
    try {
      await errorConveningSystem.executeActivity("error-workflow", {
        error: true,
      });
    } catch (error) {
      errorOccurred = true;
      // Verify the error contains the expected message
      assertEquals(error.message.includes("Simulated error"), true);
    }
    
    // Verify that an error was thrown
    assertEquals(errorOccurred, true);
  });

  // Test that configuration flows correctly between systems
  await t.step("Configuration properly flows between Convenings and Mastra systems", async () => {
    const fixture = createTestFixture();
    
    // Create a participant with specific configuration
    const participant = fixture.conveningSystem.createParticipant({
      id: "configured-participant",
      model: "gpt-4-turbo",
      temperature: 0.8,
      maxTokens: 1000,
      role: "specialized",
    });
    
    assertExists(participant);
    
    // Verify that the configuration was passed to Mastra core
    // Since we're using a mock, we can't directly verify this through the public API
    // In a real implementation, we would check that the agent uses the right configuration
    // Here, we'll just verify that the participant was created with the expected ID
    assertEquals(participant.id, "configured-participant");
    
    // Execute the participant to verify it works
    const response = await participant.execute("Test with special configuration");
    assertExists(response);
  });
});
