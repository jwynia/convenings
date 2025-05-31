/**
 * Conversation Agent Implementation
 *
 * Implements a specialized agent for handling conversations with users.
 */

import { Agent, AgentConfig } from "../mod.ts";
import { createStringUtils, IStringUtils } from "../../utils/mod.ts";

/**
 * Supported conversation styles
 */
export type ConversationStyle = "casual" | "formal" | "technical";

/**
 * Configuration for conversation agents
 */
export interface ConversationAgentConfig extends AgentConfig {
  style: ConversationStyle;
  maxResponseLength?: number;
  templates?: {
    greeting?: string;
    farewell?: string;
    error?: string;
  };
}

/**
 * Default templates for different conversation styles
 */
const DEFAULT_TEMPLATES = {
  casual: {
    greeting: "Hey there! How can I help you today?",
    farewell: "Bye! Talk to you later!",
    error: "Oops, something went wrong. Let's try again.",
  },
  formal: {
    greeting: "Good day. How may I assist you?",
    farewell: "Thank you for your time. Goodbye.",
    error: "I apologize, but an error has occurred. Please try again.",
  },
  technical: {
    greeting: "System online. Ready for input.",
    farewell: "Session terminated. Logging off.",
    error: "Error detected in processing. Retry recommended.",
  },
};

/**
 * An agent specialized for conversational interactions
 */
export class ConversationAgent implements Agent {
  id: string;
  private style: ConversationStyle;
  private maxResponseLength: number;
  private templates: {
    greeting: string;
    farewell: string;
    error: string;
  };
  private stringUtils: IStringUtils;

  /**
   * Create a new conversation agent
   *
   * @param config - Agent configuration
   * @param stringUtils - String utilities implementation (can be injected for testing)
   */
  constructor(
    config: ConversationAgentConfig,
    stringUtils: IStringUtils = createStringUtils(),
  ) {
    this.id = config.id;
    this.style = config.style || "casual";
    this.maxResponseLength = config.maxResponseLength || 500;
    this.stringUtils = stringUtils;

    // Use provided templates or defaults based on style
    const defaultTemplates = DEFAULT_TEMPLATES[this.style];
    this.templates = {
      greeting: config.templates?.greeting || defaultTemplates.greeting,
      farewell: config.templates?.farewell || defaultTemplates.farewell,
      error: config.templates?.error || defaultTemplates.error,
    };
  }

  /**
   * Execute a conversation turn with the user
   * @param input The user's input message
   * @returns The agent's response
   */
  async execute(input: string): Promise<string> {
    try {
      // For a real implementation, this would call an LLM or other AI service
      // For this example, we'll use a simple response generation logic

      // Check for special commands
      if (
        input.toLowerCase().includes("hello") ||
        input.toLowerCase().includes("hi")
      ) {
        return this.templates.greeting;
      }

      if (
        input.toLowerCase().includes("bye") ||
        input.toLowerCase().includes("goodbye")
      ) {
        return this.templates.farewell;
      }

      // Generate a mock response based on the input
      const response = this.generateResponse(input);

      // Truncate if needed
      return this.stringUtils.truncateString(response, this.maxResponseLength);
    } catch (error) {
      // Return error message if something goes wrong
      return this.templates.error;
    }
  }

  /**
   * Generate a response based on the input and agent's style
   * @param input User input
   * @returns Generated response
   * @throws Error if formatString fails
   */
  protected generateResponse(input: string): string {
    // Extract the topic first to avoid duplicating this call
    const topic = this.extractTopic(input);

    // In a real implementation, this would call an AI model
    // For this demo, we'll just generate a simple response based on style
    switch (this.style) {
      case "casual":
        return this.stringUtils.formatString(
          "I see you're talking about {topic}. That's cool! Tell me more about it.",
          {
            topic: topic,
          },
        );

      case "formal":
        return this.stringUtils.formatString(
          "I understand you are interested in {topic}. I would be pleased to provide more information on this subject.",
          {
            topic: topic,
          },
        );

      case "technical":
        return this.stringUtils.formatString(
          "Input recognized: {topic}. Processing request. Additional data required for complete analysis.",
          {
            topic: topic,
          },
        );

      default:
        return "I received your message and am processing it.";
    }
  }

  /**
   * Extract the main topic from user input
   * @param input User input
   * @returns Extracted topic
   */
  private extractTopic(input: string): string {
    // A simple topic extraction implementation
    // In a real application, this would be more sophisticated
    const words = input.split(/\s+/);

    // Find the longest word as a naive "topic" extraction
    let topic = "that";
    for (const word of words) {
      // Ignore very short words and common stop words
      if (
        word.length > 3 &&
        !["the", "and", "but", "for", "with"].includes(word.toLowerCase())
      ) {
        if (!topic || word.length > topic.length) {
          topic = word;
        }
      }
    }

    return topic;
  }
}

/**
 * Create a conversation agent with the specified configuration
 *
 * @param config - Configuration for the conversation agent
 * @param stringUtils - Optional string utilities implementation (uses default if not provided)
 * @returns A new ConversationAgent instance
 */
export function createConversationAgent(
  config: ConversationAgentConfig,
  stringUtils: IStringUtils = createStringUtils(),
): ConversationAgent {
  return new ConversationAgent(config, stringUtils);
}
