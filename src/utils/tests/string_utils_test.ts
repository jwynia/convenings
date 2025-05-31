/**
 * String utilities tests
 * 
 * This file demonstrates Deno's built-in testing capabilities
 * including assertions, test grouping, and test organization.
 */

// Import Deno's testing assertions
import { assertEquals, assertNotEquals } from "https://deno.land/std/assert/mod.ts";

// Import the functions we want to test
import { 
  formatString, 
  truncateString, 
  capitalizeWords, 
  slugify 
} from "../string_utils.ts";

// Group related tests for formatString
Deno.test("formatString", async (t) => {
  // Test case 1: Basic placeholder replacement
  await t.step("replaces placeholders with values", () => {
    const template = "Hello, {name}!";
    const values = { name: "World" };
    assertEquals(formatString(template, values), "Hello, World!");
  });
  
  // Test case 2: Multiple placeholders
  await t.step("handles multiple placeholders", () => {
    const template = "{greeting}, {name}! Welcome to {place}.";
    const values = { greeting: "Hello", name: "Alice", place: "Wonderland" };
    assertEquals(
      formatString(template, values), 
      "Hello, Alice! Welcome to Wonderland."
    );
  });
  
  // Test case 3: Missing values
  await t.step("preserves placeholders with missing values", () => {
    const template = "Hello, {name}! Welcome to {place}.";
    const values = { name: "Bob" };
    assertEquals(
      formatString(template, values), 
      "Hello, Bob! Welcome to {place}."
    );
  });
  
  // Test case 4: Non-string values
  await t.step("converts non-string values to strings", () => {
    const template = "The answer is {answer}.";
    const values = { answer: 42 };
    assertEquals(formatString(template, values), "The answer is 42.");
  });
});

// Group related tests for truncateString
Deno.test("truncateString", async (t) => {
  // Test case 1: String shorter than max length
  await t.step("returns original string when shorter than maxLength", () => {
    const str = "Hello";
    assertEquals(truncateString(str, 10), "Hello");
  });
  
  // Test case 2: String equal to max length
  await t.step("returns original string when equal to maxLength", () => {
    const str = "Hello";
    assertEquals(truncateString(str, 5), "Hello");
  });
  
  // Test case 3: String longer than max length
  await t.step("truncates string and adds ellipsis when longer than maxLength", () => {
    const str = "Hello, world!";
    assertEquals(truncateString(str, 8), "Hello...");
  });
  
  // Test case 4: Very short max length
  await t.step("handles very short maxLength values", () => {
    const str = "Hello";
    assertEquals(truncateString(str, 3), "...");
  });
});

// Group related tests for capitalizeWords
Deno.test("capitalizeWords", async (t) => {
  // Test case 1: Basic capitalization
  await t.step("capitalizes first letter of each word", () => {
    assertEquals(capitalizeWords("hello world"), "Hello World");
  });
  
  // Test case 2: Already capitalized
  await t.step("preserves already capitalized letters", () => {
    assertEquals(capitalizeWords("Hello World"), "Hello World");
  });
  
  // Test case 3: Mixed case
  await t.step("correctly handles mixed case", () => {
    assertEquals(capitalizeWords("hELLO wORLD"), "HELLO WORLD");
  });
  
  // Test case 4: Empty string
  await t.step("handles empty string", () => {
    assertEquals(capitalizeWords(""), "");
  });
});

// Group related tests for slugify
Deno.test("slugify", async (t) => {
  // Test case 1: Basic slugification
  await t.step("converts string to URL-friendly slug", () => {
    assertEquals(slugify("Hello World"), "hello-world");
  });
  
  // Test case 2: Special characters
  await t.step("removes special characters", () => {
    assertEquals(slugify("Hello, World!"), "hello-world");
  });
  
  // Test case 3: Multiple spaces and dashes
  await t.step("collapses multiple spaces and dashes", () => {
    assertEquals(slugify("Hello   World---Test"), "hello-world-test");
  });
  
  // Test case 4: Leading and trailing spaces/dashes
  await t.step("removes leading and trailing spaces/dashes", () => {
    assertEquals(slugify(" --Hello World-- "), "hello-world");
  });
});

// Demonstrate a failing test (commented out)
// This is helpful to see how test failures are reported
/*
Deno.test("intentionally failing test", () => {
  assertEquals(1, 2, "This test will fail");
});
*/
