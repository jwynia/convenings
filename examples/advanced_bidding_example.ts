/**
 * Advanced Bidding Strategies Example
 * 
 * This example demonstrates how to use the advanced bidding strategies
 * to create more sophisticated dialogue participants with context-aware,
 * emotion-influenced, and coalition-based bidding behaviors.
 */

import { 
  DialogueParticipant,
  DialogueWorkflow,
  DialogueMessage,
  createDialogueWorkflow
} from "../src/convenings/mod.ts";

import {
  AdvancedBiddingStrategyFactory,
  BiddingStrategyFactory
} from "../src/convenings/participants/bidding/mod.ts";

/**
 * Mock agent implementation for demonstration purposes
 */
class MockAgent {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  
  constructor(id: string, name: string, systemPrompt: string) {
    this.id = id;
    this.name = name;
    this.systemPrompt = systemPrompt;
  }
  
  async execute(input: string): Promise<string> {
    // In a real implementation, this would call an LLM API
    // For this example, we'll just return a simple response
    return `${this.name} responds: I am using advanced bidding strategies to determine when to speak. Input length: ${input.length} characters.`;
  }
}

/**
 * Custom participant class that uses advanced bidding strategies
 */
class AdvancedBiddingParticipant extends DialogueParticipant {
  constructor(
    name: string, 
    role: string,
    biddingType: "debate" | "consensus" | "brainstorming" | "moderator" | "custom" = "debate",
    customConfig?: Record<string, any>
  ) {
    // Create a unique ID for this participant
    const id = crypto.randomUUID();
    
    // Create a mock agent
    const agent = new MockAgent(
      id,
      name,
      `You are ${name}, participating in a dialogue. ${role}`
    );
    
    // Create base config for the dialogue participant
    const config = {
      id,
      name,
      role,
      agentConfig: {
        id,
        model: "mock",
        systemPrompt: `You are ${name}, participating in a dialogue. ${role}`
      }
    };
    
    // Initialize with config and agent
    super(config, agent);
    
    // Set up the appropriate bidding strategy based on the type
    switch (biddingType) {
      case "debate":
        this.biddingStrategy = AdvancedBiddingStrategyFactory.createDebateStrategy();
        break;
      case "consensus":
        this.biddingStrategy = AdvancedBiddingStrategyFactory.createConsensusStrategy();
        break;
      case "brainstorming":
        this.biddingStrategy = AdvancedBiddingStrategyFactory.createBrainstormingStrategy();
        break;
      case "moderator":
        this.biddingStrategy = AdvancedBiddingStrategyFactory.createModeratorStrategy();
        break;
      case "custom":
        // Create a fully customized bidding strategy if config is provided
        if (customConfig) {
          this.biddingStrategy = AdvancedBiddingStrategyFactory.createAdvancedStrategy(customConfig);
        } else {
          this.biddingStrategy = AdvancedBiddingStrategyFactory.createDefaultAdvancedStrategy();
        }
        break;
      default:
        this.biddingStrategy = BiddingStrategyFactory.createStaticStrategy(0.5);
    }
  }
}

/**
 * Run the advanced bidding example
 */
async function runAdvancedBiddingExample() {
  console.log("Starting advanced bidding strategies example...");
  
  // Create participants with different bidding strategies
  const participants = [
    // Moderator with interruption-focused bidding
    new AdvancedBiddingParticipant(
      "Moderator",
      "You are a moderator guiding the discussion. Keep the conversation on track and ensure all participants have a chance to speak.",
      "moderator"
    ),
    
    // Debate-oriented participant
    new AdvancedBiddingParticipant(
      "Debater",
      "You are a critical thinker who carefully analyzes arguments and provides thoughtful counterpoints.",
      "debate"
    ),
    
    // Consensus-building participant
    new AdvancedBiddingParticipant(
      "Facilitator",
      "You are a facilitator who looks for common ground and tries to build consensus among different viewpoints.",
      "consensus"
    ),
    
    // Brainstorming-oriented participant
    new AdvancedBiddingParticipant(
      "Innovator",
      "You are a creative thinker who generates novel ideas and builds on others' suggestions.",
      "brainstorming"
    ),
    
    // Custom bidding strategy participant
    new AdvancedBiddingParticipant(
      "Analyst",
      "You are an analytical thinker who focuses on data and evidence to support arguments.",
      "custom",
      {
        contextual: { weight: 0.4, baseStrength: 0.6 },
        emotional: { weight: 0.1, baseStrength: 0.3 },
        questionResponding: { weight: 0.3, baseStrength: 0.7 },
        turnTaking: { weight: 0.2, baseStrength: 0.5 }
      }
    )
  ];
  
  // Create the dialogue workflow
  const dialogue = createDialogueWorkflow(
    "How can artificial intelligence improve collaborative decision-making?",
    participants,
    {
      maxTurns: 20,
      systemPromptTemplate: `This is a dialogue about {topic} between {participantNames}. 
Each participant has a different bidding strategy that affects when they speak.
The Moderator uses an interruption-focused strategy that prioritizes maintaining conversation flow.
The Debater uses a debate-optimized strategy that focuses on addressing counterarguments.
The Facilitator uses a consensus-building strategy that prioritizes finding common ground.
The Innovator uses a brainstorming strategy that encourages creative idea generation.
The Analyst uses a custom strategy that prioritizes data-driven contributions.`
    }
  );
  
  // Run the dialogue
  console.log("Running dialogue with advanced bidding strategies...");
  const result = await dialogue.run();
  
  // Output the results
  console.log("\n\n===== DIALOGUE RESULTS =====\n");
  console.log(`Topic: ${result.topic}`);
  console.log(`Duration: ${result.duration}ms`);
  console.log(`End reason: ${result.endReason}`);
  console.log(`Total messages: ${result.messages.length}`);
  
  // Generate and display a transcript
  const transcript = generateTranscript(result.messages, participants);
  console.log("\n===== DIALOGUE TRANSCRIPT =====\n");
  console.log(transcript);
  
  // Display turn statistics to show how the bidding strategies affected participation
  console.log("\n===== TURN STATISTICS =====\n");
  const turnCounts = getTurnStatistics(result.messages);
  
  Object.entries(turnCounts).forEach(([participant, count]) => {
    const percentage = (count / result.messages.length) * 100;
    console.log(`${participant}: ${count} turns (${percentage.toFixed(1)}%)`);
  });
  
  console.log("\nExample completed!");
}

/**
 * Generate a transcript from dialogue messages
 */
function generateTranscript(messages: DialogueMessage[], participants: DialogueParticipant[]): string {
  // Create a map of participant IDs to names
  const participantMap = new Map<string, string>();
  participants.forEach(p => participantMap.set(p.id, p.name));
  
  // Format each message with the participant name
  return messages.map(msg => {
    const name = participantMap.get(msg.participantId) || msg.participantId;
    return `${name}: ${msg.content}`;
  }).join("\n\n");
}

/**
 * Get statistics about turn distribution
 */
function getTurnStatistics(messages: DialogueMessage[]): Record<string, number> {
  const turnCounts: Record<string, number> = {};
  
  messages.forEach(msg => {
    turnCounts[msg.participantId] = (turnCounts[msg.participantId] || 0) + 1;
  });
  
  return turnCounts;
}

/**
 * Main entry point
 */
if (import.meta.main) {
  runAdvancedBiddingExample().catch(error => {
    console.error("Error running example:", error);
  });
}
