/**
 * Utils module exports
 * Re-exports all utility functions, interfaces, and factories
 */

// Export interfaces for dependency injection
export type { IStringUtils } from "./interfaces.ts";

// Export both the implementation class and factory function
export {
  capitalizeWords,
  createStringUtils,
  // Export individual functions for backward compatibility
  formatString,
  slugify,
  StringUtils,
  truncateString,
} from "./string_utils.ts";
