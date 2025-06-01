/**
 * Advanced Bidding Strategy Factory
 * Provides factory methods for creating and combining advanced bidding strategies
 */

import { IBiddingStrategy, BiddingStrategyFactory } from "./bidding_strategy.ts";
import { ContextualBiddingStrategy, ExtendedBidContext } from "./advanced_bidding_strategy.ts";
import { EmotionalBiddingStrategy } from "./advanced_bidding_strategy.ts";
import { CoalitionBiddingStrategy } from "./coalition_bidding_strategy.ts";
import { InterruptionBiddingStrategy, QuestionRespondingBiddingStrategy } from "./interruption_bidding_strategy.ts";

/**
 * Factory for creating advanced bidding strategies
 */
export class AdvancedBiddingStrategyFactory {
  /**
   * Create a contextual bidding strategy
   * 
   * @param baseStrength - Base bid strength
   * @param keywordWeights - Optional weights for specific keywords
   * @returns Contextual bidding strategy
   */
  static createContextualStrategy(
    baseStrength: number = 0.5,
    keywordWeights: Record<string, number> = {}
  ): IBiddingStrategy {
    return new ContextualBiddingStrategy(baseStrength, keywordWeights);
  }

  /**
   * Create an emotional bidding strategy
   * 
   * @param baseStrength - Base bid strength
   * @param emotionalResponsiveness - How strongly emotions affect bidding
   * @returns Emotional bidding strategy
   */
  static createEmotionalStrategy(
    baseStrength: number = 0.5,
    emotionalResponsiveness: number = 0.7
  ): IBiddingStrategy {
    return new EmotionalBiddingStrategy(baseStrength, emotionalResponsiveness);
  }

  /**
   * Create a coalition bidding strategy
   * 
   * @param baseStrength - Base bid strength
   * @param coalitionBoost - How much coalition membership boosts bids
   * @returns Coalition bidding strategy
   */
  static createCoalitionStrategy(
    baseStrength: number = 0.5,
    coalitionBoost: number = 0.3
  ): IBiddingStrategy {
    return new CoalitionBiddingStrategy(baseStrength, coalitionBoost);
  }

  /**
   * Create an interruption bidding strategy
   * 
   * @param baseStrength - Base bid strength
   * @param interruptionThreshold - Minimum urgency needed to trigger interruption
   * @param maxInterruptionBoost - Maximum boost applied for interruptions
   * @returns Interruption bidding strategy
   */
  static createInterruptionStrategy(
    baseStrength: number = 0.5,
    interruptionThreshold: number = 0.8,
    maxInterruptionBoost: number = 0.4
  ): IBiddingStrategy {
    return new InterruptionBiddingStrategy(
      baseStrength,
      interruptionThreshold,
      maxInterruptionBoost
    );
  }

  /**
   * Create a question-responding bidding strategy
   * 
   * @param baseStrength - Base bid strength
   * @param questionBoost - How much to boost bids for questions
   * @returns Question responding bidding strategy
   */
  static createQuestionRespondingStrategy(
    baseStrength: number = 0.5,
    questionBoost: number = 0.3
  ): IBiddingStrategy {
    return new QuestionRespondingBiddingStrategy(baseStrength, questionBoost);
  }

  /**
   * Create a complete advanced bidding strategy that combines multiple strategies
   * 
   * @param config - Configuration options for the combined strategy
   * @returns Combined bidding strategy
   */
  static createAdvancedStrategy(config: {
    contextual?: { weight: number; baseStrength?: number; keywordWeights?: Record<string, number> };
    emotional?: { weight: number; baseStrength?: number; emotionalResponsiveness?: number };
    coalition?: { weight: number; baseStrength?: number; coalitionBoost?: number };
    interruption?: { weight: number; baseStrength?: number; interruptionThreshold?: number; maxInterruptionBoost?: number };
    questionResponding?: { weight: number; baseStrength?: number; questionBoost?: number };
    turnTaking?: { weight: number; baseStrength?: number };
    static?: { weight: number; bidStrength: number };
  }): IBiddingStrategy {
    const strategies: Array<{ strategy: IBiddingStrategy; weight: number }> = [];

    // Add contextual strategy if specified
    if (config.contextual) {
      strategies.push({
        strategy: this.createContextualStrategy(
          config.contextual.baseStrength,
          config.contextual.keywordWeights
        ),
        weight: config.contextual.weight
      });
    }

    // Add emotional strategy if specified
    if (config.emotional) {
      strategies.push({
        strategy: this.createEmotionalStrategy(
          config.emotional.baseStrength,
          config.emotional.emotionalResponsiveness
        ),
        weight: config.emotional.weight
      });
    }

    // Add coalition strategy if specified
    if (config.coalition) {
      strategies.push({
        strategy: this.createCoalitionStrategy(
          config.coalition.baseStrength,
          config.coalition.coalitionBoost
        ),
        weight: config.coalition.weight
      });
    }

    // Add interruption strategy if specified
    if (config.interruption) {
      strategies.push({
        strategy: this.createInterruptionStrategy(
          config.interruption.baseStrength,
          config.interruption.interruptionThreshold,
          config.interruption.maxInterruptionBoost
        ),
        weight: config.interruption.weight
      });
    }

    // Add question responding strategy if specified
    if (config.questionResponding) {
      strategies.push({
        strategy: this.createQuestionRespondingStrategy(
          config.questionResponding.baseStrength,
          config.questionResponding.questionBoost
        ),
        weight: config.questionResponding.weight
      });
    }

    // Add turn taking strategy if specified
    if (config.turnTaking) {
      strategies.push({
        strategy: BiddingStrategyFactory.createTurnTakingStrategy(
          config.turnTaking.baseStrength
        ),
        weight: config.turnTaking.weight
      });
    }

    // Add static strategy if specified
    if (config.static) {
      strategies.push({
        strategy: BiddingStrategyFactory.createStaticStrategy(
          config.static.bidStrength
        ),
        weight: config.static.weight
      });
    }

    // If no strategies were specified, use a default advanced strategy
    if (strategies.length === 0) {
      return this.createDefaultAdvancedStrategy();
    }

    // Create a combined strategy with all specified strategies
    return BiddingStrategyFactory.createCombinedStrategy(strategies);
  }

  /**
   * Create a default advanced bidding strategy that combines multiple strategies
   * with sensible defaults
   * 
   * @returns Default advanced combined bidding strategy
   */
  static createDefaultAdvancedStrategy(): IBiddingStrategy {
    return BiddingStrategyFactory.createCombinedStrategy([
      {
        strategy: BiddingStrategyFactory.createTurnTakingStrategy(0.5),
        weight: 0.3
      },
      {
        strategy: this.createContextualStrategy(0.5),
        weight: 0.3
      },
      {
        strategy: this.createEmotionalStrategy(0.5),
        weight: 0.2
      },
      {
        strategy: this.createQuestionRespondingStrategy(0.5),
        weight: 0.1
      },
      {
        strategy: this.createInterruptionStrategy(0.5),
        weight: 0.1
      }
    ]);
  }

  /**
   * Create a debate-optimized bidding strategy
   * 
   * @returns Debate-optimized bidding strategy
   */
  static createDebateStrategy(): IBiddingStrategy {
    return BiddingStrategyFactory.createCombinedStrategy([
      {
        strategy: BiddingStrategyFactory.createTurnTakingStrategy(0.5),
        weight: 0.2
      },
      {
        strategy: this.createContextualStrategy(0.6),
        weight: 0.3
      },
      {
        strategy: this.createQuestionRespondingStrategy(0.5, 0.4),
        weight: 0.2
      },
      {
        strategy: this.createInterruptionStrategy(0.5, 0.85, 0.4),
        weight: 0.2
      },
      {
        strategy: this.createEmotionalStrategy(0.5, 0.6),
        weight: 0.1
      }
    ]);
  }

  /**
   * Create a consensus-optimized bidding strategy
   * 
   * @returns Consensus-optimized bidding strategy
   */
  static createConsensusStrategy(): IBiddingStrategy {
    return BiddingStrategyFactory.createCombinedStrategy([
      {
        strategy: BiddingStrategyFactory.createTurnTakingStrategy(0.5),
        weight: 0.2
      },
      {
        strategy: this.createContextualStrategy(0.5),
        weight: 0.2
      },
      {
        strategy: this.createCoalitionStrategy(0.5, 0.4),
        weight: 0.3
      },
      {
        strategy: this.createEmotionalStrategy(0.5, 0.8),
        weight: 0.2
      },
      {
        strategy: this.createQuestionRespondingStrategy(0.5),
        weight: 0.1
      }
    ]);
  }

  /**
   * Create a brainstorming-optimized bidding strategy
   * 
   * @returns Brainstorming-optimized bidding strategy
   */
  static createBrainstormingStrategy(): IBiddingStrategy {
    return BiddingStrategyFactory.createCombinedStrategy([
      {
        strategy: BiddingStrategyFactory.createTurnTakingStrategy(0.6),
        weight: 0.3
      },
      {
        strategy: this.createContextualStrategy(0.4),
        weight: 0.3
      },
      {
        strategy: this.createEmotionalStrategy(0.4, 0.9),
        weight: 0.3
      },
      {
        strategy: this.createInterruptionStrategy(0.5, 0.7, 0.5),
        weight: 0.1
      }
    ]);
  }

  /**
   * Create a moderator-optimized bidding strategy that prioritizes intervention
   * 
   * @returns Moderator-optimized bidding strategy
   */
  static createModeratorStrategy(): IBiddingStrategy {
    return BiddingStrategyFactory.createCombinedStrategy([
      {
        strategy: this.createInterruptionStrategy(0.5, 0.7, 0.5),
        weight: 0.4
      },
      {
        strategy: this.createQuestionRespondingStrategy(0.5, 0.4),
        weight: 0.3
      },
      {
        strategy: this.createContextualStrategy(0.5),
        weight: 0.2
      },
      {
        strategy: BiddingStrategyFactory.createTurnTakingStrategy(0.4),
        weight: 0.1
      }
    ]);
  }
}
