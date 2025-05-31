/**
 * Conversation Agent Implementation
 * 
 * Implements a specialized agent for handling conversations with users.
 */

import { Agent, AgentConfig } from "../mod.ts";
import { formatString, truncateString } from "../../utils/string_utils.ts";

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

  /**
   * Create a new conversation agent
   */
  constructor(config: ConversationAgentConfig) {
    this.id = config.id;
    this.style = config.style || "casual";
    this.maxResponseLength = config.maxResponseLength || 500;
    
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
      if (input.toLowerCase().includes("hello") || input.toLowerCase().includes("hi")) {
        return this.templates.greeting;
      }
      
      if (input.toLowerCase().includes("bye") || input.toLowerCase().includes("goodbye")) {
        return this.templates.farewell;
      }
      
      // Generate a mock response based on the input
      const response = this.generateResponse(input);
      
      // Truncate if needed
      return truncateString(response, this.maxResponseLength);
    } catch (error) {
      // Return error message if something goes wrong
      return this.templates.error;
    }
  }
  
  /**
   * Generate a response based on the input and agent's style
   * @param input User input
   * @returns Generated response
   */
  private generateResponse(input: string): string {
    // In a real implementation, this would call an AI model
    // For this demo, we'll just generate a simple response based on style
    switch (this.style) {
      case "casual":
        return formatString("I see you're talking about {topic}. That's cool! Tell me more about it.", {
          topic: this.extractTopic(input),
        });
        
      case "formal":
        return formatString("I understand you are interested in {topic}. I would be pleased to provide more information on this subject.", {
          topic: this.extractTopic(input),
        });
        
      case "technical":
        return formatString("Input recognized: {topic}. Processing request. Additional data required for complete analysis.", {
          topic: this.extractTopic(input),
        });
        
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
      if (word.length > 3 && !["the", "and", "but", "for", "with"].includes(word.toLowerCase())) {
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
 */
export function createConversationAgent(config: ConversationAgentConfig): ConversationAgent {
  return new ConversationAgent(config);
}
