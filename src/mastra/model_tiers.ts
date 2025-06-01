/**
 * Model Tiers and Pricing
 * Defines model tiers and pricing information for OpenRouter models
 */

/**
 * Model tiers for easy selection of models
 */
export enum ModelTier {
  /**
   * Elite tier - highest quality models (Claude 3.7 Sonnet, etc.)
   */
  ELITE = "ELITE",
  
  /**
   * Premium tier - high quality models (GPT-4o, etc.)
   */
  PREMIUM = "PREMIUM",
  
  /**
   * Standard tier - good quality models for everyday tasks (GPT-4o-mini, etc.)
   */
  STANDARD = "STANDARD",
  
  /**
   * Budget tier - cost-effective models for simple tasks (Llama 3.1 8B, etc.)
   */
  BUDGET = "BUDGET"
}

/**
 * Model tier configurations
 * Maps tiers to default models and fallbacks
 */
export const MODEL_TIERS = {
  [ModelTier.ELITE]: {
    defaultModel: "anthropic/claude-3.7-sonnet",
    fallbackModels: ["deepseek/deepseek-r1", "openai/gpt-4o"],
    temperature: 0.7,
    maxTokens: 4000
  },
  [ModelTier.PREMIUM]: {
    defaultModel: "openai/gpt-4o",
    fallbackModels: ["anthropic/claude-3.5-sonnet", "mistralai/mistral-large-2411"],
    temperature: 0.7,
    maxTokens: 3000
  },
  [ModelTier.STANDARD]: {
    defaultModel: "openai/gpt-4o-mini",
    fallbackModels: ["anthropic/claude-3.5-haiku", "mistralai/mistral-small-2402"],
    temperature: 0.7,
    maxTokens: 2500
  },
  [ModelTier.BUDGET]: {
    defaultModel: "meta/llama-3.1-8b-instruct",
    fallbackModels: ["google/gemma-3-4b-instruct", "mistralai/mistral-7b-instruct-v0.2"],
    temperature: 0.7,
    maxTokens: 2000
  }
};

/**
 * Model pricing information for token cost calculation
 * Updated with the latest pricing from OpenRouter
 */
export const MODEL_PRICING: Record<string, { inputCostPer1K: number, outputCostPer1K: number }> = {
  // OpenAI models
  "openai/gpt-4o": { inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
  "openai/gpt-4o-mini": { inputCostPer1K: 0.0015, outputCostPer1K: 0.006 },
  "openai/gpt-4-turbo": { inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
  "openai/gpt-4": { inputCostPer1K: 0.03, outputCostPer1K: 0.06 },
  "openai/gpt-3.5-turbo": { inputCostPer1K: 0.0005, outputCostPer1K: 0.0015 },
  
  // Anthropic models
  "anthropic/claude-3.7-sonnet": { inputCostPer1K: 0.008, outputCostPer1K: 0.024 },
  "anthropic/claude-3.5-sonnet": { inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  "anthropic/claude-3.5-haiku": { inputCostPer1K: 0.00025, outputCostPer1K: 0.00125 },
  "anthropic/claude-3-opus": { inputCostPer1K: 0.015, outputCostPer1K: 0.075 },
  "anthropic/claude-3-sonnet": { inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  "anthropic/claude-3-haiku": { inputCostPer1K: 0.00025, outputCostPer1K: 0.00125 },
  
  // Mistral models
  "mistralai/mistral-large-2411": { inputCostPer1K: 0.008, outputCostPer1K: 0.024 },
  "mistralai/mistral-small-2402": { inputCostPer1K: 0.0007, outputCostPer1K: 0.0007 },
  "mistralai/mistral-7b-instruct-v0.2": { inputCostPer1K: 0.0002, outputCostPer1K: 0.0002 },
  
  // Meta/Llama models
  "meta/llama-3.1-8b-instruct": { inputCostPer1K: 0.0002, outputCostPer1K: 0.0002 },
  "meta/llama-3.1-70b-instruct": { inputCostPer1K: 0.0008, outputCostPer1K: 0.0008 },
  "meta/llama-3-70b-instruct": { inputCostPer1K: 0.0015, outputCostPer1K: 0.0015 },
  "meta/llama-3-8b-instruct": { inputCostPer1K: 0.0002, outputCostPer1K: 0.0002 },
  
  // Google models
  "google/gemma-3-4b-instruct": { inputCostPer1K: 0.0001, outputCostPer1K: 0.0001 },
  "google/gemma-3-27b-instruct": { inputCostPer1K: 0.0005, outputCostPer1K: 0.0005 },
  "google/gemini-pro": { inputCostPer1K: 0.00025, outputCostPer1K: 0.0005 },
  "google/gemini-ultra": { inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
  
  // DeepSeek models
  "deepseek/deepseek-r1": { inputCostPer1K: 0.008, outputCostPer1K: 0.024 },
  "deepseek/deepseek-coder": { inputCostPer1K: 0.005, outputCostPer1K: 0.015 },
  
  // Cohere models
  "cohere/command-r-plus": { inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  "cohere/command-r": { inputCostPer1K: 0.001, outputCostPer1K: 0.003 },
  
  // Default fallback for unknown models
  "default": { inputCostPer1K: 0.001, outputCostPer1K: 0.003 }
};

/**
 * Get OpenRouter client configuration for a specific model tier
 * 
 * @param tier - Model tier to use
 * @param apiKey - OpenRouter API key
 * @returns OpenRouter client configuration
 */
export function getModelTierConfig(
  tier: ModelTier,
  apiKey: string
): {
  apiKey: string;
  defaultModel: string;
  fallbackModels: string[];
  temperature: number;
  maxTokens: number;
} {
  const tierConfig = MODEL_TIERS[tier];
  
  if (!tierConfig) {
    throw new Error(`Unknown model tier: ${tier}`);
  }
  
  return {
    apiKey,
    defaultModel: tierConfig.defaultModel,
    fallbackModels: tierConfig.fallbackModels,
    temperature: tierConfig.temperature,
    maxTokens: tierConfig.maxTokens
  };
}

/**
 * Get average cost per 1K tokens for a model tier
 * 
 * @param tier - Model tier
 * @returns Average cost per 1K tokens (input and output combined)
 */
export function getAverageTierCost(tier: ModelTier): number {
  const tierConfig = MODEL_TIERS[tier];
  
  if (!tierConfig) {
    throw new Error(`Unknown model tier: ${tier}`);
  }
  
  const pricing = MODEL_PRICING[tierConfig.defaultModel] || MODEL_PRICING.default;
  return (pricing.inputCostPer1K + pricing.outputCostPer1K) / 2;
}

/**
 * Get cost-saving percentage between two tiers
 * 
 * @param fromTier - Higher tier
 * @param toTier - Lower tier
 * @returns Percentage cost savings
 */
export function getTierCostSavings(fromTier: ModelTier, toTier: ModelTier): number {
  const fromCost = getAverageTierCost(fromTier);
  const toCost = getAverageTierCost(toTier);
  
  return ((fromCost - toCost) / fromCost) * 100;
}
