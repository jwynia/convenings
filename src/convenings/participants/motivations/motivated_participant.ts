/**
 * Motivated Participant Implementation
 * 
 * Extends DialogueParticipant with motivation-driven behavior, allowing
 * participants to have internal drives that influence their interactions.
 */

import { IParticipant } from "../../interfaces.ts";
import { 
  DialogueParticipant, 
  DialogueParticipantConfig, 
  DialogueStyle 
} from "../dialogue_participant.ts";
import { createStringUtils, IStringUtils } from "../../../utils/mod.ts";
import {
  BiddingContext,
  BidResult,
  DialogueContext,
  DialogueTurn,
  IMotivation,
  MotivatedParticipantConfig,
  MotivationState
} from "./interfaces.ts";

/**
 * Extended configuration for motivated participants
 */
export interface MotivatedDialogueParticipantConfig extends DialogueParticipantConfig {
  /**
   * Motivations configuration
   */
  motivatedConfig: MotivatedParticipantConfig;
}

/**
 * Base class for participants with motivations
 * Extends DialogueParticipant with motivation-driven behavior
 */
export abstract class MotivatedDialogueParticipant extends DialogueParticipant {
  /**
   * List of motivations that drive this participant
   */
  protected motivations: Array<{
    motivation: IMotivation;
    weight: number;
  }> = [];

  /**
   * Current state of each motivation
   */
  protected motivationStates: Map<string, MotivationState> = new Map();

  /**
   * Strategy for aggregating motivation desires
   */
  protected aggregationStrategy: "weighted" | "max" | "probabilistic" = "weighted";

  /**
   * Initialize a motivated dialogue participant
   * 
   * @param config - Configuration for the participant
   * @param stringUtils - String utilities implementation
   */
  constructor(
    config: MotivatedDialogueParticipantConfig,
    stringUtils: IStringUtils = createStringUtils(),
  ) {
    super(config, stringUtils);
    
    this.motivations = [...config.motivatedConfig.motivations];
    this.aggregationStrategy = config.motivatedConfig.aggregationStrategy || "weighted";
    
    // Initialize motivation states
    this.initializeMotivationStates();
  }

  /**
   * Initialize the states for all motivations
   */
  protected initializeMotivationStates(): void {
    for (const { motivation } of this.motivations) {
      this.motivationStates.set(motivation.id, {
        satisfaction: 0.5, // Start with neutral satisfaction
        urgency: 0.5,      // Start with moderate urgency
        agreement: new Map<string, number>(),
        topicsAddressed: new Set<string>(),
        emotionalState: { valence: 0, arousal: 0.5 },
        metadata: {}
      });
    }
  }

  /**
   * Calculate a bid to speak based on motivations
   * 
   * @param context - Current bidding context
   * @returns A bid result with value and reasoning
   */
  async calculateBid(context: BiddingContext): Promise<BidResult> {
    // Context influences bidding (e.g., time since last turn)
    const contextModifier = this.calculateContextModifier(context);
    
    // Gather desires from all motivations
    const desires = await Promise.all(
      this.motivations.map(async ({ motivation }) => {
        const state = this.motivationStates.get(motivation.id)!;
        const desire = await motivation.calculateDesire(this, state, context);
        return { 
          motivation: motivation.id, 
          desire: desire, 
          weight: this.getMotivationWeight(motivation.id) 
        };
      })
    );
    
    // Combine desires based on aggregation strategy
    const aggregatedDesire = this.aggregateDesires(desires) * contextModifier;
    
    // Create breakdown of motivation contributions
    const motivationBreakdown: Record<string, number> = {};
    desires.forEach(d => {
      motivationBreakdown[d.motivation] = d.desire;
    });
    
    return {
      value: Math.min(1, Math.max(0, aggregatedDesire)), // Ensure in [0,1] range
      reasoning: this.explainBid(desires),
      motivationBreakdown,
      contextInfluence: this.explainContextInfluence(contextModifier)
    };
  }

  /**
   * Update motivation states after a dialogue turn
   * 
   * @param turn - The dialogue turn that just occurred
   * @param context - Current dialogue context
   */
  async updateMotivationStates(turn: DialogueTurn, context: DialogueContext): Promise<void> {
    for (const { motivation } of this.motivations) {
      const currentState = this.motivationStates.get(motivation.id)!;
      const updatedState = motivation.updateState(currentState, turn, context);
      this.motivationStates.set(motivation.id, updatedState);
    }
  }

  /**
   * Check if any motivation has high enough urgency to speak
   * 
   * @param threshold - Minimum urgency threshold (0-1)
   * @returns Whether any motivation exceeds the threshold
   */
  hasUrgentMotivation(threshold = 0.7): boolean {
    for (const { motivation } of this.motivations) {
      const state = this.motivationStates.get(motivation.id)!;
      if (state.urgency > threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the weight of a specific motivation
   * 
   * @param motivationId - ID of the motivation
   * @returns Weight of the motivation (0-1) or 0 if not found
   */
  protected getMotivationWeight(motivationId: string): number {
    const found = this.motivations.find(m => m.motivation.id === motivationId);
    return found ? found.weight : 0;
  }

  /**
   * Calculate how context influences the bid
   * 
   * @param context - Current bidding context
   * @returns A modifier value (typically 0.5-1.5)
   */
  protected calculateContextModifier(context: BiddingContext): number {
    // Base modifier starts at 1.0 (no change)
    let modifier = 1.0;
    
    // Increase desire if it's been many turns since speaking
    if (context.turnsSinceLastSpoke > 3) {
      modifier += Math.min(0.3, context.turnsSinceLastSpoke * 0.05);
    }
    
    // Increase desire for new topics
    if (context.isNewTopic) {
      modifier += 0.2;
    }
    
    // Decrease slightly if just spoke
    if (context.turnsSinceLastSpoke === 0) {
      modifier -= 0.3;
    }
    
    return modifier;
  }

  /**
   * Aggregate desires from multiple motivations into a single value
   * 
   * @param desires - Array of motivation desires with weights
   * @returns Aggregated desire value (0-1)
   */
  protected aggregateDesires(
    desires: Array<{ motivation: string; desire: number; weight: number }>
  ): number {
    switch (this.aggregationStrategy) {
      case "max":
        // Take the maximum desire value
        return Math.max(...desires.map(d => d.desire), 0);
        
      case "probabilistic":
        // Probabilistic selection (more random)
        const totalWeightedDesire = desires.reduce(
          (sum, d) => sum + d.desire * d.weight, 0
        );
        const avgWeight = desires.reduce((sum, d) => sum + d.weight, 0) / desires.length;
        return totalWeightedDesire / (desires.length * avgWeight);
        
      case "weighted":
      default:
        // Weighted average (default)
        const totalWeight = desires.reduce((sum, d) => sum + d.weight, 0);
        if (totalWeight === 0) return 0;
        
        return desires.reduce(
          (sum, d) => sum + (d.desire * d.weight), 0
        ) / totalWeight;
    }
  }

  /**
   * Generate an explanation for the bid
   * 
   * @param desires - Array of motivation desires with weights
   * @returns Human-readable explanation
   */
  protected explainBid(
    desires: Array<{ motivation: string; desire: number; weight: number }>
  ): string {
    // Sort by contribution (desire * weight)
    const sortedDesires = [...desires].sort(
      (a, b) => (b.desire * b.weight) - (a.desire * a.weight)
    );
    
    // Get top motivations
    const topMotivations = sortedDesires.slice(0, 2);
    
    if (topMotivations.length === 0) {
      return "No strong motivations to speak.";
    }
    
    if (topMotivations.length === 1) {
      const m = topMotivations[0];
      if (m.desire > 0.7) {
        return `Strong desire to speak from ${m.motivation}.`;
      } else if (m.desire > 0.4) {
        return `Moderate desire to speak from ${m.motivation}.`;
      } else {
        return `Weak desire to speak from ${m.motivation}.`;
      }
    }
    
    // Multiple motivations
    return `Driven by ${topMotivations[0].motivation} (${Math.round(topMotivations[0].desire * 100)}%) and ${topMotivations[1].motivation} (${Math.round(topMotivations[1].desire * 100)}%).`;
  }

  /**
   * Explain how context influenced the bid
   * 
   * @param modifier - The context modifier value
   * @returns Explanation of context influence
   */
  protected explainContextInfluence(modifier: number): string {
    if (modifier > 1.2) {
      return "Context strongly increased desire to speak.";
    } else if (modifier > 1.05) {
      return "Context somewhat increased desire to speak.";
    } else if (modifier < 0.8) {
      return "Context strongly decreased desire to speak.";
    } else if (modifier < 0.95) {
      return "Context somewhat decreased desire to speak.";
    } else {
      return "Context had little effect on desire to speak.";
    }
  }
}

/**
 * Create a motivated dialogue participant with the specified configuration
 * 
 * @param config - Configuration for the motivated dialogue participant
 * @param stringUtils - Optional string utilities implementation
 * @returns A new MotivatedDialogueParticipant instance
 */
export function createMotivatedDialogueParticipant<T extends MotivatedDialogueParticipant>(
  ParticipantClass: new (
    config: MotivatedDialogueParticipantConfig,
    stringUtils: IStringUtils
  ) => T,
  config: MotivatedDialogueParticipantConfig,
  stringUtils: IStringUtils = createStringUtils(),
): T {
  return new ParticipantClass(config, stringUtils);
}
