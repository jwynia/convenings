/**
 * Mastra module tests
 * 
 * This file demonstrates more advanced testing techniques including:
 * - Mocking external dependencies
 * - Testing async functions
 * - Using spies to verify function calls
 */

// Import Deno's testing assertions and mocking utilities
import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std/assert/mod.ts";
import { spy, assertSpyCalls, Spy } from "https://deno.land/std/testing/mock.ts";

// Import the module to test
import { Mastra, AgentConfig, ToolConfig, Agent } from "../mod.ts";

// Helper function to create a test environment
function createTestEnv() {
  return {
    mastra: new Mastra(),
    // Sample configurations for testing
    sampleAgentConfig: {
      id: "test-agent",
      model: "test-model",
      abilities: ["test"],
    } as AgentConfig,
    sampleToolConfig: {
      id: "test-tool",
      description: "A test tool",
      handler: async (params: Record<string, unknown>) => {
        return { result: "tool-executed", params };
      },
    } as ToolConfig,
  };
}

// Test group for Mastra class
Deno.test("Mastra", async (t) => {
  // Test agent creation
  await t.step("createAgent creates and returns an agent", () => {
    const { mastra, sampleAgentConfig } = createTestEnv();
    
    const agent = mastra.createAgent(sampleAgentConfig);
    
    assertExists(agent);
    assertEquals(agent.id, sampleAgentConfig.id);
  });
  
  // Test agent execution
  await t.step("agent.execute returns expected result", async () => {
    const { mastra, sampleAgentConfig } = createTestEnv();
    
    const agent = mastra.createAgent(sampleAgentConfig);
    const result = await agent.execute("test input");
    
    assertStringIncludes(result, sampleAgentConfig.id);
    assertStringIncludes(result, "test input");
  });
  
  // Test tool creation
  await t.step("createTool creates and returns a tool", () => {
    const { mastra, sampleToolConfig } = createTestEnv();
    
    const tool = mastra.createTool(sampleToolConfig);
    
    assertExists(tool);
    assertEquals(tool.id, sampleToolConfig.id);
  });
  
  // Test tool execution
  await t.step("tool.execute calls the handler function", async () => {
    // Create a mock handler function
    const mockHandler = async (params: Record<string, unknown>) => {
      return { result: "mocked-result", params };
    };
    
    // Create a spy on the handler function
    const handlerSpy = spy(mockHandler);
    
    const toolConfig: ToolConfig = {
      id: "spy-tool",
      description: "A tool with a spy handler",
      handler: handlerSpy,
    };
    
    const mastra = new Mastra();
    const tool = mastra.createTool(toolConfig);
    
    // Execute the tool and verify the handler was called
    const params = { key: "value" };
    await tool.execute(params);
    
    assertSpyCalls(handlerSpy, 1);
    // Check that first call's first argument matches params
    if (handlerSpy.calls.length > 0 && handlerSpy.calls[0].args.length > 0) {
      assertEquals(handlerSpy.calls[0].args[0], params);
    } else {
      assertEquals(true, false, "Handler spy was not called with expected arguments");
    }
  });
  
  // Test workflow execution
  await t.step("executeWorkflow returns a workflow result", async () => {
    const { mastra } = createTestEnv();
    
    const workflowId = "test-workflow";
    const params = { key: "value" };
    
    const result = await mastra.executeWorkflow(workflowId, params);
    
    assertEquals(result.id, workflowId);
    assertEquals(result.status, "success");
    assertStringIncludes(String(result.output), workflowId);
    assertStringIncludes(String(result.output), JSON.stringify(params));
  });
});

// Example of testing with mocked dependencies
Deno.test("Using dependency injection for testing", async () => {
  // Create a mock agent that always returns a specific response
  const mockAgent: Agent = {
    id: "mock-agent",
    execute: async () => "Mocked response from agent",
  };
  
  // Create a Mastra instance
  const mastra = new Mastra();
  
  // Use TypeScript to access private field (for testing purposes)
  // This would typically be done through proper dependency injection
  // @ts-ignore - Accessing private field for testing
  mastra.agents.set(mockAgent.id, mockAgent);
  
  // Create a spy on the mock agent's execute method
  const executeSpy = spy(mockAgent, "execute");
  
  try {
    // Call a method that would use the agent
    // In a real implementation, you'd have methods that use these dependencies
    // For demonstration, we'll directly call the execute method
    const result = await mockAgent.execute("test input");
    
    // Verify the spy was called
    assertSpyCalls(executeSpy, 1);
    assertEquals(executeSpy.calls[0].args[0], "test input");
    
    // Verify the result
    assertEquals(result, "Mocked response from agent");
  } finally {
    // Clean up the spy
    executeSpy.restore();
  }
});

// Example of simulating an HTTP API dependency
Deno.test("Mocking external HTTP API", async () => {
  // Define a function that makes an HTTP request
  async function fetchAgentData(id: string): Promise<{ name: string }> {
    const response = await fetch(`https://api.example.com/agents/${id}`);
    return await response.json();
  }
  
  // Create a mock for global fetch
  const originalFetch = globalThis.fetch;
  
  try {
    // Replace global fetch with a mock implementation
    globalThis.fetch = async (url: string | URL | Request): Promise<Response> => {
      // Mock specific endpoints
      if (url.toString().includes("/agents/")) {
        return new Response(JSON.stringify({ name: "Mocked Agent" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // For other URLs, return a 404
      return new Response("Not Found", { status: 404 });
    };
    
    // Now test a function that uses fetch
    const data = await fetchAgentData("test-id");
    
    // Verify the mock worked
    assertEquals(data.name, "Mocked Agent");
  } finally {
    // Restore the original fetch implementation
    globalThis.fetch = originalFetch;
  }
});
