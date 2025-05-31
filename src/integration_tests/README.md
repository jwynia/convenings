# Integration Tests

This directory contains integration tests for the Convenings project, focused on verifying the correct interaction between components without invoking external LLM APIs.

## Structure

- **fixtures/**: Test fixtures, mock implementations, and test utilities
- **convenings/**: Tests for the Convenings API integration
- **mastra/**: Tests for Mastra component integration
- **workflows/**: Tests for end-to-end workflows

## Guidelines

1. **No LLM API Calls**: Integration tests must NOT make actual calls to LLM APIs unless explicitly configured to do so.
2. **Use Dependency Injection**: All tests should leverage the dependency injection pattern to substitute mock implementations.
3. **Test Critical Paths**: Focus on testing key interaction points between components.
4. **Deterministic Tests**: Tests should be deterministic and not depend on external state.
5. **Isolated Test Data**: Use consistent test data defined in the fixtures directory.
6. **Edge Cases**: Include tests for failure scenarios and edge cases, not just happy paths.
7. **Performance Considerations**: Keep tests efficient; integration tests should complete in a reasonable timeframe.
8. **CI Compatibility**: All tests must be able to run in the CI environment without special configuration.

## Running Integration Tests

```bash
# Run all integration tests
deno test --allow-read src/integration_tests/

# Run specific integration test category
deno test --allow-read src/integration_tests/convenings/

# Run with coverage
deno test --allow-read --coverage=coverage/integration src/integration_tests/

# Run in CI environment
deno test --allow-net --allow-read --allow-env --coverage=integration-coverage src/integration_tests/
```

## Mock Implementation

The fixtures directory contains mock implementations for external dependencies, particularly LLM API clients. These mocks provide predictable responses for testing purposes.

### Using Mock Implementations

```typescript
// Example: Testing with mock Mastra core
import { createMockMastraCore } from "../fixtures/mock_mastra_core.ts";
import { DialogueParticipant } from "../../convenings/participants/dialogue_participant.ts";

Deno.test("DialogueParticipant should handle conversation correctly", async () => {
  // Create mock dependencies
  const mockMastraCore = createMockMastraCore({
    // Configure mock behavior
    responseDelay: 100,
    predefinedResponses: [
      { content: "Hello, I'm a mock response", role: "assistant" }
    ]
  });
  
  // Create component under test with mock dependencies
  const participant = new DialogueParticipant(mockMastraCore);
  
  // Test the component's behavior
  const response = await participant.respondTo("Hello");
  assertEquals(response.content, "Hello, I'm a mock response");
});
```

### Available Mock Implementations

1. **MockAgent** (`mock_agent.ts`):
   - Implements the `IAgent` interface
   - Configurable with predefined responses, delays, and error scenarios
   - Usage: `createMockAgent(options)`

2. **MockTool** (`mock_tool.ts`):
   - Implements the `ITool` interface
   - Configurable tool execution results and errors
   - Usage: `createMockTool(options)`

3. **MockMastraCore** (`mock_mastra_core.ts`):
   - Implements the `IMastraCore` interface
   - Configurable conversation handling without LLM API calls
   - Usage: `createMockMastraCore(options)`

4. **MockConvenings** (`mock_convenings.ts`):
   - Implements Convenings API interfaces
   - Provides simulated dialogue environments
   - Usage: Various factory functions for specific interfaces

## Testing Patterns

### Component Integration Testing

Test how individual components integrate with their direct dependencies:

```typescript
// Example in src/integration_tests/convenings/dialogue_participant_test.ts
Deno.test("DialogueParticipant should integrate with MastraCore", () => {
  // Setup component with mock dependencies
  // Verify interactions between components
});
```

### Workflow Integration Testing

Test complete user workflows across multiple components:

```typescript
// Example in src/integration_tests/workflows/convenings_mastra_workflow_test.ts
Deno.test("Complete conversation workflow should function correctly", () => {
  // Setup all required components with mocks
  // Simulate a complete workflow from start to finish
  // Verify the expected outcomes at each step
});
```

### Edge Case Testing

Test how the system handles error conditions and edge cases:

```typescript
// Example edge case test
Deno.test("System should handle network failure gracefully", () => {
  // Configure mock to simulate network failure
  // Verify component handles the failure appropriately
});
```

## Test Toggle for LLM API Calls

If a test needs to verify integration with actual LLM APIs, it must use the `ENABLE_LLM_API_TESTS` environment variable, which requires explicit opt-in.

```typescript
// Example of a test with actual LLM API option
Deno.test({
  name: "Integration with actual LLM API",
  ignore: !Deno.env.get("ENABLE_LLM_API_TESTS"),
  fn: async () => {
    // Test code that uses actual LLM API
    // Only runs when ENABLE_LLM_API_TESTS is set
  }
});
```

Documentation for such tests must include:
- Expected costs per test run
- API key requirements
- Rate limiting considerations
- Instructions for safe execution

## Troubleshooting Common Issues

1. **Test Timeouts**: If tests time out, check for non-deterministic behavior or increase the timeout for complex workflows.
2. **Mock Configuration**: Ensure mock implementations are configured with appropriate behavior for the test scenario.
3. **Test Isolation**: Tests should not depend on the order of execution or shared state between tests.
4. **CI Failures**: If tests pass locally but fail in CI, check for environment-specific issues or race conditions.

## Best Practices for Creating New Tests

1. **Start with Unit Tests**: Ensure components have good unit test coverage before creating integration tests.
2. **Focus on Critical Paths**: Prioritize testing the most important user workflows and component interactions.
3. **Mock at Boundaries**: Use mocks at system boundaries, but try to use real implementations for internal components when possible.
4. **Clear Test Names**: Use descriptive test names that explain the scenario being tested.
5. **Arrange-Act-Assert**: Structure tests with clear separation between setup, action, and verification.
6. **Clean Up Resources**: Ensure tests clean up any resources they create, even if tests fail.
