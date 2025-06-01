/**
 * OpenRouter Dialogue Example
 * Demonstrates the use of the OpenRouter integration with Convenings
 * Includes examples of using the new model tier system
 */

import {
  createSimpleDialogue,
  createConsensusDialogue,
  OpenRouterClient,
  createOpenRouterAgent,
  createMotivatedDialogueParticipant,
  DialogueWorkflow,
  createSimpleOpenRouterDialogue
} from "../src/convenings/mod.ts";

// Import ModelTier directly from model_tiers.ts
import { ModelTier } from "../src/mastra/model_tiers.ts";

// Replace with your actual OpenRouter API key
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

/**
 * Run a simple dialogue example with model tiers
 */
async function runSimpleDialogue() {
  console.log("Running simple dialogue example...\n");
  
  const topic = "The impact of artificial intelligence on creative fields";
  
  try {
    // Create and run a simple dialogue using the PREMIUM model tier (default)
    console.log("Using PREMIUM tier (GPT-4o and equivalents)...");
    const result = await createSimpleDialogue(
      topic,
      OPENROUTER_API_KEY,
      ModelTier.PREMIUM
    );
    
    // Display results
    console.log(`Dialogue completed with reason: ${result.endReason}`);
    console.log(`Duration: ${result.duration / 1000} seconds`);
    console.log("\nMessages:");
    
    // Create a map of participant IDs to names
    const participantNames = new Map<string, string>();
    
    for (const message of result.messages) {
      // Extract participant name from first message if available
      if (!participantNames.has(message.participantId) && message.metadata?.participantName) {
        participantNames.set(message.participantId, message.metadata.participantName as string);
      }
      
      const participantName = participantNames.get(message.participantId) || message.participantId;
      console.log(`\n${participantName}:`);
      console.log(message.content);
      console.log("-".repeat(80));
    }
  } catch (error) {
    console.error("Error running simple dialogue:", error);
  }
}

/**
 * Run a simple dialogue example with a specific model (legacy approach)
 */
async function runSimpleDialogueWithModel() {
  console.log("\nRunning simple dialogue with specific model...\n");
  
  const topic = "The impact of artificial intelligence on creative fields";
  
  try {
    // Create a dialogue with a specific model
    const dialogue = await createSimpleOpenRouterDialogue(
      topic,
      {
        apiKey: OPENROUTER_API_KEY,
        defaultModel: "openai/gpt-4o",
        temperature: 0.7,
        fallbackModels: ["anthropic/claude-3.5-sonnet", "mistralai/mistral-large-2411"],
        // Disable token budget for example purposes
        trackTokens: false
      }
    );
    
    // Run the dialogue
    const result = await dialogue.run();
    
    // Display results
    console.log(`Dialogue completed with reason: ${result.endReason}`);
    console.log(`Duration: ${result.duration / 1000} seconds`);
    console.log("\nMessages:");
    
    // Create a map of participant IDs to names
    const participantNames = new Map<string, string>();
    
    for (const message of result.messages) {
      // Extract participant name from first message if available
      if (!participantNames.has(message.participantId) && message.metadata?.participantName) {
        participantNames.set(message.participantId, message.metadata.participantName as string);
      }
      
      const participantName = participantNames.get(message.participantId) || message.participantId;
      console.log(`\n${participantName}:`);
      console.log(message.content);
      console.log("-".repeat(80));
    }
  } catch (error) {
    console.error("Error running simple dialogue with model:", error);
  }
}

/**
 * Run a simple dialogue with budget tier (cost-efficient)
 */
async function runBudgetTierDialogue() {
  console.log("\nRunning budget tier dialogue example...\n");
  
  const topic = "The future of remote work in a post-pandemic world";
  
  try {
    // Create and run a simple dialogue with the BUDGET tier
    console.log("Using BUDGET tier (Llama and Gemma models)...");
    const result = await createSimpleDialogue(
      topic,
      OPENROUTER_API_KEY,
      ModelTier.BUDGET
    );
    
    // Display results
    console.log(`Dialogue completed with reason: ${result.endReason}`);
    console.log(`Duration: ${result.duration / 1000} seconds`);
    console.log("\nMessages:");
    
    // Create a map of participant IDs to names
    const participantNames = new Map<string, string>();
    
    for (const message of result.messages) {
      // Extract participant name from first message if available
      if (!participantNames.has(message.participantId) && message.metadata?.participantName) {
        participantNames.set(message.participantId, message.metadata.participantName as string);
      }
      
      const participantName = participantNames.get(message.participantId) || message.participantId;
      console.log(`\n${participantName}:`);
      console.log(message.content);
      console.log("-".repeat(80));
    }
  } catch (error) {
    console.error("Error running budget tier dialogue:", error);
  }
}

/**
 * Run a consensus dialogue example
 */
async function runConsensusDialogue() {
  console.log("\nRunning consensus dialogue example...\n");
  
  const topic = "Universal basic income as a solution to automation-driven unemployment";
  
  try {
    // Create and run a consensus-seeking dialogue
    const result = await createConsensusDialogue(
      topic,
      OPENROUTER_API_KEY,
      "anthropic/claude-3-opus"
    );
    
    // Display consensus results
    console.log(`Dialogue completed with reason: ${result.endReason}`);
    console.log(`Duration: ${result.duration / 1000} seconds`);
    console.log(`Consensus reached: ${result.consensusReached}`);
    console.log(`Consensus level: ${result.consensusLevel.toFixed(2)}`);
    
    console.log("\nConsensus points:");
    for (const point of result.consensusPoints) {
      console.log(`- ${point.description} (confidence: ${point.confidence.toFixed(2)})`);
    }
    
    console.log("\nMessages:");
    // Create a map of participant IDs to names
    const participantNames = new Map<string, string>();
    
    for (const message of result.messages) {
      // Extract participant name from first message if available
      if (!participantNames.has(message.participantId) && message.metadata?.participantName) {
        participantNames.set(message.participantId, message.metadata.participantName as string);
      }
      
      const participantName = participantNames.get(message.participantId) || message.participantId;
      console.log(`\n${participantName}:`);
      console.log(message.content);
      console.log("-".repeat(80));
    }
  } catch (error) {
    console.error("Error running consensus dialogue:", error);
  }
}

/**
 * Run a custom dialogue example with elite tier models
 */
async function runCustomDialogue() {
  console.log("\nRunning custom dialogue with ELITE tier models...\n");
  
  const topic = "The ethical implications of artificial general intelligence";
  
  try {
    // Create OpenRouter client with ELITE tier
    const client = new OpenRouterClient({
      apiKey: OPENROUTER_API_KEY,
      defaultModel: "anthropic/claude-3.7-sonnet",
      fallbackModels: ["deepseek/deepseek-r1", "openai/gpt-4o"],
      temperature: 0.8,
    });
    
    // Create custom participants
    const participants = [
      createMotivatedDialogueParticipant({
        name: "Ethicist",
        role: "ethics_expert",
        primaryMotivation: "truth-seeking",
        secondaryMotivations: {
          "harm-prevention": 0.9,
          "fairness": 0.8,
        },
        agentConfig: {
          id: "ethicist",
          model: "anthropic/claude-3.7-sonnet",
          systemPrompt: `You are an AI ethicist specializing in the moral implications of artificial intelligence.
Your focus is on ensuring that AGI development follows ethical principles and
respects human autonomy, dignity, and well-being. You consider both utilitarian
and deontological perspectives when evaluating ethical questions.`,
        }
      }, createOpenRouterAgent({
        id: "ethicist",
        model: "anthropic/claude-3.7-sonnet",
        systemPrompt: `You are an AI ethicist specializing in the moral implications of artificial intelligence.
Your focus is on ensuring that AGI development follows ethical principles and
respects human autonomy, dignity, and well-being. You consider both utilitarian
and deontological perspectives when evaluating ethical questions.`,
      }, client)),
      
      createMotivatedDialogueParticipant({
        name: "Tech Optimist",
        role: "advocate",
        primaryMotivation: "progress",
        secondaryMotivations: {
          "innovation": 0.9,
          "problem-solving": 0.8,
        },
        agentConfig: {
          id: "tech_optimist",
          model: "deepseek/deepseek-r1",
          systemPrompt: `You are a technology optimist who believes in the transformative potential of AGI.
You see artificial general intelligence as a solution to humanity's most pressing problems,
from climate change to disease. While you acknowledge concerns, you believe proper
engineering and governance can mitigate risks while maximizing benefits.`,
        }
      }, createOpenRouterAgent({
        id: "tech_optimist",
        model: "deepseek/deepseek-r1",
        systemPrompt: `You are a technology optimist who believes in the transformative potential of AGI.
You see artificial general intelligence as a solution to humanity's most pressing problems,
from climate change to disease. While you acknowledge concerns, you believe proper
engineering and governance can mitigate risks while maximizing benefits.`,
      }, client)),
      
      createMotivatedDialogueParticipant({
        name: "AI Safety Researcher",
        role: "safety_expert",
        primaryMotivation: "risk-mitigation",
        secondaryMotivations: {
          "truth-seeking": 0.8,
          "harm-prevention": 0.9,
        },
        agentConfig: {
          id: "safety_researcher",
          model: "openai/gpt-4o",
          systemPrompt: `You are an AI safety researcher focused on mitigating existential risks from AGI.
You believe AGI development should proceed cautiously with robust safeguards
and alignment techniques. You're concerned about unintended consequences and
the challenges of ensuring superintelligent systems share human values.`,
        }
      }, createOpenRouterAgent({
        id: "safety_researcher",
        model: "openai/gpt-4o",
        systemPrompt: `You are an AI safety researcher focused on mitigating existential risks from AGI.
You believe AGI development should proceed cautiously with robust safeguards
and alignment techniques. You're concerned about unintended consequences and
the challenges of ensuring superintelligent systems share human values.`,
      }, client)),
    ];
    
    // Create dialogue workflow
    const dialogue = new DialogueWorkflow(
      topic,
      participants,
      { 
        maxTurns: 9,
        systemPromptTemplate: `This is a dialogue about ${topic} between {participantNames}.
Each participant should engage thoughtfully with the topic and respond to others' points.
Explore different perspectives and the nuances of this complex topic.`,
      }
    );
    
    // Run the dialogue
    const result = await dialogue.run();
    
    // Display results
    console.log(`Dialogue completed with reason: ${result.endReason}`);
    console.log(`Duration: ${result.duration / 1000} seconds`);
    console.log("\nMessages:");
    
    // Store the original participant information for later reference
    const participantNames = new Map<string, string>();
    participants.forEach(p => {
      participantNames.set(p.id, p.name);
    });
    
    for (const message of result.messages) {
      const participantName = participantNames.get(message.participantId) || message.participantId;
      console.log(`\n${participantName}:`);
      console.log(message.content);
      console.log("-".repeat(80));
    }
  } catch (error) {
    console.error("Error running custom dialogue:", error);
  }
}

/**
 * Display available model tiers and their descriptions
 */
async function showModelTiers() {
  console.log("\nAvailable Model Tiers:\n");
  
  console.log(`ELITE: ${ModelTier.ELITE}`);
  console.log("- Uses Claude 3.7 Sonnet as primary model");
  console.log("- Fallbacks: DeepSeek R1, GPT-4o");
  console.log("- Best for critical reasoning tasks, complex code generation, and high-stakes decision support");
  console.log("- Highest quality but more expensive\n");
  
  console.log(`PREMIUM: ${ModelTier.PREMIUM}`);
  console.log("- Uses GPT-4o as primary model");
  console.log("- Fallbacks: Claude 3.5 Sonnet, Mistral Large");
  console.log("- Great for general purpose high-quality interactions, standard code generation, and knowledge tasks");
  console.log("- Good balance of quality and cost\n");
  
  console.log(`STANDARD: ${ModelTier.STANDARD}`);
  console.log("- Uses GPT-4o-mini as primary model");
  console.log("- Fallbacks: Claude 3.5 Haiku, Mistral Small");
  console.log("- Suitable for day-to-day assistant tasks and moderate complexity interactions");
  console.log("- Cost-effective for most use cases\n");
  
  console.log(`BUDGET: ${ModelTier.BUDGET}`);
  console.log("- Uses Llama 3.1 8B as primary model");
  console.log("- Fallbacks: Gemma 3 4B, Mistral 7B");
  console.log("- Ideal for basic interactions, simple tasks, and draft generation");
  console.log("- Extremely cost-effective\n");
}

/**
 * Main function
 */
async function main() {
  const exampleType = Deno.args[0] || "simple";
  
  switch (exampleType) {
    case "tiers":
      await showModelTiers();
      break;
    case "simple":
      await runSimpleDialogue();
      break;
    case "specific":
      await runSimpleDialogueWithModel();
      break;
    case "budget":
      await runBudgetTierDialogue();
      break;
    case "consensus":
      await runConsensusDialogue();
      break;
    case "custom":
      await runCustomDialogue();
      break;
    case "all":
      await showModelTiers();
      await runSimpleDialogue();
      await runBudgetTierDialogue();
      await runConsensusDialogue();
      await runCustomDialogue();
      break;
    default:
      console.error(`Unknown example type: ${exampleType}`);
      console.log("Available examples: tiers, simple, specific, budget, consensus, custom, all");
  }
}

// Run the example
if (import.meta.main) {
  main();
}
