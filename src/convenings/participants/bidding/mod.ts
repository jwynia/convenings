/**
 * Bidding Module
 * Exports bidding strategy components for Convenings
 */

// Core bidding strategies
export {
  type Bid,
  type BidContext,
  type IBiddingStrategy,
  StaticBiddingStrategy,
  TurnTakingBiddingStrategy,
  MotivationBiddingStrategy,
  CombinedBiddingStrategy,
  BiddingStrategyFactory
} from "./bidding_strategy.ts";

// Advanced bidding strategies
export {
  type ExtendedBidContext,
  ContextualBiddingStrategy,
  EmotionalBiddingStrategy
} from "./advanced_bidding_strategy.ts";

// Coalition-based bidding
export {
  type CoalitionBidContext,
  CoalitionBiddingStrategy
} from "./coalition_bidding_strategy.ts";

// Interruption and question-responding bidding
export {
  type UrgencyBidContext,
  InterruptionBiddingStrategy,
  QuestionRespondingBiddingStrategy
} from "./interruption_bidding_strategy.ts";

// Advanced factory for creating specialized bidding strategies
export { AdvancedBiddingStrategyFactory } from "./advanced_bidding_factory.ts";
