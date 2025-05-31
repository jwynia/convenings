/**
 * String utility functions
 * Provides common string manipulation utilities with dependency injection support
 */

import { IStringUtils } from "./interfaces.ts";

/**
 * Implementation of string utility functions
 * Implements the IStringUtils interface for dependency injection
 */
export class StringUtils implements IStringUtils {
  /**
   * Format a string by replacing placeholders with values
   *
   * @param template - String template with {placeholder} syntax
   * @param values - Object containing values to replace placeholders
   * @returns Formatted string with placeholders replaced
   *
   * @example
   * ```ts
   * stringUtils.formatString("Hello, {name}!", { name: "World" }) // Returns "Hello, World!"
   * ```
   */
  formatString(template: string, values: Record<string, unknown>): string {
    return template.replace(/{([^{}]*)}/g, (match, key) => {
      const value = values[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Truncate a string to a maximum length and add ellipsis if truncated
   *
   * @param str - String to truncate
   * @param maxLength - Maximum length of the string
   * @returns Truncated string with ellipsis if needed
   *
   * @example
   * ```ts
   * stringUtils.truncateString("This is a long string", 10) // Returns "This is..."
   * ```
   */
  truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }

    return str.slice(0, maxLength - 3) + "...";
  }

  /**
   * Capitalize the first letter of each word in a string
   *
   * @param str - String to capitalize
   * @returns String with first letter of each word capitalized
   *
   * @example
   * ```ts
   * stringUtils.capitalizeWords("hello world") // Returns "Hello World"
   * ```
   */
  capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Generate a slug from a string (URL-friendly version)
   *
   * @param str - String to convert to slug
   * @returns URL-friendly slug
   *
   * @example
   * ```ts
   * stringUtils.slugify("Hello World!") // Returns "hello-world"
   * ```
   */
  slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove non-word chars
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }
}

/**
 * Factory function to create a StringUtils instance
 * This provides a clean way to inject string utilities
 *
 * @returns A new StringUtils instance
 */
export function createStringUtils(): IStringUtils {
  return new StringUtils();
}

// Default instance for backward compatibility
const defaultStringUtils = createStringUtils();

// Export individual functions for backward compatibility
export const formatString = defaultStringUtils.formatString.bind(
  defaultStringUtils,
);
export const truncateString = defaultStringUtils.truncateString.bind(
  defaultStringUtils,
);
export const capitalizeWords = defaultStringUtils.capitalizeWords.bind(
  defaultStringUtils,
);
export const slugify = defaultStringUtils.slugify.bind(defaultStringUtils);
