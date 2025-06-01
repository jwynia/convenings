/**
 * Debate Example
 * Demonstrates the debate workflow functionality
 */

import {
  OpenRouterClient,
  createOpenRouterAgent,
  createDebateParticipant,
  createDebateModerator,
  DebateWorkflow,
  createDebate,
  DialogueMessage,
  ParticipantScore
} from "../src/convenings/mod.ts";

// Check for API key
const apiKey = Deno.env.get("OPENROUTER_API_KEY") || "";

if (!apiKey) {
  console.error("Error: OPENROUTER_API_KEY environment variable is required");
  Deno.exit(1);
}

// Example 1: Using the high-level createDebate helper function
async function runSimpleDebate() {
  console.log("=== Running Simple Debate ===");
  console.log("Using high-level createDebate helper function\n");
  
  const topic = "Should AI systems be open source or proprietary?";
  const positionA = "AI systems should be primarily open source";
  const positionB = "AI systems should be primarily proprietary";
  
  console.log(`Topic: ${topic}`);
  console.log(`Position A: ${positionA}`);
  console.log(`Position B: ${positionB}\n`);
  
  console.log("Starting debate...");
  const result = await createDebate(
    topic,
    positionA,
    positionB,
    apiKey,
    "anthropic/claude-3-sonnet",
    {
      debateFormat: "educational",
      roundCount: 2,
      showProgress: true,
      outputFilePath: "./debate-output.md",
      outputFormat: "md",
      maxCost: 0.5, // Set a $0.50 budget limit
    }
  );
  
  // Display results
  console.log("\n=== Debate Completed ===");
  console.log(`Duration: ${result.duration / 1000} seconds`);
  console.log(`Completed rounds: ${result.completedRounds}`);
  console.log(`Total turns: ${result.totalTurns}`);
  
  // Display scores
  console.log("\n=== Scores ===");
  for (const [participantId, score] of Object.entries(result.scores)) {
    const participant = result.messages.find((m: DialogueMessage) => m.participantId === participantId);
    const name = participant ? participant.participantId : participantId;
    console.log(`${name}: ${(score as ParticipantScore).total.toFixed(2)}`);
  }
  
  // Display summary
  console.log("\n=== Debate Summary ===");
  console.log(result.summary);
}

// Example 2: Creating a debate with custom configuration
async function runCustomDebate() {
  console.log("\n=== Running Custom Debate ===");
  console.log("Using manual configuration for more control\n");
  
  // Define debate topic and format
  const topic = "Is remote work better than in-person work?";
  const debateFormat = "formal";
  
  console.log(`Topic: ${topic}`);
  console.log(`Format: ${debateFormat}\n`);
  
  // Create OpenRouter client
  const client = new OpenRouterClient({
    apiKey,
    defaultModel: "anthropic/claude-3-sonnet",
    temperature: 0.7,
  });
  
  // Create debate participants
  const participants = [
    // Moderator
    createDebateModerator({
      name: "Debate Moderator",
      agentConfig: {
        id: "moderator",
        model: "anthropic/claude-3-sonnet",
        systemPrompt: `You are a neutral moderator for a debate on ${topic}.
Your role is to ensure the debate progresses according to structure and rules,
while remaining neutral on the topic. Guide participants through each phase
of the debate, provide summaries after each round, and evaluate arguments
based on logic, evidence, clarity, and responsiveness.`,
      },
      dialogueStyle: "analytical",
      preferredFormat: debateFormat
    }, createOpenRouterAgent({
      id: "moderator",
      model: "anthropic/claude-3-sonnet",
      systemPrompt: `You are a neutral moderator for a debate on ${topic}.
Your role is to ensure the debate progresses according to structure and rules,
while remaining neutral on the topic. Guide participants through each phase
of the debate, provide summaries after each round, and evaluate arguments
based on logic, evidence, clarity, and responsiveness.`,
    }, client)),
    
    // Pro-Remote Advocate
    createDebateParticipant({
      name: "Remote Work Advocate",
      debateRole: "position_advocate",
      position: "Remote work is superior to in-person work for most knowledge workers",
      agentConfig: {
        id: "remote_advocate",
        model: "anthropic/claude-3-sonnet",
        systemPrompt: `You are participating in a formal debate on ${topic}.
You are advocating that remote work is superior to in-person work for most knowledge workers.
Focus on benefits like flexibility, elimination of commute, potential for global talent,
work-life balance, and reduced office costs. Support with research and evidence.`,
      },
      dialogueStyle: "assertive",
      preferredFormat: debateFormat
    }, createOpenRouterAgent({
      id: "remote_advocate",
      model: "anthropic/claude-3-sonnet",
      systemPrompt: `You are participating in a formal debate on ${topic}.
You are advocating that remote work is superior to in-person work for most knowledge workers.
Focus on benefits like flexibility, elimination of commute, potential for global talent,
work-life balance, and reduced office costs. Support with research and evidence.`,
    }, client)),
    
    // Pro-Office Advocate
    createDebateParticipant({
      name: "In-Office Advocate",
      debateRole: "position_advocate",
      position: "In-person work is superior to remote work for most knowledge workers",
      agentConfig: {
        id: "office_advocate",
        model: "anthropic/claude-3-sonnet",
        systemPrompt: `You are participating in a formal debate on ${topic}.
You are advocating that in-person work is superior to remote work for most knowledge workers.
Focus on benefits like collaboration, mentorship, company culture, innovation through
spontaneous interaction, and clearer work-life boundaries. Support with research and evidence.`,
      },
      dialogueStyle: "assertive",
      preferredFormat: debateFormat
    }, createOpenRouterAgent({
      id: "office_advocate",
      model: "anthropic/claude-3-sonnet",
      systemPrompt: `You are participating in a formal debate on ${topic}.
You are advocating that in-person work is superior to remote work for most knowledge workers.
Focus on benefits like collaboration, mentorship, company culture, innovation through
spontaneous interaction, and clearer work-life boundaries. Support with research and evidence.`,
    }, client)),
  ];
  
  // Create debate workflow with custom configuration
  const debate = new DebateWorkflow(topic, participants, {
    debateFormat,
    roundCount: 2,
    maxTurns: 30,
    scoringEnabled: true,
    roundSummariesEnabled: true,
    scoringCriteria: {
      "logical_coherence": 0.3,
      "evidence_quality": 0.3,
      "responsiveness": 0.2,
      "persuasiveness": 0.1,
      "rule_adherence": 0.1,
    },
  });
  
  // Run the debate
  console.log("Starting debate...");
  const result = await debate.run();
  
  // Display results
  console.log("\n=== Debate Completed ===");
  console.log(`Duration: ${result.duration / 1000} seconds`);
  console.log(`Completed rounds: ${result.completedRounds}`);
  console.log(`Total turns: ${result.totalTurns}`);
  
  // Display scores
  console.log("\n=== Scores ===");
  for (const [participantId, score] of Object.entries(result.scores)) {
    const participant = participants.find(p => p.id === participantId);
    const name = participant ? participant.name : participantId;
    const typedScore = score as ParticipantScore;
    console.log(`${name}: ${typedScore.total.toFixed(2)}`);
    
    // Display score breakdown
    console.log("  Breakdown:");
    for (const [criterion, criterionScore] of Object.entries(typedScore.breakdown)) {
      console.log(`    ${criterion}: ${criterionScore.raw.toFixed(1)} (weighted: ${criterionScore.weighted.toFixed(2)})`);
    }
  }
  
  // Display summary
  console.log("\n=== Debate Summary ===");
  console.log(result.summary);
  
  // Display the full debate transcript
  console.log("\n=== Full Debate Transcript ===");
  for (const message of result.messages) {
    const participant = participants.find(p => p.id === message.participantId);
    const name = participant ? participant.name : message.participantId;
    
    console.log(`\n[${name}]:`);
    console.log(message.content);
    console.log("---");
  }
}

// Run the examples
if (import.meta.main) {
  // Choose which example to run (or comment out one)
  await runSimpleDebate();
  // await runCustomDebate();
}
