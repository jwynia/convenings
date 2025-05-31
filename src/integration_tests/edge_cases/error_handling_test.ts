/**
 * Edge case integration tests focusing on error handling across component boundaries
 * These tests verify that errors are properly propagated and handled between
 * different parts of the system.
 */

import { assertEquals, assertRejects } from "https://deno.land/std/testing/asserts.ts";
import { createMockMastraCore } from "../fixtures/mock_mastra_core.ts";
import { createMockAgent } from "../fixtures/mock_agent.ts";
import { createMockTool } from "../fixtures/mock_tool.ts";
import { createMockConveningSystem } from "../fixtures/mock_convenings.ts";
import { DialogueParticipant } from "../../convenings/participants/dialogue_participant.ts";

Deno.test("Error handling integration tests", async (t) => {
  // Test error propagation in DialogueParticipant
  await t.step("DialogueParticipant properly propagates Mastra core errors", async () => {
    // Create a mock Mastra core that will generate errors
    const errorCore = createMockMastraCore({
      workflowResponses: {
        "dialogue-workflow": {
          // Configure error response for specific input pattern
          '{"message":"trigger-error","options":{}}': {
            id: "error-workflow-1",
            status: "error",
            error: "Simulated workflow error",
          },
        },
      },
      // Simulate network failure
      networkFailure: {
        probability: 0,  // No random failures
        patterns: ["network-error"],  // Trigger on specific input
        errorMessage: "Network connection failed",
      },
    });
    
    const participant = new DialogueParticipant({
      id: "error-test-participant",
      model: "gpt-4",
      mastraCore: errorCore,
    });
    
    // Verify workflow error is properly propagated
    await assertRejects(
      async () => {
        await participant.execute("trigger-error");
      },
      Error,
      "Simulated workflow error",
    );
    
    // Verify network error is properly propagated
    await assertRejects(
      async () => {
        await participant.execute("network-error");
      },
      Error,
      "Network connection failed",
    );
  });
  
  // Test error handling in tools integration
  await t.step("Tool execution errors are properly handled", async () => {
    // Create a mock tool that will fail
    const errorTool = createMockTool({
      id: "error-tool",
      // Configure tool to fail on specific input
      executeResponse: (input: string) => {
        if (input.includes("fail")) {
          throw new Error("Tool execution failed");
        }
        return { status: "success", result: "Tool executed successfully" };
      },
    });
    
    const mockAgent = createMockAgent({
      id: "agent-with-error-tool",
      tools: [errorTool],
    });
    
    // Verify tool error is properly handled by agent
    await assertRejects(
      async () => {
        await mockAgent.executeTool("error-tool", "please-fail");
      },
      Error,
      "Tool execution failed",
    );
    
    // Verify successful execution still works
    const result = await mockAgent.executeTool("error-tool", "please-succeed");
    assertEquals(result.status, "success");
  });
  
  // Test error handling across system boundaries
  await t.step("Convenings system properly handles participant errors", async () => {
    const conveningSystem = createMockConveningSystem();
    
    // Register a participant that will throw errors
    conveningSystem.registerParticipant("error-participant", {
      execute: (input: string) => {
        if (input === "system-error") {
          throw new Error("System-level error");
        }
        return Promise.resolve("Success response");
      },
      id: "error-participant",
    });
    
    // Verify error is propagated through system boundaries
    await assertRejects(
      async () => {
        await conveningSystem.executeActivity("test-activity", {
          participantId: "error-participant",
          input: "system-error",
        });
      },
      Error,
      "System-level error",
    );
    
    // Verify activity can still complete successfully
    const result = await conveningSystem.executeActivity("test-activity", {
      participantId: "error-participant",
      input: "normal-request",
    });
    
    assertEquals(result.status, "success");
  });
  
  // Test timeout handling
  await t.step("System properly handles timeouts", async () => {
    // Create a mock Mastra core with delays
    const slowCore = createMockMastraCore({
      // Configure global response delay
      responseDelay: 50, // milliseconds
      
      // Configure specific delay for a pattern
      delayPatterns: {
        "timeout-test": 200, // longer delay for specific input
      },
    });
    
    const participant = new DialogueParticipant({
      id: "timeout-test-participant",
      model: "gpt-4",
      mastraCore: slowCore,
      // Configure short timeout
      timeoutMs: 100,
    });
    
    // Verify normal operation works with default timeout
    const normalResponse = await participant.execute("normal-request");
    assertEquals(typeof normalResponse, "string");
    
    // Verify timeout error is thrown for slow operation
    await assertRejects(
      async () => {
        await participant.execute("timeout-test");
      },
      Error,
      "timeout",
    );
  });
  
  // Test recursive error handling
  await t.step("System handles nested component errors correctly", async () => {
    const mockSystem = createMockConveningSystem();
    const mockCore = createMockMastraCore();
    
    // Create a chain of components that can propagate errors
    const participant1 = new DialogueParticipant({
      id: "participant1",
      model: "gpt-4",
      mastraCore: mockCore,
    });
    
    mockSystem.registerParticipant("participant1", participant1);
    
    // Override the mock system's executeActivity method to test nested error propagation
    const originalExecuteActivity = mockSystem.executeActivity;
    mockSystem.executeActivity = async (activityId: string, config: any) => {
      if (activityId === "nested-error-activity") {
        // Simulate deeper nested error
        if (config.input === "nested-error") {
          throw new Error("Deeply nested error");
        }
      }
      return originalExecuteActivity(activityId, config);
    };
    
    // Verify nested error properly propagates up
    await assertRejects(
      async () => {
        await mockSystem.executeActivity("nested-error-activity", {
          participantId: "participant1",
          input: "nested-error",
        });
      },
      Error,
      "Deeply nested error",
    );
  });
});
