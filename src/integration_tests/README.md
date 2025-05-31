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

## Running Integration Tests

```bash
# Run all integration tests
deno test --allow-read src/integration_tests/

# Run specific integration test category
deno test --allow-read src/integration_tests/convenings/

# Run with coverage
deno test --allow-read --coverage=coverage/integration src/integration_tests/
```

## Mock Implementation

The fixtures directory contains mock implementations for external dependencies, particularly LLM API clients. These mocks provide predictable responses for testing purposes.

## Test Toggle for LLM API Calls

If a test needs to verify integration with actual LLM APIs, it must use the `ENABLE_LLM_API_TESTS` environment variable, which requires explicit opt-in. Documentation for such tests must include expected costs and usage patterns.
