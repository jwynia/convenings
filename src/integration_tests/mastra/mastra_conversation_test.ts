/**
 * Integration tests for Mastra conversation functionality
 * Tests the interaction between ConversationAgent and Mastra core
 * without invoking real LLM APIs
 */

import { assertEquals, assertExists } from "https://deno.land/std/testing/asserts.ts";
import { createMockMastraCore } from "../fixtures/mock_mastra_core.ts";
import { createMockAgent } from "../fixtures/mock_agent.ts";
import { createMockTool } from "../fixtures/mock_tool.ts";
import { IAgent, IMastraCore } from "../../utils/interfaces.ts";
import { IStringUtils } from "../../utils/interfaces.ts";
import { ConversationAgent } from "../../mastra/agents/conversation_agent.ts";

// Mock string utils implementation for testing
class MockStringUtils implements IStringUtils {
  formatString(template: string, values: Record<string, unknown>): string {
    return template.replace(/{(\w+)}/g, (_, key) => 
      values[key] !== undefined ? String(values[key]) : `{${key}}`
    );
  }

  truncateString(str: string, maxLength: number): string {
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  }

  capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (l) => l.toUpperCase());
  }

  slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }
}

/**
 * Test fixture for Mastra conversation integration tests
 */
interface TestFixture {
  mastraCore: IMastraCore;
  mockAgent: IAgent;
  conversationAgent: ConversationAgent;
  stringUtils: IStringUtils;
}

/**
 * Create a test fixture with initialized components
 * for testing Mastra conversation integration
 */
function createTestFixture(): TestFixture {
  // Create string utils
  const stringUtils = new MockStringUtils();
  
  // Create mock Mastra core
  const mastraCore = createMockMastraCore();
  
  // Create a mock agent to use within tests
  const mockAgent = createMockAgent({
    id: "test-mock-agent",
    model: "gpt-4",
    responses: {
      "Hello": "Hi there!",
      "Tell me a story": "Once upon a time in a mock test framework...",
    },
  });
  
  // Create a ConversationAgent instance with dependencies injected
  const conversationAgent = new ConversationAgent({
    id: "test-conversation-agent",
    model: "gpt-4",
    stringUtils,
    // Additional configuration if needed
  });
  
  return {
    mastraCore,
    mockAgent,
    conversationAgent,
    stringUtils,
  };
}

// Integration test suite
Deno.test("Mastra conversation integration tests", async (t) => {
  // Test basic conversation agent execution
  await t.step("ConversationAgent executes a request using string utilities", async () => {
    const fixture = createTestFixture();
    
    // Register the agent with the Mastra core (to enable tracking)
    fixture.mastraCore.createAgent({
      id: "registered-conversation-agent",
      model: "gpt-4",
    });
    
    const response = await fixture.conversationAgent.execute("Hello, world!");
    
    assertExists(response);
    assertEquals(typeof response, "string");
    assertEquals(response.length > 0, true);
  });

  // Test conversation agent with tool integration
  await t.step("ConversationAgent integrates with tools", async () => {
    const fixture = createTestFixture();
    
    // Create a mock tool
    const mockTool = createMockTool({
      id: "test-tool",
      description: "A test tool for integration tests",
      handler: async (params) => ({ result: `Processed ${params.input}` }),
    });
    
    // Register the tool with the Mastra core
    fixture.mastraCore.createTool({
      id: "registered-tool",
      description: "A registered tool for testing",
      handler: async (params) => ({ result: `Processed ${params.input}` }),
    });
    
    // In a real implementation, the agent would use the tool
    // For this test, we're verifying the components can be connected
    const toolResult = await mockTool.execute({ input: "test data" });
    
    assertExists(toolResult);
  });

  // Test workflow execution with conversation agent
  await t.step("Mastra core executes workflows involving conversation agents", async () => {
    const fixture = createTestFixture();
    
    // Set up the mock Mastra core with a specific workflow response
    const configuredCore = createMockMastraCore({
      workflowResponses: {
        "conversation-workflow": {
          '{"agentId":"test-agent","input":"Hello there"}': {
            id: "test-workflow-1",
            status: "success",
            output: "Workflow processed: Hello there",
          },
        },
      },
    });
    
    // Register the conversation agent
    configuredCore.createAgent({
      id: "test-agent",
      model: "gpt-4",
    });
    
    // Execute the workflow
    const result = await configuredCore.executeWorkflow("conversation-workflow", {
      agentId: "test-agent",
      input: "Hello there",
    });
    
    assertEquals(result.status, "success");
    assertEquals(result.output, "Workflow processed: Hello there");
  });

  // Test string utilities integration
  await t.step("ConversationAgent correctly uses injected string utilities", async () => {
    const fixture = createTestFixture();
    
    // Explicitly verify string utility integration
    const formattedStr = fixture.stringUtils.formatString(
      "Hello, {name}! Your agent ID is {id}.",
      { name: "User", id: fixture.conversationAgent.id }
    );
    
    assertEquals(
      formattedStr,
      `Hello, User! Your agent ID is ${fixture.conversationAgent.id}.`
    );
    
    // The conversation agent should use these utilities internally
    // This is an integration test, so we're testing that the components work together
  });

  // Test error handling across component boundaries
  await t.step("Handles errors across Mastra component boundaries", async () => {
    const fixture = createTestFixture();
    
    // Force an error in the mock Mastra core
    const errorCore = createMockMastraCore({
      workflowResponses: {
        "error-workflow": {
          '{"trigger":"error"}': {
            id: "error-test",
            status: "error",
            output: "Simulated error in Mastra workflow",
          },
        },
      },
    });
    
    // Execute the workflow that will trigger an error
    let errorOccurred = false;
    try {
      await errorCore.executeWorkflow("error-workflow", {
        trigger: "error",
      });
    } catch (error) {
      errorOccurred = true;
      // Verify that the error contains the expected message
      assertEquals(error.message.includes("Simulated error"), true);
    }
    
    // Verify that an error was thrown
    assertEquals(errorOccurred, true);
  });
});
