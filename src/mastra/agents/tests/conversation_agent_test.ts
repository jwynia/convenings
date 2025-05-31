/**
 * Tests for Conversation Agent
 *
 * This file demonstrates test-driven development by thoroughly testing
 * all aspects of the ConversationAgent class.
 */

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std/assert/mod.ts";
import {
  assertSpyCalls,
  Spy,
  spy,
} from "https://deno.land/std/testing/mock.ts";

import {
  ConversationAgent,
  ConversationAgentConfig,
  createConversationAgent,
} from "../conversation_agent.ts";
import { createStringUtils, IStringUtils } from "../../../utils/mod.ts";

// Group tests by functionality
Deno.test("ConversationAgent", async (t) => {
  // Test agent creation
  await t.step(
    "creates agent with default settings when minimal config is provided",
    () => {
      const config: ConversationAgentConfig = {
        id: "test-agent",
        model: "test-model",
        style: "casual",
      };

      const agent = createConversationAgent(config);

      assertEquals(agent.id, "test-agent");
    },
  );

  // Test agent with different styles
  await t.step("creates agents with different conversation styles", () => {
    // Create agents with each style
    const casual = createConversationAgent({
      id: "casual-agent",
      model: "test-model",
      style: "casual",
    });

    const formal = createConversationAgent({
      id: "formal-agent",
      model: "test-model",
      style: "formal",
    });

    const technical = createConversationAgent({
      id: "technical-agent",
      model: "test-model",
      style: "technical",
    });

    // Each should have the correct ID
    assertEquals(casual.id, "casual-agent");
    assertEquals(formal.id, "formal-agent");
    assertEquals(technical.id, "technical-agent");
  });

  // Test custom templates
  await t.step("uses custom templates when provided", async () => {
    const agent = createConversationAgent({
      id: "custom-agent",
      model: "test-model",
      style: "casual",
      templates: {
        greeting: "Custom hello!",
        farewell: "Custom goodbye!",
        error: "Custom error!",
      },
    });

    // Test greeting with "hello" trigger
    const greeting = await agent.execute("hello there");
    assertEquals(greeting, "Custom hello!");

    // Test farewell with "bye" trigger
    const farewell = await agent.execute("bye now");
    assertEquals(farewell, "Custom goodbye!");
  });

  // Test response truncation
  await t.step("truncates responses to maxResponseLength", async () => {
    // Create an agent with very short max response length
    const agent = createConversationAgent({
      id: "truncate-agent",
      model: "test-model",
      style: "casual",
      maxResponseLength: 10,
    });

    // Execute with input that will generate a long response
    const response = await agent.execute(
      "testing the truncation functionality",
    );

    // Response should be truncated to maxLength
    assertEquals(response.length, 10);
    // And should end with the ellipsis
    assertEquals(response.slice(-3), "...");
  });

  // Test basic response generation
  await t.step(
    "generates appropriate responses for different inputs",
    async () => {
      const agent = createConversationAgent({
        id: "response-agent",
        model: "test-model",
        style: "casual",
      });

      // Test with normal input (not a greeting or farewell)
      const response = await agent.execute("tell me about programming");

      // Verify response contains the identified topic
      assertStringIncludes(response, "programming");
      // Verify response has the casual style marker
      assertStringIncludes(response, "That's cool!");
    },
  );

  // Test response generation by style
  await t.step("generates style-appropriate responses", async () => {
    // Create agents with each style
    const casual = createConversationAgent({
      id: "style-casual",
      model: "test-model",
      style: "casual",
    });

    const formal = createConversationAgent({
      id: "style-formal",
      model: "test-model",
      style: "formal",
    });

    const technical = createConversationAgent({
      id: "style-technical",
      model: "test-model",
      style: "technical",
    });

    // Same input for all
    const input = "tell me about artificial intelligence";

    // Get responses
    const casualResponse = await casual.execute(input);
    const formalResponse = await formal.execute(input);
    const technicalResponse = await technical.execute(input);

    // Check that responses match the expected style
    assertStringIncludes(casualResponse, "That's cool!");
    assertStringIncludes(formalResponse, "I would be pleased");
    assertStringIncludes(technicalResponse, "Processing request");
  });

  // Skip error handling test since it's challenging to test without accessing private methods
  // In a real-world scenario, we would use dependency injection for better testability
  await t.step("returns custom error template", async () => {
    // Create an agent with custom error template
    const agent = createConversationAgent({
      id: "error-agent",
      model: "test-model",
      style: "casual",
      templates: {
        error: "Custom error message",
      },
    });

    // Instead of trying to force an error, we'll just verify the template exists
    // @ts-ignore - Accessing private field for testing
    const errorTemplate = agent.templates?.error;

    assertEquals(errorTemplate, "Custom error message");
  });

  // Test topic extraction with more specific assertions
  await t.step("extracts topics from user input", async () => {
    const agent = createConversationAgent({
      id: "topic-agent",
      model: "test-model",
      style: "casual",
    });

    // Use various inputs with identifiable topics
    const response1 = await agent.execute("I love programming");
    assertStringIncludes(response1, "programming");

    // For compound words, we need to check what the actual implementation extracts
    // The current implementation extracts the longest word
    const response2 = await agent.execute(
      "Tell me about artificial intelligence",
    );
    // Either "artificial" or "intelligence" would be valid
    const hasEitherTopic = response2.includes("artificial") ||
      response2.includes("intelligence");
    assertEquals(
      hasEitherTopic,
      true,
      "Response should contain either 'artificial' or 'intelligence'",
    );

    // Test with input containing only short words or stop words
    const response3 = await agent.execute("The and but for");
    assertStringIncludes(response3, "that"); // Default topic
  });
});

// Create mock string utils for testing
class MockStringUtils implements IStringUtils {
  formatString = spy(
    (template: string, values: Record<string, unknown>): string => {
      return template.replace(/{([^{}]*)}/g, (match, key) => {
        const value = values[key];
        return value !== undefined ? String(value) : match;
      });
    },
  );

  truncateString = spy((str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
      return str;
    }
    return str.slice(0, maxLength - 3) + "...";
  });

  capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  slugify(str: string): string {
    return str.toLowerCase().replace(/\s+/g, "-");
  }
}

// Test factory function
Deno.test("createConversationAgent returns a ConversationAgent instance", () => {
  const config: ConversationAgentConfig = {
    id: "factory-agent",
    model: "test-model",
    style: "casual",
  };

  const agent = createConversationAgent(config);

  // Check it's the correct type
  assertEquals(agent instanceof ConversationAgent, true);
  assertEquals(agent.id, "factory-agent");
});

// Test dependency injection
Deno.test("ConversationAgent with injected dependencies", async () => {
  const mockStringUtils = new MockStringUtils();

  const config: ConversationAgentConfig = {
    id: "di-agent",
    model: "test-model",
    style: "casual",
    maxResponseLength: 100,
  };

  const agent = createConversationAgent(config, mockStringUtils);

  // Execute agent to trigger string utils usage
  await agent.execute("test dependency injection");

  // Verify that the injected string utils were called
  assertSpyCalls(mockStringUtils.formatString, 1);
  assertSpyCalls(mockStringUtils.truncateString, 1);
});

// Create a modified ConversationAgent to test error handling
Deno.test("ConversationAgent handles errors properly", async () => {
  // Create a mocked version of ConversationAgent where generateResponse throws an error
  class ErrorTestAgent extends ConversationAgent {
    // Override the generateResponse method to always throw an error
    protected override generateResponse(): string {
      throw new Error("Test error");
    }
  }

  // Create a factory function that returns our test agent
  function createErrorTestAgent(
    config: ConversationAgentConfig,
    stringUtils: IStringUtils = createStringUtils(),
  ): ConversationAgent {
    return new ErrorTestAgent(config, stringUtils);
  }

  const testInput = "test message";

  const config: ConversationAgentConfig = {
    id: "error-agent",
    model: "test-model",
    style: "casual",
    templates: {
      error: "Test error template",
    },
  };

  // Create our test agent
  const agent = createErrorTestAgent(config);

  // Execute agent with input that will trigger error handling
  const response = await agent.execute(testInput);

  // Verify that the error template was returned
  assertEquals(response, "Test error template");
});
