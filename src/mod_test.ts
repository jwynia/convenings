/**
 * Integration tests for the main module
 * 
 * This file demonstrates testing the integration between modules
 * and mocking external dependencies at the application level.
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std/assert/mod.ts";
import { spy, assertSpyCalls } from "https://deno.land/std/testing/mock.ts";

// Import the main module
import * as mainModule from "./mod.ts";

// Import the modules we want to mock
import { mastra } from "./mastra/mod.ts";
import { formatString } from "./utils/string_utils.ts";

// Simplified mocking example: Creating and verifying spies
Deno.test("Creating and using a spy", async () => {
  // Create a spy on the mastra.createAgent method
  const createAgentSpy = spy(mastra, "createAgent");
  
  try {
    // Call the method we're spying on
    const agent = mastra.createAgent({
      id: "test-agent",
      model: "test-model",
    });
    
    // Verify the spy was called once
    assertSpyCalls(createAgentSpy, 1);
    
    // Verify the arguments passed to the method
    assertEquals(createAgentSpy.calls[0].args[0].id, "test-agent");
    assertEquals(createAgentSpy.calls[0].args[0].model, "test-model");
    
    // Verify the return value
    assertEquals(agent.id, "test-agent");
  } finally {
    // Restore the original method
    createAgentSpy.restore();
  }
});

// Simplified demonstration of logging test
Deno.test("Testing console output", () => {
  // Create a spy on console.log
  const consoleSpy = spy(console, "log");
  
  try {
    // Call the method we're testing
    console.log("Test message");
    
    // Verify console.log was called once
    assertSpyCalls(consoleSpy, 1);
    
    // Verify the message that was logged
    assertEquals(consoleSpy.calls[0].args[0], "Test message");
  } finally {
    // Restore the original console.log
    consoleSpy.restore();
  }
});

// Demonstrate async/await testing patterns
Deno.test("Async testing with delays", async () => {
  // Create a simple async function that returns after a delay
  async function delayedOperation(delay: number): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Operation completed after ${delay}ms`);
      }, delay);
    });
  }
  
  // Test the async function with a short delay
  const result = await delayedOperation(10);
  assertStringIncludes(result, "Operation completed");
});

// Demonstrate error handling in tests
Deno.test("Error handling in tests", () => {
  // Define a function that throws under certain conditions
  function divideNumbers(a: number, b: number): number {
    if (b === 0) {
      throw new Error("Cannot divide by zero");
    }
    return a / b;
  }
  
  // Test normal case
  assertEquals(divideNumbers(10, 2), 5);
  
  // Test error case
  try {
    divideNumbers(10, 0);
    // If we get here, the test should fail
    assertEquals(true, false, "Expected function to throw but it didn't");
  } catch (error) {
    // Verify the error message is what we expect
    if (error instanceof Error) {
      assertStringIncludes(error.message, "Cannot divide by zero");
    } else {
      assertEquals(true, false, "Expected an Error instance to be thrown");
    }
  }
});
