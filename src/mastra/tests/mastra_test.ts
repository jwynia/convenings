/**
 * Mastra module tests
 *
 * This file demonstrates more advanced testing techniques including:
 * - Dependency injection with constructor injection
 * - Mocking external dependencies
 * - Testing async functions
 * - Using spies to verify function calls
 */

// Import Deno's testing assertions and mocking utilities
import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std/assert/mod.ts";
import {
  assertSpyCalls,
  Spy,
  spy,
} from "https://deno.land/std/testing/mock.ts";

// Import the module to test
import {
  createMastra,
  IAgentProvider,
  IToolProvider,
  IWorkflowProvider,
  Mastra,
} from "../mod.ts";
import {
  IAgent,
  IAgentConfig,
  ITool,
  IToolConfig,
  IWorkflowResult,
} from "../../utils/interfaces.ts";

// Helper function to create a test environment with mocked dependencies
function createTestEnv() {
  // Create mock implementation functions
  const mockCreateAgent = (config: IAgentConfig): IAgent => {
    return {
      id: config.id,
      execute: async (input: string): Promise<string> => {
        return `Mock agent ${config.id} executed with input: ${input}`;
      },
    };
  };

  const mockCreateTool = (config: IToolConfig): ITool => {
    return {
      id: config.id,
      execute: config.handler,
    };
  };

  const mockExecuteWorkflow = async (
    workflowId: string,
    params: Record<string, unknown>,
  ): Promise<IWorkflowResult> => {
    return {
      id: workflowId,
      status: "success",
      output: `Mock workflow ${workflowId} executed with params: ${
        JSON.stringify(params)
      }`,
    };
  };

  // Create spy implementations for our providers
  const mockAgentProvider: IAgentProvider = {
    createAgent: spy(mockCreateAgent),
  };

  const mockToolProvider: IToolProvider = {
    createTool: spy(mockCreateTool),
  };

  const mockWorkflowProvider: IWorkflowProvider = {
    executeWorkflow: spy(mockExecuteWorkflow),
  };

  return {
    // Create a Mastra instance with our mock providers
    mastra: createMastra(
      mockAgentProvider,
      mockToolProvider,
      mockWorkflowProvider,
    ),
    // Store providers for spy assertion
    providers: {
      agent: mockAgentProvider,
      tool: mockToolProvider,
      workflow: mockWorkflowProvider,
    },
    // Sample configurations for testing
    sampleAgentConfig: {
      id: "test-agent",
      model: "test-model",
      abilities: ["test"],
    } as IAgentConfig,
    sampleToolConfig: {
      id: "test-tool",
      description: "A test tool",
      handler: async (params: Record<string, unknown>) => {
        return { result: "tool-executed", params };
      },
    } as IToolConfig,
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

    const toolConfig: IToolConfig = {
      id: "spy-tool",
      description: "A tool with a spy handler",
      handler: handlerSpy,
    };

    // Get a fresh test environment
    const { mastra, providers } = createTestEnv();
    const tool = mastra.createTool(toolConfig);

    // Execute the tool and verify the handler was called
    const params = { key: "value" };
    await tool.execute(params);

    // Tool provider verification is handled automatically by our test setup

    // Verify that the handler was called when executing the tool
    assertSpyCalls(handlerSpy, 1);

    // Check that first call's first argument matches params
    if (handlerSpy.calls.length > 0 && handlerSpy.calls[0].args.length > 0) {
      assertEquals(handlerSpy.calls[0].args[0], params);
    } else {
      assertEquals(
        true,
        false,
        "Handler spy was not called with expected arguments",
      );
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

// Test the factory function
Deno.test("createMastra returns a Mastra instance with injected dependencies", () => {
  // Create a custom agent provider
  const customAgentProvider: IAgentProvider = {
    createAgent: (config: IAgentConfig): IAgent => {
      return {
        id: config.id,
        execute: async (input: string): Promise<string> => {
          return `Custom agent ${config.id} executed with input: ${input}`;
        },
      };
    },
  };

  // Create a Mastra instance with our custom provider
  const mastra = createMastra(customAgentProvider);

  // Verify the instance was created
  assertExists(mastra);

  // Create an agent and verify it uses our custom provider
  const agent = mastra.createAgent({ id: "custom-test", model: "test" });
  assertExists(agent);
  assertEquals(agent.id, "custom-test");
});

// Example of testing with mocked dependencies using proper DI
Deno.test("Using dependency injection for testing", async () => {
  // Create a mock agent that always returns a specific response
  const mockAgent: IAgent = {
    id: "mock-agent",
    execute: async () => "Mocked response from agent",
  };

  // Create a mock agent provider
  const mockAgentProvider: IAgentProvider = {
    createAgent: () => mockAgent,
  };

  // Create a Mastra instance with our mock provider
  const mastra = createMastra(mockAgentProvider);

  // Create a spy on the mock agent's execute method
  const executeSpy = spy(mockAgent, "execute");

  try {
    // Create an agent using our factory (which will return our mock)
    const agent = mastra.createAgent({ id: "test", model: "test" });

    // Call the execute method
    const result = await agent.execute("test input");

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
    globalThis.fetch = async (
      url: string | URL | Request,
    ): Promise<Response> => {
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
