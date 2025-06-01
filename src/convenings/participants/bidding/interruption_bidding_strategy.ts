/**
 * Interruption Bidding Strategy Implementation
 * Provides bidding strategies for handling interruptions and urgency in dialogues.
 */

import { Bid, BidContext, IBiddingStrategy } from "./bidding_strategy.ts";
import { DialogueState } from "../../workflows/dialogue_workflow.ts";

/**
 * Extended bid context with urgency information
 */
export interface UrgencyBidContext extends BidContext {
  /**
   * Urgency level for the participant (0.0 to 1.0)
   * Higher values indicate more urgent need to speak
   */
  urgencyLevel?: number;
  
  /**
   * Reason for urgency, if any
   */
  urgencyReason?: string;
  
  /**
   * Time window for urgency (how long the urgency will last)
   */
  urgencyWindow?: number;
  
  /**
   * Whether interruption is allowed in the current dialogue context
   */
  interruptionAllowed?: boolean;
}

/**
 * Bidding strategy that enables interruptions based on urgency
 */
export class InterruptionBiddingStrategy implements IBiddingStrategy {
  private baseStrength: number;
  private interruptionThreshold: number;
  private maxInterruptionBoost: number;
  
  /**
   * Create a new interruption-based bidding strategy
   * 
   * @param baseStrength - Base bid strength to use (0.0 to 1.0)
   * @param interruptionThreshold - Minimum urgency needed to trigger interruption (0.7-0.9 recommended)
   * @param maxInterruptionBoost - Maximum boost applied for interruptions (0.2-0.5 recommended)
   */
  constructor(
    baseStrength: number = 0.5,
    interruptionThreshold: number = 0.8,
    maxInterruptionBoost: number = 0.4
  ) {
    this.baseStrength = Math.max(0, Math.min(1, baseStrength));
    this.interruptionThreshold = Math.max(0.5, Math.min(0.95, interruptionThreshold));
    this.maxInterruptionBoost = Math.max(0.1, Math.min(0.5, maxInterruptionBoost));
  }
  
  /**
   * Calculate a bid based on urgency and interruption potential
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with interruption adjustment
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    const { dialogueState, participantId } = context;
    const urgencyContext = context as UrgencyBidContext;
    
    // Start with base strength
    let bidStrength = this.baseStrength;
    let shouldInterrupt = false;
    let interruptionReason = "";
    
    // Check if participant has high urgency
    if (urgencyContext.urgencyLevel !== undefined) {
      const urgencyLevel = urgencyContext.urgencyLevel;
      
      // Determine if interruption is appropriate
      if (urgencyLevel >= this.interruptionThreshold) {
        shouldInterrupt = this.shouldAllowInterruption(urgencyContext, dialogueState);
        
        if (shouldInterrupt) {
          // Calculate interruption boost based on urgency level
          const interruptionBoost = 
            (urgencyLevel - this.interruptionThreshold) / 
            (1 - this.interruptionThreshold) * 
            this.maxInterruptionBoost;
          
          // Apply boost to bid strength
          bidStrength = Math.min(1, this.baseStrength + interruptionBoost);
          interruptionReason = urgencyContext.urgencyReason || "High urgency";
        }
      }
    } else {
      // Fallback to basic urgency detection
      const urgencyData = this.detectUrgencyFromContext(dialogueState, participantId);
      
      if (urgencyData.urgencyLevel >= this.interruptionThreshold) {
        shouldInterrupt = this.shouldAllowInterruption(
          { ...context, urgencyLevel: urgencyData.urgencyLevel } as UrgencyBidContext,
          dialogueState
        );
        
        if (shouldInterrupt) {
          bidStrength = Math.min(1, this.baseStrength + (this.maxInterruptionBoost * 0.7));
          interruptionReason = urgencyData.reason;
        }
      }
    }
    
    // Prepare bid with appropriate metadata
    return {
      participantId,
      strength: bidStrength,
      reason: shouldInterrupt ? 
        `Interruption bidding (${interruptionReason})` : 
        "Interruption bidding (no urgent need)",
      metadata: {
        isInterruption: shouldInterrupt,
        urgencyLevel: urgencyContext.urgencyLevel,
        urgencyReason: interruptionReason,
      }
    };
  }
  
  /**
   * Determine if interruption should be allowed in the current context
   * 
   * @param context - Urgency bid context
   * @param dialogueState - Current dialogue state
   * @returns Whether interruption should be allowed
   */
  private shouldAllowInterruption(
    context: UrgencyBidContext,
    dialogueState: DialogueState
  ): boolean {
    // If explicitly disallowed, don't interrupt
    if (context.interruptionAllowed === false) {
      return false;
    }
    
    // Don't interrupt if there are no messages yet
    if (dialogueState.messages.length === 0) {
      return false;
    }
    
    // Get the current speaker (last message)
    const currentSpeakerId = dialogueState.messages[dialogueState.messages.length - 1].participantId;
    
    // Don't interrupt yourself
    if (currentSpeakerId === context.participantId) {
      return false;
    }
    
    // Check if current speaker is a moderator or authority figure
    const currentSpeaker = dialogueState.participants.find(p => p.id === currentSpeakerId);
    if (currentSpeaker && (
      currentSpeaker.role === "moderator" || 
      currentSpeaker.role === "facilitator" ||
      currentSpeaker.role === "authority"
    )) {
      // Only interrupt authorities if urgency is very high
      return (context.urgencyLevel || 0) > (this.interruptionThreshold + 0.1);
    }
    
    // Check for recent interruptions to prevent interruption cascades
    const recentMessages = dialogueState.messages.slice(-3);
    for (const message of recentMessages) {
      if (message.metadata && message.metadata.isInterruption) {
        // Recent interruption - be more conservative
        return (context.urgencyLevel || 0) > (this.interruptionThreshold + 0.05);
      }
    }
    
    // Default to allowing interruption if urgency is high enough
    return true;
  }
  
  /**
   * Detect urgency from dialogue context when explicit urgency is not provided
   * 
   * @param dialogueState - Current dialogue state
   * @param participantId - ID of the participant making the bid
   * @returns Detected urgency level and reason
   */
  private detectUrgencyFromContext(
    dialogueState: DialogueState,
    participantId: string
  ): { urgencyLevel: number; reason: string } {
    // Default - no urgency
    let urgencyLevel = 0;
    let reason = "No urgent need";
    
    // Check for time-sensitive keywords in recent messages
    const recentMessages = dialogueState.messages.slice(-5);
    
    // Keywords indicating potential urgency
    const urgencyKeywords = [
      "urgent", "important", "critical", "emergency", "immediately",
      "correct", "wrong", "mistake", "error", "false",
      "danger", "risk", "warning", "alert", "attention"
    ];
    
    // Check if any messages contain urgency keywords
    for (const message of recentMessages) {
      const content = message.content.toLowerCase();
      
      for (const keyword of urgencyKeywords) {
        if (content.includes(keyword)) {
          // Found urgency keyword - increase urgency level
          urgencyLevel = Math.max(urgencyLevel, 0.7);
          reason = `Detected urgency keyword: "${keyword}"`;
          break;
        }
      }
      
      // Check if participant was directly addressed
      if (message.participantId !== participantId) {
        if (
          content.includes(participantId) || 
          (dialogueState.participants.find(p => p.id === participantId)?.name &&
           content.includes(dialogueState.participants.find(p => p.id === participantId)!.name))
        ) {
          // Directly addressed - moderate urgency
          urgencyLevel = Math.max(urgencyLevel, 0.6);
          reason = "Directly addressed in conversation";
        }
      }
    }
    
    // Check for factual corrections (participant mentioned then contradicted)
    if (this.detectFactualContradiction(recentMessages, participantId, dialogueState)) {
      urgencyLevel = Math.max(urgencyLevel, 0.85);
      reason = "Potential factual contradiction";
    }
    
    return { urgencyLevel, reason };
  }
  
  /**
   * Detect if there might be a factual contradiction about the participant
   * 
   * @param messages - Recent messages to analyze
   * @param participantId - ID of the participant making the bid
   * @param dialogueState - Current dialogue state
   * @returns Whether a factual contradiction was detected
   */
  private detectFactualContradiction(
    messages: Array<{content: string; participantId: string}>,
    participantId: string,
    dialogueState: DialogueState
  ): boolean {
    // Get participant name for reference checks
    const participantName = dialogueState.participants.find(
      p => p.id === participantId
    )?.name || participantId;
    
    // Look for pattern: message mentions participant, followed by contradiction
    for (let i = 0; i < messages.length - 1; i++) {
      const firstMessage = messages[i];
      const secondMessage = messages[i + 1];
      
      // Skip if either message is from this participant
      if (firstMessage.participantId === participantId || 
          secondMessage.participantId === participantId) {
        continue;
      }
      
      // Check if first message mentions participant
      if (firstMessage.content.includes(participantName) || 
          firstMessage.content.includes(participantId)) {
        
        // Check if second message contains contradiction indicators
        const secondContent = secondMessage.content.toLowerCase();
        const contradictionKeywords = [
          "actually", "in fact", "contrary", "rather", "instead",
          "not", "incorrect", "wrong", "mistaken", "error",
          "no,", "disagree", "false", "untrue", "misunderstood"
        ];
        
        for (const keyword of contradictionKeywords) {
          if (secondContent.includes(keyword)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
}

/**
 * Bidding strategy that prioritizes unaddressed questions
 */
export class QuestionRespondingBiddingStrategy implements IBiddingStrategy {
  private baseStrength: number;
  private questionBoost: number;
  
  /**
   * Create a new question-responding bidding strategy
   * 
   * @param baseStrength - Base bid strength to use (0.0 to 1.0)
   * @param questionBoost - How much to boost bids for questions (0.0 to 0.5)
   */
  constructor(
    baseStrength: number = 0.5,
    questionBoost: number = 0.3
  ) {
    this.baseStrength = Math.max(0, Math.min(1, baseStrength));
    this.questionBoost = Math.max(0, Math.min(0.5, questionBoost));
  }
  
  /**
   * Calculate a bid based on question relevance
   * 
   * @param context - Context for the bid calculation
   * @returns The calculated bid with question response adjustment
   */
  async calculateBid(context: BidContext): Promise<Bid> {
    const { dialogueState, participantId } = context;
    
    // Start with base strength
    let bidStrength = this.baseStrength;
    
    // Look for unanswered questions in recent messages
    const recentMessages = dialogueState.messages.slice(-10);
    const questionData = this.findRelevantQuestions(recentMessages, participantId, dialogueState);
    
    if (questionData.hasRelevantQuestion) {
      // Boost bid proportionally to question relevance
      bidStrength = Math.min(1, this.baseStrength + (questionData.relevance * this.questionBoost));
      
      return {
        participantId,
        strength: bidStrength,
        reason: `Question responding (${questionData.questionCount} relevant questions)`,
        metadata: {
          questionCount: questionData.questionCount,
          questionRelevance: questionData.relevance,
          isDirectQuestion: questionData.isDirectQuestion
        }
      };
    }
    
    // No relevant questions
    return {
      participantId,
      strength: this.baseStrength,
      reason: "Question responding (no relevant questions)",
    };
  }
  
  /**
   * Find questions relevant to this participant
   * 
   * @param messages - Messages to analyze for questions
   * @param participantId - ID of the participant making the bid
   * @param dialogueState - Current dialogue state
   * @returns Data about relevant questions
   */
  private findRelevantQuestions(
    messages: Array<{content: string; participantId: string}>,
    participantId: string,
    dialogueState: DialogueState
  ): {
    hasRelevantQuestion: boolean;
    questionCount: number;
    relevance: number;
    isDirectQuestion: boolean;
  } {
    // Get participant name and expertise areas
    const participant = dialogueState.participants.find(p => p.id === participantId);
    const participantName = participant?.name || participantId;
    const participantRole = participant?.role || "";
    const expertiseAreas = participant?.metadata?.expertiseAreas as string[] || [];
    
    let relevantQuestionCount = 0;
    let directQuestionCount = 0;
    let expertiseQuestionCount = 0;
    let maxRelevance = 0;
    
    // Process messages to find questions
    for (const message of messages) {
      // Skip if message is from this participant
      if (message.participantId === participantId) {
        continue;
      }
      
      // Skip if message already has a direct response from this participant
      if (this.hasDirectResponse(message, messages, participantId)) {
        continue;
      }
      
      // Check for questions in the message
      const questions = this.extractQuestions(message.content);
      
      if (questions.length > 0) {
        // For each question, check relevance to this participant
        for (const question of questions) {
          let questionRelevance = 0;
          
          // Check if question is directed at this participant
          if (question.includes(participantName) || question.includes(participantId)) {
            questionRelevance = 1.0;
            directQuestionCount++;
          } 
          // Check if question relates to participant's role
          else if (participantRole && question.toLowerCase().includes(participantRole.toLowerCase())) {
            questionRelevance = 0.8;
            relevantQuestionCount++;
          }
          // Check if question relates to participant's expertise
          else if (expertiseAreas.length > 0) {
            for (const area of expertiseAreas) {
              if (question.toLowerCase().includes(area.toLowerCase())) {
                questionRelevance = 0.7;
                expertiseQuestionCount++;
                break;
              }
            }
          }
          // General topic relevance - basic check
          else if (this.isQuestionTopicallyRelevant(question, dialogueState, participantId)) {
            questionRelevance = 0.5;
            relevantQuestionCount++;
          }
          
          // Track highest relevance
          maxRelevance = Math.max(maxRelevance, questionRelevance);
        }
      }
    }
    
    // Calculate total question count
    const totalQuestionCount = directQuestionCount + relevantQuestionCount + expertiseQuestionCount;
    
    return {
      hasRelevantQuestion: totalQuestionCount > 0,
      questionCount: totalQuestionCount,
      relevance: maxRelevance,
      isDirectQuestion: directQuestionCount > 0
    };
  }
  
  /**
   * Extract questions from message content
   * 
   * @param content - Message content to analyze
   * @returns Array of extracted questions
   */
  private extractQuestions(content: string): string[] {
    const questions: string[] = [];
    
    // Split by sentence-ending punctuation
    const sentences = content.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
      // Check for question marks
      if (sentence.trim().endsWith("?")) {
        questions.push(sentence.trim());
        continue;
      }
      
      // Check for question-starting phrases without question marks
      const questionStarters = [
        "who ", "what ", "where ", "when ", "why ", "how ",
        "could you", "would you", "can you", "will you", 
        "do you", "are you", "have you", "did you",
        "is there", "are there", "could there", "would there"
      ];
      
      for (const starter of questionStarters) {
        if (sentence.toLowerCase().includes(starter)) {
          questions.push(sentence.trim());
          break;
        }
      }
    }
    
    return questions;
  }
  
  /**
   * Check if a question already has a direct response
   * 
   * @param questionMessage - Message containing the question
   * @param allMessages - All messages in the conversation
   * @param participantId - ID of the participant making the bid
   * @returns Whether the question has a direct response
   */
  private hasDirectResponse(
    questionMessage: {content: string; participantId: string},
    allMessages: Array<{content: string; participantId: string}>,
    participantId: string
  ): boolean {
    // Find index of question message
    const messageIndex = allMessages.findIndex(m => m === questionMessage);
    
    if (messageIndex === -1) {
      return false;
    }
    
    // Check subsequent messages for a response from this participant
    for (let i = messageIndex + 1; i < allMessages.length; i++) {
      if (allMessages[i].participantId === participantId) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a question is topically relevant to the participant
   * 
   * @param question - The question to check
   * @param dialogueState - Current dialogue state
   * @param participantId - ID of the participant making the bid
   * @returns Whether the question is topically relevant
   */
  private isQuestionTopicallyRelevant(
    question: string,
    dialogueState: DialogueState,
    participantId: string
  ): boolean {
    // In a real implementation, this would use more sophisticated NLP
    // Simple implementation: check for participant's recent message topics
    const participantMessages = dialogueState.messages
      .filter(m => m.participantId === participantId)
      .slice(-3);
    
    if (participantMessages.length === 0) {
      return false;
    }
    
    // Extract key terms from participant's messages
    const keyTerms = this.extractKeyTerms(participantMessages.map(m => m.content).join(" "));
    
    // Check if question contains any key terms
    const questionLower = question.toLowerCase();
    for (const term of keyTerms) {
      if (questionLower.includes(term)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Extract key terms from text
   * 
   * @param text - Text to extract terms from
   * @returns Array of key terms
   */
  private extractKeyTerms(text: string): string[] {
    // In a real implementation, this would use NLP for key term extraction
    // Simple implementation: extract words with 4+ characters, excluding common words
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = new Set([
      "this", "that", "these", "those", "with", "from", "about",
      "have", "which", "would", "could", "should", "what", "when",
      "where", "their", "there", "here", "they", "them", "then",
      "than", "your", "will", "been", "were", "because", "some"
    ]);
    
    return words
      .filter(word => word.length >= 4 && !commonWords.has(word))
      .slice(0, 10); // Limit to 10 terms for efficiency
  }
}
