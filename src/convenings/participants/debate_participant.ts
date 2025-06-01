/**
 * Debate Participant Implementation
 * Specialized participants for structured debate workflows
 */

import { IAgent, IAgentConfig } from "../../utils/interfaces.ts";
import { DialogueParticipant, DialogueParticipantConfig } from "./dialogue_participant.ts";
import { MotivatedDialogueParticipant, MotivatedDialogueParticipantConfig } from "./motivated_dialogue_participant.ts";
import { DialogueState, DialogueMessage } from "../workflows/dialogue_workflow.ts";

/**
 * Debate role types
 */
export type DebateRole = "moderator" | "position_advocate" | "fact_checker";

/**
 * Debate format types
 */
export type DebateFormat = "formal" | "casual" | "educational" | "competitive";

/**
 * Configuration for a debate participant
 */
export interface DebateParticipantConfig extends MotivatedDialogueParticipantConfig {
  /**
   * Specific role in the debate
   */
  debateRole?: DebateRole;
  
  /**
   * Position being advocated (for position advocates)
   */
  position?: string;
  
  /**
   * Preferred debate format
   */
  preferredFormat?: DebateFormat;
}

/**
 * Score for a debate criterion
 */
export interface CriterionScore {
  /**
   * Raw score value (0-10)
   */
  raw: number;
  
  /**
   * Weighted score value
   */
  weighted: number;
  
  /**
   * Justification for the score
   */
  justification?: string;
}

/**
 * Overall score for a debate participant
 */
export interface ParticipantScore {
  /**
   * Total weighted score (0-10)
   */
  total: number;
  
  /**
   * Scores for individual criteria
   */
  breakdown: Record<string, CriterionScore>;
}

/**
 * Base class for debate participants
 */
export class DebateParticipant extends MotivatedDialogueParticipant {
  /**
   * Specific role in the debate
   */
  readonly debateRole: DebateRole;
  
  /**
   * Position being advocated (for position advocates)
   */
  readonly position?: string;
  
  /**
   * Preferred debate format
   */
  readonly preferredFormat: DebateFormat;
  
  /**
   * Create a new debate participant
   * 
   * @param config - Configuration for the participant
   * @param agent - Agent implementation
   */
  constructor(
    config: DebateParticipantConfig,
    agent?: IAgent
  ) {
    super({
      ...config,
      role: config.role || config.debateRole || "position_advocate",
    }, agent);
    
    this.debateRole = config.debateRole || "position_advocate";
    this.position = config.position;
    this.preferredFormat = config.preferredFormat || "formal";
    
    // Validate configuration
    if (this.debateRole === "position_advocate" && !this.position) {
      throw new Error("Position advocates must have a position defined");
    }
  }
  
  /**
   * Generate an opening statement
   * 
   * @param prompt - Base prompt
   * @returns Opening statement
   */
  async generateOpeningStatement(prompt: string): Promise<string> {
    const enhancedPrompt = this.enhancePromptForDebate(prompt, "opening_statement");
    return this.agent.execute(enhancedPrompt);
  }
  
  /**
   * Generate an argument
   * 
   * @param prompt - Base prompt
   * @returns Argument
   */
  async generateArgument(prompt: string): Promise<string> {
    const enhancedPrompt = this.enhancePromptForDebate(prompt, "argument");
    return this.agent.execute(enhancedPrompt);
  }
  
  /**
   * Generate a rebuttal
   * 
   * @param prompt - Base prompt
   * @param targetArgument - Argument to rebut
   * @returns Rebuttal
   */
  async generateRebuttal(prompt: string, targetArgument: string): Promise<string> {
    const enhancedPrompt = this.enhancePromptForDebate(
      `${prompt}\n\nOpponent's argument: ${targetArgument}`, 
      "rebuttal"
    );
    return this.agent.execute(enhancedPrompt);
  }
  
  /**
   * Generate a closing statement
   * 
   * @param prompt - Base prompt
   * @returns Closing statement
   */
  async generateClosingStatement(prompt: string): Promise<string> {
    const enhancedPrompt = this.enhancePromptForDebate(prompt, "closing_statement");
    return this.agent.execute(enhancedPrompt);
  }
  
  /**
   * Enhance a prompt for debate context
   * 
   * @param prompt - Base prompt
   * @param statementType - Type of statement being generated
   * @returns Enhanced prompt
   */
  protected enhancePromptForDebate(prompt: string, statementType: string): string {
    // Base guidance for all debate participants
    const formatGuidance = this.getFormatGuidance();
    
    // Role-specific guidance
    const roleGuidance = this.getRoleGuidance(statementType);
    
    // Position guidance (for advocates)
    const positionGuidance = this.debateRole === "position_advocate" && this.position
      ? `You are advocating for the position: "${this.position}".`
      : "";
    
    // Statement-specific guidance
    const statementGuidance = this.getStatementGuidance(statementType);
    
    // Combine all guidance
    const guidance = [
      "You are participating in a structured debate.",
      formatGuidance,
      roleGuidance,
      positionGuidance,
      statementGuidance,
    ].filter(Boolean).join("\n");
    
    // Return enhanced prompt
    return [
      guidance,
      "",
      prompt
    ].join("\n");
  }
  
  /**
   * Get guidance for the debate format
   * 
   * @returns Format guidance
   */
  private getFormatGuidance(): string {
    switch (this.preferredFormat) {
      case "formal":
        return "This is a formal debate. Use precise language, structured arguments, and formal tone. Avoid rhetorical flourishes and focus on logical reasoning and evidence.";
      
      case "casual":
        return "This is a casual debate. Use conversational language while still maintaining logical structure. Personal examples and analogies are welcome.";
      
      case "educational":
        return "This is an educational debate. Focus on explaining concepts clearly, providing context, and helping the audience understand different perspectives.";
      
      case "competitive":
        return "This is a competitive debate. Focus on persuasive arguments, addressing counterarguments preemptively, and using compelling evidence to support your position.";
      
      default:
        return "This is a structured debate. Present clear arguments supported by evidence and reasoning.";
    }
  }
  
  /**
   * Get guidance for the participant's role
   * 
   * @param statementType - Type of statement being generated
   * @returns Role guidance
   */
  private getRoleGuidance(statementType: string): string {
    switch (this.debateRole) {
      case "moderator":
        return "Your role is to facilitate the debate, ensure participants follow the structure, and maintain a fair and productive discussion.";
      
      case "position_advocate":
        return "Your role is to present and defend a specific position, using strong arguments, evidence, and addressing counterarguments effectively.";
      
      case "fact_checker":
        return "Your role is to verify factual claims, provide corrections when necessary, and ensure the debate is grounded in accurate information.";
      
      default:
        return "";
    }
  }
  
  /**
   * Get guidance for the statement type
   * 
   * @param statementType - Type of statement being generated
   * @returns Statement guidance
   */
  private getStatementGuidance(statementType: string): string {
    switch (statementType) {
      case "opening_statement":
        return "This is an opening statement. Clearly present your position, provide an overview of your key arguments, and establish the framework for your case.";
      
      case "argument":
        return "This is a main argument. Present a specific point that supports your position, backed by evidence, examples, and logical reasoning.";
      
      case "rebuttal":
        return "This is a rebuttal. Directly address your opponent's arguments, identify weaknesses, and explain why your position still holds or is stronger.";
      
      case "closing_statement":
        return "This is a closing statement. Summarize your strongest arguments, address key counterarguments, and leave a compelling final impression.";
      
      default:
        return "";
    }
  }
}

/**
 * Specialized participant for debate moderation
 */
export class DebateModeratorParticipant extends DebateParticipant {
  /**
   * Scoring criteria and weights
   */
  private scoringCriteria: Record<string, number> = {
    "logical_coherence": 0.25,
    "evidence_quality": 0.25,
    "responsiveness": 0.20,
    "persuasiveness": 0.15,
    "rule_adherence": 0.15,
  };
  
  /**
   * Create a new debate moderator participant
   * 
   * @param config - Configuration for the moderator
   * @param agent - Agent implementation
   */
  constructor(
    config: DebateParticipantConfig,
    agent?: IAgent
  ) {
    super({
      ...config,
      debateRole: "moderator",
      primaryMotivation: config.primaryMotivation || "facilitation",
      dialogueStyle: config.dialogueStyle || "analytical",
    }, agent);
    
    // Override with custom scoring criteria if provided
    if (config.config?.scoringCriteria) {
      this.scoringCriteria = {
        ...this.scoringCriteria,
        ...config.config.scoringCriteria as Record<string, number>,
      };
    }
  }
  
  /**
   * Generate a phase introduction
   * 
   * @param phase - Debate phase
   * @param context - Additional context
   * @returns Phase introduction
   */
  async generatePhaseIntroduction(phase: string, context?: string): Promise<string> {
    const prompt = `
You are moderating a debate. It's time to introduce the ${phase} phase.

${context ? `Context: ${context}` : ""}

Please provide a clear and concise introduction to this phase, explaining what will happen and what is expected of the participants.
    `;
    
    return this.agent.execute(prompt);
  }
  
  /**
   * Generate a transition between speakers
   * 
   * @param fromParticipant - Previous speaker
   * @param toParticipant - Next speaker
   * @param context - Additional context
   * @returns Speaker transition
   */
  async generateSpeakerTransition(
    fromParticipant: DialogueParticipant,
    toParticipant: DialogueParticipant,
    context?: string
  ): Promise<string> {
    const prompt = `
You are moderating a debate. It's time to transition from ${fromParticipant.name} to ${toParticipant.name}.

${context ? `Context: ${context}` : ""}

Please provide a brief transition that acknowledges the previous speaker and introduces the next speaker.
    `;
    
    return this.agent.execute(prompt);
  }
  
  /**
   * Generate a round summary
   * 
   * @param roundNumber - Round number
   * @param messages - Messages in the round
   * @returns Round summary
   */
  async generateRoundSummary(roundNumber: number, messages: DialogueMessage[]): Promise<string> {
    // Extract messages as a formatted string
    const messagesText = messages.map(msg => 
      `${msg.participantId}: ${msg.content}`
    ).join("\n\n");
    
    const prompt = `
You are moderating a debate. Round ${roundNumber} has just completed.

Here are the messages from this round:

${messagesText}

Please provide a brief, neutral summary of the key points made in this round, highlighting areas of agreement and disagreement.
    `;
    
    return this.agent.execute(prompt);
  }
  
  /**
   * Generate a debate conclusion
   * 
   * @param dialogueState - Final state of the dialogue
   * @returns Debate conclusion
   */
  async generateDebateConclusion(dialogueState: DialogueState): Promise<string> {
    // Get participant names
    const participantNames = dialogueState.participants
      .map(p => p.name)
      .join(", ");
    
    // Extract recent messages
    const recentMessages = dialogueState.messages
      .slice(-dialogueState.participants.length)
      .map(msg => {
        const participant = dialogueState.participants.find(p => p.id === msg.participantId);
        return `${participant?.name || msg.participantId}: ${msg.content}`;
      })
      .join("\n\n");
    
    const prompt = `
You are moderating a debate on "${dialogueState.topic}" between ${participantNames}.
The debate has now concluded.

Here are the closing statements:

${recentMessages}

Please provide a conclusion for the debate that:
1. Thanks the participants
2. Summarizes the key points of agreement and disagreement
3. Highlights the strongest arguments on each side
4. Concludes the event without declaring a winner
    `;
    
    return this.agent.execute(prompt);
  }
  
  /**
   * Score a participant's argument
   * 
   * @param participantId - ID of the participant
   * @param argument - Argument to score
   * @param context - Dialogue context
   * @returns Argument score
   */
  async scoreArgument(
    participantId: string,
    argument: string,
    context: string
  ): Promise<ParticipantScore> {
    const prompt = `
You are evaluating an argument in a debate.

Context: ${context}

Argument to evaluate: ${argument}

Please score this argument on the following criteria (scale of 0-10):

1. Logical Coherence: Clarity and soundness of reasoning
2. Evidence Quality: Use of relevant, credible evidence
3. Responsiveness: Directly addressing opponent's arguments
4. Persuasiveness: Overall convincingness of presentation
5. Rule Adherence: Following debate format and constraints

For each criterion, provide:
- A score from 0-10
- A brief justification for the score

Important: Your response must be formatted EXACTLY as follows (JSON object only, no other text):
{
  "logical_coherence": {"score": X, "justification": "..."},
  "evidence_quality": {"score": X, "justification": "..."},
  "responsiveness": {"score": X, "justification": "..."},
  "persuasiveness": {"score": X, "justification": "..."},
  "rule_adherence": {"score": X, "justification": "..."}
}
    `;
    
    const response = await this.agent.execute(prompt);
    
    try {
      // Extract JSON from response (in case model adds surrounding text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      
      // Parse the response as JSON
      const rawScores = JSON.parse(jsonString);
      
      // Calculate weighted scores
      const breakdown: Record<string, CriterionScore> = {};
      let totalWeightedScore = 0;
      
      for (const [criterion, details] of Object.entries(rawScores)) {
        const weight = this.scoringCriteria[criterion] || 0.1;
        const rawScore = (details as {score: number}).score;
        const justification = (details as {justification: string}).justification;
        
        const weightedScore = rawScore * weight;
        totalWeightedScore += weightedScore;
        
        breakdown[criterion] = {
          raw: rawScore,
          weighted: weightedScore,
          justification,
        };
      }
      
      // Normalize to 0-10 scale
      const normalizedTotal = Math.min(10, Math.max(0, totalWeightedScore / 
        Object.values(this.scoringCriteria).reduce((sum, w) => sum + w, 0) * 10));
      
      return {
        total: normalizedTotal,
        breakdown,
      };
    } catch (error) {
      console.error("Error parsing score response:", error);
      
      // Return a default score on error
      return {
        total: 5,
        breakdown: Object.fromEntries(
          Object.entries(this.scoringCriteria).map(([key, weight]) => [
            key,
            { raw: 5, weighted: 5 * weight, justification: "Score defaulted due to parsing error" },
          ])
        ),
      };
    }
  }
}

/**
 * Create a new debate participant
 * 
 * @param config - Configuration for the participant
 * @param agent - Agent implementation (optional)
 * @returns New debate participant
 */
export function createDebateParticipant(
  config: DebateParticipantConfig,
  agent?: IAgent
): DebateParticipant {
  return new DebateParticipant(config, agent);
}

/**
 * Create a new debate moderator
 * 
 * @param config - Configuration for the moderator
 * @param agent - Agent implementation (optional)
 * @returns New debate moderator participant
 */
export function createDebateModerator(
  config: Omit<DebateParticipantConfig, "debateRole">,
  agent?: IAgent
): DebateModeratorParticipant {
  return new DebateModeratorParticipant({
    ...config,
    debateRole: "moderator",
  }, agent);
}
