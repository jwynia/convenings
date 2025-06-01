/**
 * Debate Workflow Implementation
 * Specialized workflow for structured debates
 */

import { dirname } from "https://deno.land/std@0.171.0/path/mod.ts";

import { 
  DialogueWorkflow, 
  DialogueParticipant, 
  DialogueWorkflowConfig,
  DialogueWorkflowResult,
  DialogueState,
  DialogueMessage
} from "./dialogue_workflow.ts";

import {
  DebateParticipant,
  DebateModeratorParticipant,
  DebateRole,
  DebateFormat,
  ParticipantScore
} from "../participants/debate_participant.ts";

import {
  ILogger,
  createLogger,
  LogLevel,
  BudgetConfig,
  Logger
} from "../utils/logger.ts";

/**
 * Debate phase
 */
export enum DebatePhase {
  OPENING_STATEMENTS = "opening_statements",
  ARGUMENT_ROUNDS = "argument_rounds",
  CLOSING_STATEMENTS = "closing_statements",
  SUMMARY = "summary",
  COMPLETE = "complete",
}

/**
 * Configuration for a debate workflow
 */
export interface DebateWorkflowConfig extends DialogueWorkflowConfig {
  /**
   * Format of the debate
   * Default: "formal"
   */
  debateFormat?: DebateFormat;
  
  /**
   * Number of argument rounds
   * Default: 2
   */
  roundCount?: number;
  
  /**
   * Maximum tokens for opening statements
   * Default: 300
   */
  openingStatementMaxTokens?: number;
  
  /**
   * Maximum tokens for arguments and rebuttals
   * Default: 250
   */
  argumentMaxTokens?: number;
  
  /**
   * Maximum tokens for closing statements
   * Default: 350
   */
  closingStatementMaxTokens?: number;
  
  /**
   * Whether to enable scoring
   * Default: true
   */
  scoringEnabled?: boolean;
  
  /**
   * Scoring criteria and weights
   */
  scoringCriteria?: Record<string, number>;
  
  /**
   * Whether to include moderator summaries after each round
   * Default: true
   */
  roundSummariesEnabled?: boolean;
  
  /**
   * System prompt template for debates
   */
  debatePromptTemplate?: string;
  
  /**
   * Logger instance to use for logging
   * If not provided, a default logger will be created
   */
  logger?: ILogger;
  
  /**
   * Log level to use
   * Default: LogLevel.INFO
   */
  logLevel?: LogLevel;
  
  /**
   * Whether to enable debug logging
   * Default: false
   */
  debug?: boolean;
  
  /**
   * Budget configuration for the debate
   */
  budget?: BudgetConfig;
  
  /**
   * Path to save debate transcript and results
   * If provided, the debate will be saved to this file
   */
  outputFilePath?: string;
  
  /**
   * Format to save debate output in
   * Default: "json"
   */
  outputFormat?: "json" | "md" | "txt";
  
  /**
   * Whether to allow an early exit based on budget constraints
   * Default: true
   */
  allowBudgetEarlyExit?: boolean;
  
  /**
   * Whether to display progress in the console
   * Default: true
   */
  showProgress?: boolean;
  
  /**
   * Whether to generate a full transcript file
   * When false, only individual message files and an index file are created
   * Default: false
   */
  generateFullTranscript?: boolean;
}

/**
 * Result of a debate workflow
 */
export interface DebateWorkflowResult extends DialogueWorkflowResult {
  /**
   * Scores for each participant
   */
  scores: Record<string, ParticipantScore>;
  
  /**
   * Final summary by the moderator
   */
  summary: string;
  
  /**
   * Overall assessment of the debate
   */
  assessment?: string;
  
  /**
   * Whether the debate was completed with all phases
   */
  debateCompleted: boolean;
  
  /**
   * Total turns taken in the debate
   */
  totalTurns: number;
  
  /**
   * Number of completed argument rounds
   */
  completedRounds: number;
}

/**
 * Specialized workflow for structured debates
 */
export class DebateWorkflow extends DialogueWorkflow {
  private debateConfig: Required<DebateWorkflowConfig>;
  private currentPhase: DebatePhase = DebatePhase.OPENING_STATEMENTS;
  private moderator?: DebateModeratorParticipant;
  private advocates: DebateParticipant[] = [];
  private factCheckers: DebateParticipant[] = [];
  private currentRound: number = 0;
  private phaseProgress: number = 0;
  private scores: Map<string, ParticipantScore> = new Map();
  private phaseTurnOrder: string[] = [];
  private debateSummary: string = "";
  private logger: ILogger;
  private startTime: number = 0;
  private phaseStartTime: number = 0;
  private earlyExitReason?: string;
  
  /**
   * Create a new debate workflow
   * 
   * @param topic - Topic for the debate
   * @param participants - Participants in the debate
   * @param config - Configuration for the debate
   */
  constructor(
    topic: string,
    participants: DialogueParticipant[],
    config: DebateWorkflowConfig = {}
  ) {
    // Create default debate prompt template
    const debatePromptTemplate = config.debatePromptTemplate ?? 
      "This is a structured debate on {topic} between {participantNames}. " +
      "The debate follows a formal structure with opening statements, " +
      "multiple rounds of arguments and rebuttals, and closing statements. " +
      "Each participant should present their position clearly, support it with " +
      "evidence and reasoning, and respond directly to opposing arguments.";
    
    // Set up the base dialogue workflow with debate settings
    super(topic, participants, {
      ...config,
      systemPromptTemplate: debatePromptTemplate,
      // Use a custom exit condition for debates
      exitCondition: (state: DialogueState) => this.checkDebateComplete(state),
    });
    
    // Initialize logger
    const logLevel = config.debug ? LogLevel.DEBUG : (config.logLevel ?? LogLevel.INFO);
    this.logger = config.logger ?? createLogger(
      {
        logLevel,
        consoleOutput: config.showProgress ?? true,
        logFilePath: config.outputFilePath,
      },
      config.budget
    );
    
    // Store debate-specific configuration with defaults
    this.debateConfig = {
      debateFormat: config.debateFormat ?? "formal",
      roundCount: config.roundCount ?? 2,
      openingStatementMaxTokens: config.openingStatementMaxTokens ?? 300,
      argumentMaxTokens: config.argumentMaxTokens ?? 250,
      closingStatementMaxTokens: config.closingStatementMaxTokens ?? 350,
      scoringEnabled: config.scoringEnabled ?? true,
      scoringCriteria: config.scoringCriteria ?? {
        "logical_coherence": 0.25,
        "evidence_quality": 0.25,
        "responsiveness": 0.20,
        "persuasiveness": 0.15,
        "rule_adherence": 0.15,
      },
      roundSummariesEnabled: config.roundSummariesEnabled ?? true,
      debatePromptTemplate,
      logger: this.logger,
      logLevel,
      debug: config.debug ?? false,
      budget: config.budget,
      outputFilePath: config.outputFilePath,
      outputFormat: config.outputFormat ?? "json",
      allowBudgetEarlyExit: config.allowBudgetEarlyExit ?? true,
      showProgress: config.showProgress ?? true,
      generateFullTranscript: config.generateFullTranscript ?? false,
      ...config as Required<DialogueWorkflowConfig>,
    };
    
    // Log initialization
    this.logger.info(`Initialized debate workflow on topic: "${topic}"`, {
      debateFormat: this.debateConfig.debateFormat,
      roundCount: this.debateConfig.roundCount,
      participantCount: participants.length,
      advocateCount: participants.filter(p => p instanceof DebateParticipant && p.debateRole === "position_advocate").length,
    });
    
    // Initialize debate-specific state
    this.initializeDebateState();
  }
  
  /**
   * Run the debate to completion
   * 
   * @returns Result of the debate
   */
  async run(): Promise<DebateWorkflowResult> {
    // Start timing
    this.startTime = Date.now();
    this.phaseStartTime = Date.now();
    
    this.logger.info(`Starting debate on topic: "${this.state.topic}"`);
    this.logger.info(`Format: ${this.debateConfig.debateFormat}, Rounds: ${this.debateConfig.roundCount}`);
    
    try {
      // Run the dialogue using the base implementation
      const baseResult = await super.run();
      
      // Calculate duration
      const duration = Date.now() - this.startTime;
      
      // Prepare the debate result
      const result: DebateWorkflowResult = {
        ...baseResult,
        scores: Object.fromEntries(this.scores),
        summary: this.debateSummary,
        debateCompleted: this.currentPhase === DebatePhase.COMPLETE,
        totalTurns: this.state.currentTurn,
        completedRounds: this.currentRound,
      };
      
      // Log completion
      this.logger.info(`Debate completed in ${(duration / 1000).toFixed(2)} seconds`, {
        totalTurns: this.state.currentTurn,
        completedRounds: this.currentRound,
        debateCompleted: this.currentPhase === DebatePhase.COMPLETE,
        earlyExitReason: this.earlyExitReason,
      });
      
      // Get API usage metrics from both the logger and any OpenRouter clients
      const loggerUsage = this.logger.getApiUsageMetrics();
      
      // Extract OpenRouter clients from participants if they exist
      const openRouterMetrics = this.state.participants
        .filter(p => p.agent && 'client' in p.agent)
        .map(p => {
          const client = (p.agent as any).client;
          return client && client.getApiUsageMetrics ? client.getApiUsageMetrics() : null;
        })
        .filter(Boolean);
      
      // Combine metrics
      const apiUsage = {
        totalCalls: loggerUsage.totalCalls,
        inputTokens: loggerUsage.inputTokens,
        outputTokens: loggerUsage.outputTokens,
        totalTokens: loggerUsage.totalTokens,
        estimatedCost: loggerUsage.estimatedCost,
        byModel: { ...loggerUsage.byModel }
      };
      
      // Add metrics from OpenRouter clients
      for (const metrics of openRouterMetrics) {
        apiUsage.totalCalls += metrics.totalCalls;
        apiUsage.inputTokens += metrics.inputTokens;
        apiUsage.outputTokens += metrics.outputTokens;
        apiUsage.totalTokens += metrics.totalTokens;
        apiUsage.estimatedCost += metrics.estimatedCost;
        
        // Merge byModel data
        for (const [model, usage] of Object.entries(metrics.byModel)) {
          if (apiUsage.byModel[model]) {
            apiUsage.byModel[model].calls += usage.calls;
            apiUsage.byModel[model].inputTokens += usage.inputTokens;
            apiUsage.byModel[model].outputTokens += usage.outputTokens;
            apiUsage.byModel[model].totalTokens += usage.totalTokens;
            apiUsage.byModel[model].estimatedCost += usage.estimatedCost;
          } else {
            apiUsage.byModel[model] = { ...usage };
          }
        }
      }
      
      this.logger.info(`API usage summary:`, {
        totalTokens: apiUsage.totalTokens,
        totalCost: `$${apiUsage.estimatedCost.toFixed(4)}`,
        totalCalls: apiUsage.totalCalls,
      });
      
      // Save results if output path is configured
      if (this.debateConfig.outputFilePath) {
        // Try to determine the script path from stack trace
        let scriptPath: string | undefined = undefined;
        try {
          // Create an error to get a stack trace
          const err = new Error();
          // Parse the stack trace to find the user script that called this method
          const stackLines = err.stack?.split('\n') || [];
          for (const line of stackLines) {
            // Look for user script paths like examples/debate_example.ts
            if (line.includes('.ts') && !line.includes('src/convenings/') && !line.includes('node_modules')) {
              // Extract potential script path
              const match = line.match(/([a-zA-Z0-9_\-\/]+\.ts)/);
              if (match && match[1]) {
                scriptPath = match[1];
                this.logger.debug(`Detected script path from stack trace: ${scriptPath}`);
                break;
              }
            }
          }
        } catch (e) {
          // If we can't determine the script path, just continue without it
          this.logger.debug("Could not determine script path from stack trace", e);
        }
        
        // Create output directory with timestamp
        const outputDir = this.logger instanceof Logger ? 
          (this.logger as Logger).createOutputDirectory(dirname(this.debateConfig.outputFilePath), "debate", scriptPath) :
          this.debateConfig.outputFilePath;
        
        const resultWithApiUsage = {
          ...result,
          apiUsage,
          duration,
          timestamp: new Date().toISOString(),
        };
        
        // Save metadata
        const metadataPath = `${outputDir}/metadata.${this.debateConfig.outputFormat || 'json'}`;
        this.logger.info(`Saving debate metadata to ${metadataPath}`);
        await this.logger.saveToFile(
          {
            topic: this.state.topic,
            format: this.debateConfig.debateFormat,
            roundCount: this.debateConfig.roundCount,
            completedRounds: this.currentRound,
            totalTurns: this.state.currentTurn,
            scores: Object.fromEntries(this.scores),
            apiUsage,
            duration,
            timestamp: new Date().toISOString(),
          }, 
          metadataPath,
          this.debateConfig.outputFormat
        );
        
        // Save summary
        const summaryPath = `${outputDir}/summary.${this.debateConfig.outputFormat || 'md'}`;
        this.logger.info(`Saving debate summary to ${summaryPath}`);
        await this.logger.saveToFile(
          {
            topic: this.state.topic,
            summary: this.debateSummary,
            scores: Object.fromEntries(this.scores),
          },
          summaryPath,
          this.debateConfig.outputFormat
        );
        
        // Save individual messages
        this.logger.info(`Saving ${this.state.messages.length} messages to ${outputDir}/messages/`);
        let messageNum = 1;
        const messageFiles = [];
        
        for (const message of this.state.messages) {
          const participant = this.state.participants.find(p => p.id === message.participantId);
          const role = participant instanceof DebateParticipant ? 
            participant.debateRole : 
            (participant?.id === this.moderator?.id ? "moderator" : "participant");
          
          const paddedNum = messageNum.toString().padStart(3, '0');
          const fileName = `${paddedNum}_${role}_${message.participantId.slice(0, 8)}.${this.debateConfig.outputFormat || 'md'}`;
          
          await this.logger.saveToFile(
            {
              participantId: message.participantId,
              role,
              turnNumber: message.metadata?.turnNumber,
              debatePhase: message.metadata?.debatePhase,
              roundNumber: message.metadata?.roundNumber,
              content: message.content,
              timestamp: new Date(message.timestamp).toISOString(),
            },
            `${outputDir}/messages/${fileName}`,
            this.debateConfig.outputFormat
          );
          
          // Store message file info for the index
          messageFiles.push({
            fileName,
            participantId: message.participantId,
            role,
            turnNumber: message.metadata?.turnNumber,
            debatePhase: message.metadata?.debatePhase,
            roundNumber: message.metadata?.roundNumber,
            timestamp: new Date(message.timestamp).toISOString(),
          });
          
          messageNum++;
        }
        
        // Create an index file that references all the individual message files
        const indexPath = `${outputDir}/index.${this.debateConfig.outputFormat || 'md'}`;
        this.logger.info(`Creating debate index at ${indexPath}`);
        
        // Prepare index content based on format
        let indexContent;
        if (this.debateConfig.outputFormat === 'json') {
          indexContent = {
            topic: this.state.topic,
            format: this.debateConfig.debateFormat,
            roundCount: this.debateConfig.roundCount,
            completedRounds: this.currentRound,
            totalTurns: this.state.currentTurn,
            timestamp: new Date().toISOString(),
            scores: Object.fromEntries(this.scores),
            summary: this.debateSummary,
            apiUsage,
            duration,
            messages: messageFiles,
          };
        } else {
          // For md or txt formats, create a more readable index
          const participantNames = this.state.participants.map(p => {
            if (p instanceof DebateParticipant) {
              return `${p.debateRole}: ${p.id.slice(0, 8)}`;
            }
            return p.id.slice(0, 8);
          }).join(', ');
          
          indexContent = {
            title: `Debate Index: ${this.state.topic}`,
            metadata: {
              topic: this.state.topic,
              format: this.debateConfig.debateFormat,
              participants: participantNames,
              completedRounds: `${this.currentRound}/${this.debateConfig.roundCount}`,
              totalTurns: this.state.currentTurn,
              timestamp: new Date().toISOString(),
              apiUsage: {
                totalTokens: apiUsage.totalTokens,
                estimatedCost: `$${apiUsage.estimatedCost.toFixed(4)}`,
              },
            },
            summary: this.debateSummary,
            messages: messageFiles.map((m, i) => ({
              number: i + 1,
              file: m.fileName,
              role: m.role,
              phase: m.debatePhase,
              round: m.roundNumber,
            })),
          };
        }
        
        await this.logger.saveToFile(
          indexContent,
          indexPath,
          this.debateConfig.outputFormat
        );
        
        // Conditionally save the full transcript based on configuration
        if (this.debateConfig.generateFullTranscript) {
          const transcriptPath = `${outputDir}/transcript.${this.debateConfig.outputFormat || 'md'}`;
          this.logger.info(`Saving full transcript to ${transcriptPath}`);
          await this.logger.saveToFile(
            resultWithApiUsage, 
            transcriptPath,
            this.debateConfig.outputFormat
          );
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error running debate: ${error.message}`, {
        error: error.stack,
        phase: this.currentPhase,
        turn: this.state.currentTurn,
      });
      
      throw error;
    }
  }
  
  /**
   * Initialize debate-specific state
   */
  private initializeDebateState(): void {
    // Categorize participants by role
    for (const participant of this.state.participants) {
      if (participant instanceof DebateModeratorParticipant) {
        this.moderator = participant;
      } else if (participant instanceof DebateParticipant) {
        switch (participant.debateRole) {
          case "moderator":
            if (!this.moderator) {
              this.moderator = participant as DebateModeratorParticipant;
            }
            break;
          case "position_advocate":
            this.advocates.push(participant);
            break;
          case "fact_checker":
            this.factCheckers.push(participant);
            break;
        }
      }
    }
    
    // Ensure we have necessary participants
    if (!this.moderator) {
      throw new Error("Debate requires a moderator participant");
    }
    
    if (this.advocates.length < 2) {
      throw new Error("Debate requires at least 2 position advocates");
    }
    
    // Set up turn order for opening statements
    this.setupTurnOrderForPhase(DebatePhase.OPENING_STATEMENTS);
  }
  
  /**
   * Execute a single turn of the debate
   */
  protected async executeTurn(): Promise<void> {
    // Determine which participant's turn it is
    const participantId = this.phaseTurnOrder[this.phaseProgress];
    const participant = this.state.participants.find(p => p.id === participantId);
    
    if (!participant) {
      throw new Error(`Participant with ID ${participantId} not found`);
    }
    
    // Generate the prompt for this turn
    const prompt = await this.generateDebatePrompt(participant);
    
    // Get response based on debate phase and participant role
    let response: string;
    
    if (participant.id === this.moderator?.id) {
      // Moderator turn - generate appropriate response for current phase
      response = await this.handleModeratorTurn();
    } else {
      // Advocate turn - generate response based on debate phase
      response = await this.handleAdvocateTurn(participant as DebateParticipant, prompt);
    }
    
    // Record the message
    const message: DialogueMessage = {
      participantId: participant.id,
      content: response,
      timestamp: Date.now(),
      metadata: {
        turnNumber: this.state.currentTurn,
        debatePhase: this.currentPhase,
        roundNumber: this.currentRound,
      },
    };
    
    this.state.messages.push(message);
    
    // Advance the debate state
    this.advanceDebateState();
    
    // Score if enabled and appropriate
    if (this.debateConfig.scoringEnabled && 
        this.currentPhase === DebatePhase.ARGUMENT_ROUNDS &&
        participant.id !== this.moderator?.id) {
      await this.scoreArgument(participant.id, response);
    }
  }
  
  /**
   * Handle a moderator's turn
   * 
   * @returns Moderator's response
   */
  private async handleModeratorTurn(): Promise<string> {
    if (!this.moderator) {
      throw new Error("No moderator found for debate");
    }
    
    switch (this.currentPhase) {
      case DebatePhase.OPENING_STATEMENTS:
        if (this.phaseProgress === 0) {
          // Introduction to debate
          return this.moderator.generatePhaseIntroduction(
            "opening statements",
            `This debate on "${this.state.topic}" will begin with opening statements from each participant, ` +
            `followed by ${this.debateConfig.roundCount} rounds of arguments and rebuttals, ` +
            "and conclude with closing statements."
          );
        } else {
          // Transition to next speaker
          const prevIndex = this.phaseTurnOrder.indexOf(this.moderator.id) - 1;
          const nextIndex = this.phaseTurnOrder.indexOf(this.moderator.id) + 1;
          
          if (nextIndex < this.phaseTurnOrder.length) {
            const prevParticipant = this.getParticipantById(this.phaseTurnOrder[prevIndex]);
            const nextParticipant = this.getParticipantById(this.phaseTurnOrder[nextIndex]);
            
            if (prevParticipant && nextParticipant) {
              return this.moderator.generateSpeakerTransition(
                prevParticipant,
                nextParticipant,
                "We will now hear the opening statement from the next participant."
              );
            }
          }
          
          // Transition to argument rounds
          return this.moderator.generatePhaseIntroduction(
            "argument rounds",
            `We have heard opening statements from all participants. We will now proceed to the argument rounds, ` +
            `where each advocate will present arguments and respond to the other's points.`
          );
        }
      
      case DebatePhase.ARGUMENT_ROUNDS:
        if (this.phaseProgress === 0) {
          // Start of a new round
          return this.moderator.generatePhaseIntroduction(
            `argument round ${this.currentRound + 1}`,
            `We are now beginning round ${this.currentRound + 1} of arguments. ` +
            `Each advocate will present their arguments and respond to the other's points.`
          );
        } else if (this.debateConfig.roundSummariesEnabled && 
                  this.phaseProgress === this.phaseTurnOrder.length - 1) {
          // End of round summary
          const roundMessages = this.state.messages.slice(
            -(this.phaseTurnOrder.length - 1)
          );
          
          return this.moderator.generateRoundSummary(
            this.currentRound + 1, 
            roundMessages
          );
        } else {
          // Transition between speakers
          const prevIndex = this.phaseTurnOrder.indexOf(this.moderator.id) - 1;
          const nextIndex = this.phaseTurnOrder.indexOf(this.moderator.id) + 1;
          
          if (nextIndex < this.phaseTurnOrder.length) {
            const prevParticipant = this.getParticipantById(this.phaseTurnOrder[prevIndex]);
            const nextParticipant = this.getParticipantById(this.phaseTurnOrder[nextIndex]);
            
            if (prevParticipant && nextParticipant) {
              return this.moderator.generateSpeakerTransition(
                prevParticipant,
                nextParticipant
              );
            }
          }
        }
        
        // Default transition to next phase
        return this.moderator.generatePhaseIntroduction(
          "closing statements",
          "We have completed the argument rounds. We will now hear closing statements from each participant."
        );
      
      case DebatePhase.CLOSING_STATEMENTS:
        if (this.phaseProgress === 0) {
          // Introduction to closing statements
          return this.moderator.generatePhaseIntroduction(
            "closing statements",
            "We will now hear closing statements from each participant, summarizing their position and key arguments."
          );
        } else {
          // Transition between speakers
          const prevIndex = this.phaseTurnOrder.indexOf(this.moderator.id) - 1;
          const nextIndex = this.phaseTurnOrder.indexOf(this.moderator.id) + 1;
          
          if (nextIndex < this.phaseTurnOrder.length) {
            const prevParticipant = this.getParticipantById(this.phaseTurnOrder[prevIndex]);
            const nextParticipant = this.getParticipantById(this.phaseTurnOrder[nextIndex]);
            
            if (prevParticipant && nextParticipant) {
              return this.moderator.generateSpeakerTransition(
                prevParticipant,
                nextParticipant,
                "We will now hear the closing statement from the next participant."
              );
            }
          }
        }
        
        // Default transition to summary phase
        return this.moderator.generatePhaseIntroduction(
          "summary",
          "All participants have presented their closing statements. I will now provide a summary of the debate."
        );
      
      case DebatePhase.SUMMARY:
        // Generate debate conclusion
        this.debateSummary = await this.moderator.generateDebateConclusion(this.state);
        return this.debateSummary;
      
      default:
        return "The debate has concluded.";
    }
  }
  
  /**
   * Handle an advocate's turn
   * 
   * @param participant - The advocate participant
   * @param prompt - Base prompt for the turn
   * @returns Advocate's response
   */
  private async handleAdvocateTurn(
    participant: DebateParticipant, 
    prompt: string
  ): Promise<string> {
    switch (this.currentPhase) {
      case DebatePhase.OPENING_STATEMENTS:
        return participant.generateOpeningStatement(prompt);
      
      case DebatePhase.ARGUMENT_ROUNDS:
        // Determine if this is an argument or rebuttal
        const isFirstSpeaker = this.advocates.indexOf(participant) === 0;
        const isEvenTurn = this.phaseProgress % 4 < 2;
        
        if ((isFirstSpeaker && isEvenTurn) || (!isFirstSpeaker && !isEvenTurn)) {
          // This is an argument turn
          return participant.generateArgument(prompt);
        } else {
          // This is a rebuttal turn - get the previous argument
          const previousMessageIndex = this.state.messages.length - 2; // Skip moderator transition
          if (previousMessageIndex >= 0) {
            const previousArgument = this.state.messages[previousMessageIndex].content;
            return participant.generateRebuttal(prompt, previousArgument);
          } else {
            return participant.generateArgument(prompt);
          }
        }
      
      case DebatePhase.CLOSING_STATEMENTS:
        return participant.generateClosingStatement(prompt);
      
      default:
        return "I have nothing more to add to the debate.";
    }
  }
  
  /**
   * Score an argument
   * 
   * @param participantId - ID of the participant to score
   * @param argument - Argument content to score
   */
  private async scoreArgument(participantId: string, argument: string): Promise<void> {
    if (!this.moderator || !this.debateConfig.scoringEnabled) {
      return;
    }
    
    // Get debate context for scoring
    const context = `
Topic: ${this.state.topic}
Current Phase: ${this.currentPhase}
Round: ${this.currentRound + 1} of ${this.debateConfig.roundCount}
Participant Position: ${this.getParticipantPosition(participantId)}
    `;
    
    // Score the argument
    const score = await this.moderator.scoreArgument(
      participantId,
      argument,
      context
    );
    
    // Update scores
    this.scores.set(participantId, score);
  }
  
  /**
   * Get a participant's position
   * 
   * @param participantId - ID of the participant
   * @returns Position of the participant
   */
  private getParticipantPosition(participantId: string): string {
    const participant = this.state.participants.find(p => p.id === participantId);
    
    if (participant instanceof DebateParticipant) {
      return participant.position || "Unknown position";
    }
    
    return "Unknown position";
  }
  
  /**
   * Generate a debate-specific prompt for a participant's turn
   * 
   * @param participant - The participant whose turn it is
   * @returns Prompt for the participant
   */
  private async generateDebatePrompt(participant: DialogueParticipant): Promise<string> {
    // Get system prompt
    const systemPrompt = this.getSystemPrompt();
    
    // Build dialogue history
    const dialogueHistory = this.formatDialogueHistory();
    
    // Get phase-specific instruction
    const phaseInstruction = this.getPhaseInstruction(participant);
    
    // Construct the full prompt
    const prompt = [
      this.debateConfig.includeSystemPrompt ? systemPrompt : "",
      `The current topic is: ${this.state.topic}`,
      `Current debate phase: ${this.getPhaseDescription()}`,
      "",
      "Debate history:",
      dialogueHistory,
      "",
      phaseInstruction,
    ].filter(Boolean).join("\n");
    
    return prompt;
  }
  
  /**
   * Get a description of the current phase
   * 
   * @returns Phase description
   */
  private getPhaseDescription(): string {
    switch (this.currentPhase) {
      case DebatePhase.OPENING_STATEMENTS:
        return "Opening Statements";
      
      case DebatePhase.ARGUMENT_ROUNDS:
        return `Argument Round ${this.currentRound + 1} of ${this.debateConfig.roundCount}`;
      
      case DebatePhase.CLOSING_STATEMENTS:
        return "Closing Statements";
      
      case DebatePhase.SUMMARY:
        return "Debate Summary";
      
      default:
        return "Debate Complete";
    }
  }
  
  /**
   * Get phase-specific instruction for a participant
   * 
   * @param participant - The participant to get instruction for
   * @returns Phase-specific instruction
   */
  private getPhaseInstruction(participant: DialogueParticipant): string {
    if (participant.id === this.moderator?.id) {
      // Moderator instructions
      switch (this.currentPhase) {
        case DebatePhase.OPENING_STATEMENTS:
          return "It is now your turn to moderate the opening statements phase.";
        
        case DebatePhase.ARGUMENT_ROUNDS:
          return `It is now your turn to moderate round ${this.currentRound + 1} of the argument phase.`;
        
        case DebatePhase.CLOSING_STATEMENTS:
          return "It is now your turn to moderate the closing statements phase.";
        
        case DebatePhase.SUMMARY:
          return "Please provide a summary of the debate, highlighting key points and areas of agreement/disagreement.";
        
        default:
          return "The debate has concluded.";
      }
    } else {
      // Participant instructions
      switch (this.currentPhase) {
        case DebatePhase.OPENING_STATEMENTS:
          return `It is now your turn to present your opening statement. Introduce your position on the topic "${this.state.topic}".`;
        
        case DebatePhase.ARGUMENT_ROUNDS:
          // Check if this is an argument or rebuttal turn
          const isAdvocate = participant instanceof DebateParticipant && 
                            participant.debateRole === "position_advocate";
          const advocateIndex = this.advocates.findIndex(a => a.id === participant.id);
          const isFirstSpeaker = advocateIndex === 0;
          const isEvenTurn = this.phaseProgress % 4 < 2;
          
          if (isAdvocate) {
            if ((isFirstSpeaker && isEvenTurn) || (!isFirstSpeaker && !isEvenTurn)) {
              return `It is now your turn to present an argument supporting your position in round ${this.currentRound + 1}.`;
            } else {
              return `It is now your turn to rebut the previous argument in round ${this.currentRound + 1}.`;
            }
          }
          
          return `It is now your turn to contribute to round ${this.currentRound + 1} of the debate.`;
        
        case DebatePhase.CLOSING_STATEMENTS:
          return "It is now your turn to present your closing statement. Summarize your position and key arguments.";
        
        default:
          return "The debate has concluded.";
      }
    }
  }
  
  /**
   * Advance the debate state based on current progress
   */
  private advanceDebateState(): void {
    // Increment phase progress
    this.phaseProgress++;
    
    // Check if we've completed the current phase
    if (this.phaseProgress >= this.phaseTurnOrder.length) {
      // Move to the next phase
      this.advanceToNextPhase();
    }
  }
  
  /**
   * Advance to the next debate phase
   */
  private advanceToNextPhase(): void {
    switch (this.currentPhase) {
      case DebatePhase.OPENING_STATEMENTS:
        // Move to argument rounds
        this.currentPhase = DebatePhase.ARGUMENT_ROUNDS;
        this.setupTurnOrderForPhase(DebatePhase.ARGUMENT_ROUNDS);
        break;
      
      case DebatePhase.ARGUMENT_ROUNDS:
        // Increment round or move to closing statements
        this.currentRound++;
        
        if (this.currentRound >= this.debateConfig.roundCount) {
          this.currentPhase = DebatePhase.CLOSING_STATEMENTS;
          this.setupTurnOrderForPhase(DebatePhase.CLOSING_STATEMENTS);
        } else {
          // Reset phase progress for next round
          this.setupTurnOrderForPhase(DebatePhase.ARGUMENT_ROUNDS);
        }
        break;
      
      case DebatePhase.CLOSING_STATEMENTS:
        // Move to summary
        this.currentPhase = DebatePhase.SUMMARY;
        this.setupTurnOrderForPhase(DebatePhase.SUMMARY);
        break;
      
      case DebatePhase.SUMMARY:
        // Complete the debate
        this.currentPhase = DebatePhase.COMPLETE;
        this.phaseProgress = 0;
        break;
      
      default:
        // Debate is already complete
        break;
    }
  }
  
  /**
   * Set up turn order for a debate phase
   * 
   * @param phase - Debate phase to set up
   */
  private setupTurnOrderForPhase(phase: DebatePhase): void {
    this.phaseProgress = 0;
    this.phaseTurnOrder = [];
    
    switch (phase) {
      case DebatePhase.OPENING_STATEMENTS:
        // Moderator introduces, then each advocate gives opening statement
        if (this.moderator) {
          this.phaseTurnOrder.push(this.moderator.id);
        }
        
        for (const advocate of this.advocates) {
          this.phaseTurnOrder.push(this.moderator?.id || "");
          this.phaseTurnOrder.push(advocate.id);
        }
        break;
      
      case DebatePhase.ARGUMENT_ROUNDS:
        // Each advocate gets an argument and rebuttal, with moderator transitions
        if (this.moderator) {
          this.phaseTurnOrder.push(this.moderator.id); // Round introduction
        }
        
        // First advocate presents argument
        this.phaseTurnOrder.push(this.moderator?.id || "");
        this.phaseTurnOrder.push(this.advocates[0].id);
        
        // Second advocate rebuts
        this.phaseTurnOrder.push(this.moderator?.id || "");
        this.phaseTurnOrder.push(this.advocates[1].id);
        
        // Second advocate presents argument
        this.phaseTurnOrder.push(this.moderator?.id || "");
        this.phaseTurnOrder.push(this.advocates[1].id);
        
        // First advocate rebuts
        this.phaseTurnOrder.push(this.moderator?.id || "");
        this.phaseTurnOrder.push(this.advocates[0].id);
        
        // Round summary by moderator
        if (this.moderator && this.debateConfig.roundSummariesEnabled) {
          this.phaseTurnOrder.push(this.moderator.id);
        }
        break;
      
      case DebatePhase.CLOSING_STATEMENTS:
        // Moderator introduces, then each advocate gives closing statement
        if (this.moderator) {
          this.phaseTurnOrder.push(this.moderator.id);
        }
        
        for (const advocate of this.advocates) {
          this.phaseTurnOrder.push(this.moderator?.id || "");
          this.phaseTurnOrder.push(advocate.id);
        }
        break;
      
      case DebatePhase.SUMMARY:
        // Only moderator speaks in summary phase
        if (this.moderator) {
          this.phaseTurnOrder.push(this.moderator.id);
        }
        break;
      
      default:
        break;
    }
    
    // Remove empty entries
    this.phaseTurnOrder = this.phaseTurnOrder.filter(Boolean);
  }
  
  /**
   * Check if the debate is complete based on the current state
   * 
   * @param state - Current state of the dialogue
   * @returns Whether the debate is complete
   */
  private checkDebateComplete(state: DialogueState): boolean {
    return this.currentPhase === DebatePhase.COMPLETE;
  }
  
  /**
   * Get a participant by ID
   * 
   * @param id - Participant ID
   * @returns The participant, or undefined if not found
   */
  private getParticipantById(id: string): DialogueParticipant | undefined {
    return this.state.participants.find(p => p.id === id);
  }
}

/**
 * Create a new debate workflow
 * 
 * @param topic - Topic for the debate
 * @param participants - Participants in the debate
 * @param config - Configuration for the debate
 * @returns New debate workflow
 */
export function createDebateWorkflow(
  topic: string,
  participants: DialogueParticipant[],
  config?: DebateWorkflowConfig
): DebateWorkflow {
  return new DebateWorkflow(topic, participants, config);
}
