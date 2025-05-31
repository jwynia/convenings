# Multi-Agent Dialogue System - Flexible Interaction Architecture

## Directory Structure

```
src/
├── core/
│   ├── agents/
│   │   ├── base/
│   │   │   ├── Agent.ts
│   │   │   ├── DialogueAgent.ts
│   │   │   └── MotivatedAgent.ts
│   │   ├── implementations/
│   │   │   ├── DialogueAgent.ts
│   │   │   ├── MediatorAgent.ts
│   │   │   └── ConsensusBuilderAgent.ts
│   │   └── index.ts
│   │
│   ├── motivations/
│   │   ├── base/
│   │   │   ├── Motivation.ts
│   │   │   └── MotivationState.ts
│   │   ├── implementations/
│   │   │   ├── CompetitiveMotivation.ts
│   │   │   ├── CollaborativeMotivation.ts
│   │   │   ├── ConsensusSeekingMotivation.ts
│   │   │   ├── TruthSeekingMotivation.ts
│   │   │   └── DevilsAdvocateMotivation.ts
│   │   └── index.ts
│   │
│   ├── strategies/
│   │   ├── bidding/
│   │   │   ├── BiddingStrategy.ts
│   │   │   ├── CompetitiveBidding.ts
│   │   │   ├── ConsensusBidding.ts
│   │   │   ├── TurnTakingBidding.ts
│   │   │   └── AdaptiveBidding.ts
│   │   ├── selection/
│   │   │   ├── SelectionStrategy.ts
│   │   │   ├── HighestBidStrategy.ts
│   │   │   ├── ConsensusThresholdStrategy.ts
│   │   │   ├── ConvergenceStrategy.ts
│   │   │   └── MultiObjectiveStrategy.ts
│   │   ├── exit/
│   │   │   ├── ExitCondition.ts
│   │   │   ├── ConsensusReachedCondition.ts
│   │   │   ├── LowEngagementCondition.ts
│   │   │   ├── TimeBasedCondition.ts
│   │   │   └── CompositeCondition.ts
│   │   └── index.ts
│   │
│   ├── dynamics/
│   │   ├── DialogueDynamics.ts
│   │   ├── ConsensusTracker.ts
│   │   ├── DisagreementAnalyzer.ts
│   │   └── TopicEvolution.ts
│   │
│   ├── simulation/
│   │   ├── DialogueSimulator.ts
│   │   ├── SimulationMode.ts
│   │   ├── SimulationMetrics.ts
│   │   └── index.ts
│   │
│   └── analysis/
│       ├── SentimentAnalyzer.ts
│       ├── AgreementCalculator.ts
│       ├── TopicRelevanceScorer.ts
│       └── index.ts
│
├── mastra/
│   ├── workflows/
│   │   ├── DialogueWorkflow.ts
│   │   ├── ConsensusWorkflow.ts
│   │   ├── DeliberationWorkflow.ts
│   │   └── index.ts
│   └── index.ts
│
└── examples/
    ├── competitive-debate.ts
    ├── consensus-building.ts
    ├── socratic-dialogue.ts
    └── hybrid-discussion.ts
```

## Core Motivation System

### 1. Agent Motivations

```typescript
// core/motivations/base/Motivation.ts
export interface IMotivation {
  id: string;
  name: string;
  
  /**
   * Calculate desire to speak based on current state
   * Returns value between 0-1 representing urgency
   */
  calculateDesire(
    agent: IAgent,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number>;
  
  /**
   * Update internal state after a turn
   */
  updateState(
    state: MotivationState,
    turn: DialogueTurn,
    context: DialogueContext
  ): MotivationState;
  
  /**
   * Check if motivation goals are satisfied
   */
  isSatisfied(state: MotivationState): boolean;
}

// core/motivations/base/MotivationState.ts
export interface MotivationState {
  satisfaction: number; // 0-1
  urgency: number; // 0-1
  agreement: Map<string, number>; // Agreement levels with other agents
  topicsAddressed: Set<string>;
  emotionalState: EmotionalState;
  metadata: Record<string, any>;
}

// core/agents/base/MotivatedAgent.ts
export abstract class MotivatedAgent extends DialogueAgent {
  protected motivations: IMotivation[] = [];
  protected motivationStates: Map<string, MotivationState> = new Map();
  
  constructor(
    id: string,
    name: string,
    llmClient: ILLMClient,
    systemPrompt: string,
    motivations: IMotivation[],
    context: AgentContext = {},
    public metadata: Record<string, any> = {}
  ) {
    super(id, name, llmClient, systemPrompt, context, metadata);
    this.initializeMotivations(motivations);
  }

  async calculateBid(context: BiddingContext): Promise<BidResult> {
    // Context influences bidding
    const contextModifier = this.calculateContextModifier(context);
    
    // Aggregate desires from all motivations
    const desires = await Promise.all(
      this.motivations.map(m => 
        m.calculateDesire(this, this.motivationStates.get(m.id)!, context)
      )
    );
    
    // Combine desires based on agent's personality and context
    const aggregatedDesire = this.aggregateDesires(desires) * contextModifier;
    
    return {
      value: aggregatedDesire,
      reasoning: this.explainBid(desires),
      motivationBreakdown: this.getMotivationBreakdown(desires),
      contextInfluence: this.explainContextInfluence(contextModifier)
    };
  }
  
  protected calculateContextModifier(context: BiddingContext): number {
    let modifier = 1.0;
    
    // Urgency based on current challenges
    if (this.context.currentChallenges?.some(challenge => 
      context.recentMessages.some(msg => msg.includes(challenge))
    )) {
      modifier *= 1.3; // More urgent to speak
    }
    
    // Expertise relevance
    if (this.context.expertise?.some(exp => 
      context.currentTopic.toLowerCase().includes(exp.toLowerCase())
    )) {
      modifier *= 1.2; // Expert wants to contribute
    }
    
    // Stakeholder pressure
    if (this.context.constituencySize && this.context.constituencySize > 10000) {
      modifier *= 1.1; // Representing many people
    }
    
    return Math.min(modifier, 2.0); // Cap at 2x
  }
  
  protected abstract aggregateDesires(desires: number[]): number;
}
```

### 2. Additional Motivation Implementations

```typescript
// core/motivations/implementations/CreativeExplorationMotivation.ts
export class CreativeExplorationMotivation implements IMotivation {
  id = 'creative-exploration';
  name = 'Creative Exploration';
  
  async calculateDesire(
    agent: IAgent,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number> {
    const noveltySpace = await this.assessNoveltySpace(context);
    const recentCreativity = this.measureRecentCreativity(context);
    const inspirationLevel = await this.detectInspiration(context);
    
    // High desire when see opportunities for creative leaps
    return Math.min(1, noveltySpace * 0.4 + inspirationLevel * 0.6);
  }
}

// core/motivations/implementations/ScaffoldingMotivation.ts
export class ScaffoldingMotivation implements IMotivation {
  id = 'scaffolding';
  name = 'Educational Scaffolding';
  
  async calculateDesire(
    agent: IAgent,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number> {
    const confusionLevel = await this.detectConfusion(context);
    const knowledgeGap = await this.identifyKnowledgeGap(context);
    const readinessForNext = this.assessReadiness(context);
    
    // Desire to speak when can help bridge understanding
    if (confusionLevel > 0.6) return 0.9;
    if (knowledgeGap > 0.4 && readinessForNext > 0.7) return 0.8;
    
    return 0.3;
  }
}

// core/motivations/implementations/InformationSeekingMotivation.ts
export class InformationSeekingMotivation implements IMotivation {
  id = 'information-seeking';
  name = 'Information Seeking';
  
  async calculateDesire(
    agent: IAgent,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number> {
    const unknowns = await this.identifyUnknowns(context);
    const evasiveness = await this.detectEvasiveness(context);
    const informationGaps = this.findInformationGaps(state, context);
    
    // High desire when information is missing or hidden
    return Math.min(1, unknowns * 0.5 + evasiveness * 0.3 + informationGaps * 0.2);
  }
}

// core/motivations/implementations/ConsensusSeekingMotivation.ts
export class ConsensusSeekingMotivation implements IMotivation {
  id = 'consensus-seeking';
  name = 'Consensus Seeking';
  
  constructor(
    private config: ConsensusConfig = {
      targetAgreement: 0.8,
      compromiseWillingness: 0.7,
      patienceDecayRate: 0.05
    }
  ) {}

  async calculateDesire(
    agent: IAgent,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number> {
    const disagreementLevel = await this.analyzeDisagreement(context);
    const recentCompromises = this.detectRecentCompromises(context);
    
    // High desire when disagreement exists but compromise is emerging
    if (disagreementLevel > 0.3 && recentCompromises > 0) {
      return Math.min(0.9, disagreementLevel + recentCompromises * 0.3);
    }
    
    // Low desire when consensus is near
    if (state.agreement.size > 0) {
      const avgAgreement = Array.from(state.agreement.values())
        .reduce((a, b) => a + b, 0) / state.agreement.size;
      
      if (avgAgreement > this.config.targetAgreement) {
        return 0.1; // Minimal desire to speak when consensus reached
      }
    }
    
    return 0.5; // Moderate desire otherwise
  }

  updateState(
    state: MotivationState,
    turn: DialogueTurn,
    context: DialogueContext
  ): MotivationState {
    const newState = { ...state };
    
    // Update agreement levels based on sentiment analysis
    const agreements = this.analyzeAgreements(turn, context);
    agreements.forEach((level, agentId) => {
      const current = newState.agreement.get(agentId) || 0.5;
      // Smooth update to avoid drastic changes
      newState.agreement.set(agentId, current * 0.7 + level * 0.3);
    });
    
    // Update satisfaction based on overall consensus progress
    newState.satisfaction = this.calculateSatisfaction(newState.agreement);
    
    return newState;
  }

  isSatisfied(state: MotivationState): boolean {
    if (state.agreement.size === 0) return false;
    
    const avgAgreement = Array.from(state.agreement.values())
      .reduce((a, b) => a + b, 0) / state.agreement.size;
    
    return avgAgreement >= this.config.targetAgreement;
  }
}

// core/motivations/implementations/TruthSeekingMotivation.ts
export class TruthSeekingMotivation implements IMotivation {
  id = 'truth-seeking';
  name = 'Truth Seeking';
  
  constructor(
    private config: TruthSeekingConfig = {
      evidenceThreshold: 0.7,
      questioningRate: 0.6,
      clarificationUrgency: 0.8
    }
  ) {}

  async calculateDesire(
    agent: IAgent,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number> {
    const unsubstantiatedClaims = await this.findUnsubstantiatedClaims(context);
    const contradictions = await this.detectContradictions(context);
    const ambiguities = await this.identifyAmbiguities(context);
    
    // High desire when truth is unclear
    const clarityNeed = (
      unsubstantiatedClaims * 0.4 +
      contradictions * 0.4 +
      ambiguities * 0.2
    );
    
    return Math.min(1, clarityNeed * this.config.clarificationUrgency);
  }
}

// core/motivations/implementations/CollaborativeMotivation.ts
export class CollaborativeMotivation implements IMotivation {
  id = 'collaborative';
  name = 'Collaborative';
  
  async calculateDesire(
    agent: IAgent,
    state: MotivationState,
    context: DialogueContext
  ): Promise<number> {
    const buildOpportunities = await this.findBuildingOpportunities(context);
    const supportNeeded = await this.identifySupportNeeds(context);
    
    // Desire to speak when can add value to others' ideas
    return Math.max(buildOpportunities, supportNeeded);
  }
  
  private async findBuildingOpportunities(context: DialogueContext): Promise<number> {
    // Analyze recent messages for incomplete ideas or requests for input
    const recentTurns = context.history.slice(-3);
    const opportunities = recentTurns.filter(turn => 
      turn.message.includes('?') || 
      turn.message.includes('perhaps') ||
      turn.message.includes('maybe') ||
      turn.sentiment?.uncertainty > 0.5
    );
    
    return opportunities.length / 3;
  }
}
```

### 3. Bidding Strategies

```typescript
// core/strategies/bidding/ConsensusBidding.ts
export class ConsensusBidding implements IBiddingStrategy {
  async calculateBid(
    agent: MotivatedAgent,
    context: BiddingContext
  ): Promise<BidResult> {
    const baseDesire = await agent.calculateBid(context);
    const consensusLevel = await this.measureConsensus(context);
    
    // Inverse relationship: lower bids as consensus increases
    const adjustedValue = baseDesire.value * (1 - consensusLevel * 0.8);
    
    return {
      ...baseDesire,
      value: adjustedValue,
      strategy: 'consensus-adjusted'
    };
  }
  
  private async measureConsensus(context: BiddingContext): Promise<number> {
    const analyzer = new AgreementCalculator();
    return analyzer.calculateOverallAgreement(context.dialogueHistory);
  }
}

// core/strategies/bidding/AdaptiveBidding.ts
export class AdaptiveBidding implements IBiddingStrategy {
  private strategies: Map<string, IBiddingStrategy> = new Map();
  
  constructor(strategies: Record<string, IBiddingStrategy>) {
    Object.entries(strategies).forEach(([key, strategy]) => {
      this.strategies.set(key, strategy);
    });
  }

  async calculateBid(
    agent: MotivatedAgent,
    context: BiddingContext
  ): Promise<BidResult> {
    // Choose strategy based on current dynamics
    const dynamics = await this.analyzeDynamics(context);
    const selectedStrategy = this.selectStrategy(dynamics);
    
    const result = await selectedStrategy.calculateBid(agent, context);
    return {
      ...result,
      strategy: `adaptive-${dynamics.mode}`
    };
  }
  
  private selectStrategy(dynamics: DialogueDynamics): IBiddingStrategy {
    if (dynamics.consensusProgress > 0.7) {
      return this.strategies.get('consensus')!;
    } else if (dynamics.polarization > 0.8) {
      return this.strategies.get('mediation')!;
    } else if (dynamics.stagnation > 0.6) {
      return this.strategies.get('provocative')!;
    }
    return this.strategies.get('balanced')!;
  }
}
```

### 4. Selection Strategies

```typescript
// core/strategies/selection/ConsensusThresholdStrategy.ts
export class ConsensusThresholdStrategy implements ISelectionStrategy {
  constructor(
    private config: ConsensusThresholdConfig = {
      speakingThreshold: 0.3,
      consensusTarget: 0.8,
      quietPeriodAfterAgreement: 2
    }
  ) {}

  async selectNextSpeaker(
    agents: MotivatedAgent[],
    context: SimulationContext
  ): Promise<DialogueAgent | null> {
    const bids = await this.collectBids(agents, context);
    
    // Check if anyone wants to speak above threshold
    const activeBids = bids.filter(b => b.value > this.config.speakingThreshold);
    
    if (activeBids.length === 0) {
      // No one has strong desire to speak - consensus may be reached
      return null;
    }
    
    // In consensus mode, prefer agents with moderate bids over extreme ones
    const moderateBids = this.filterModerateBids(activeBids);
    
    if (moderateBids.length > 0) {
      return this.selectFromBids(moderateBids);
    }
    
    return this.selectFromBids(activeBids);
  }
  
  private filterModerateBids(bids: BidResult[]): BidResult[] {
    const avg = bids.reduce((sum, b) => sum + b.value, 0) / bids.length;
    const stdDev = Math.sqrt(
      bids.reduce((sum, b) => sum + Math.pow(b.value - avg, 2), 0) / bids.length
    );
    
    // Select bids within 1 standard deviation of mean
    return bids.filter(b => Math.abs(b.value - avg) <= stdDev);
  }
}

// core/strategies/selection/ConvergenceStrategy.ts
export class ConvergenceStrategy implements ISelectionStrategy {
  private convergenceTracker = new ConvergenceTracker();
  
  async selectNextSpeaker(
    agents: MotivatedAgent[],
    context: SimulationContext
  ): Promise<DialogueAgent | null> {
    const positions = await this.analyzePositions(agents, context);
    const convergenceMap = this.convergenceTracker.update(positions);
    
    // Identify agents whose positions are converging
    const convergingPairs = this.findConvergingPairs(convergenceMap);
    
    if (convergingPairs.length > 0) {
      // Prioritize agents who are finding common ground
      const [agent1, agent2] = convergingPairs[0];
      
      // Let the one who spoke less recently go next
      const lastSpoke1 = context.lastSpokeAt.get(agent1.id) || -Infinity;
      const lastSpoke2 = context.lastSpokeAt.get(agent2.id) || -Infinity;
      
      return lastSpoke1 < lastSpoke2 ? agent1 : agent2;
    }
    
    // Fall back to standard bid-based selection
    return this.standardSelection(agents, context);
  }
}
```

### 5. Exit Conditions

```typescript
// core/strategies/exit/ExitCondition.ts
export interface IExitCondition {
  name: string;
  
  shouldExit(context: SimulationContext): Promise<ExitDecision>;
  
  getProgress(context: SimulationContext): Promise<number>;
}

export interface ExitDecision {
  shouldExit: boolean;
  reason?: string;
  confidence: number;
  metrics?: Record<string, any>;
}

// core/strategies/exit/ConsensusReachedCondition.ts
export class ConsensusReachedCondition implements IExitCondition {
  name = 'consensus-reached';
  
  constructor(
    private config: ConsensusExitConfig = {
      agreementThreshold: 0.85,
      lowBidThreshold: 0.2,
      requiredTurnsStable: 3
    }
  ) {}

  async shouldExit(context: SimulationContext): Promise<ExitDecision> {
    const recentBids = this.getRecentBids(context, this.config.requiredTurnsStable);
    const agreementLevel = await this.calculateAgreement(context);
    
    // Check if bids have been consistently low
    const avgRecentBid = recentBids.reduce((sum, b) => sum + b, 0) / recentBids.length;
    const bidsAreLow = avgRecentBid < this.config.lowBidThreshold;
    
    // Check if agreement is high
    const consensusReached = agreementLevel > this.config.agreementThreshold;
    
    if (bidsAreLow && consensusReached) {
      return {
        shouldExit: true,
        reason: 'Consensus reached - low desire to continue discussing',
        confidence: 0.9,
        metrics: {
          agreementLevel,
          averageBid: avgRecentBid,
          turnsStable: recentBids.length
        }
      };
    }
    
    return {
      shouldExit: false,
      confidence: 0.9,
      metrics: { agreementLevel, averageBid: avgRecentBid }
    };
  }

  async getProgress(context: SimulationContext): Promise<number> {
    const agreement = await this.calculateAgreement(context);
    const bidDropoff = this.calculateBidDropoff(context);
    
    // Weight agreement more heavily than bid dropoff
    return agreement * 0.7 + bidDropoff * 0.3;
  }
}

// core/strategies/exit/CompositeCondition.ts
export class CompositeExitCondition implements IExitCondition {
  name = 'composite';
  
  constructor(
    private conditions: IExitCondition[],
    private mode: 'any' | 'all' | 'weighted' = 'any',
    private weights?: number[]
  ) {}

  async shouldExit(context: SimulationContext): Promise<ExitDecision> {
    const decisions = await Promise.all(
      this.conditions.map(c => c.shouldExit(context))
    );
    
    switch (this.mode) {
      case 'any':
        const exitingCondition = decisions.find(d => d.shouldExit);
        return exitingCondition || {
          shouldExit: false,
          confidence: Math.min(...decisions.map(d => d.confidence))
        };
        
      case 'all':
        const allExit = decisions.every(d => d.shouldExit);
        return {
          shouldExit: allExit,
          reason: allExit ? 'All exit conditions met' : undefined,
          confidence: Math.min(...decisions.map(d => d.confidence))
        };
        
      case 'weighted':
        const weightedScore = decisions.reduce((sum, d, i) => {
          const weight = this.weights?.[i] || 1;
          return sum + (d.shouldExit ? weight : 0);
        }, 0);
        const totalWeight = this.weights?.reduce((a, b) => a + b, 0) || decisions.length;
        
        return {
          shouldExit: weightedScore / totalWeight > 0.5,
          confidence: decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length
        };
    }
  }
}
```

### 6. Simulation Modes

```typescript
// core/simulation/SimulationMode.ts
export enum SimulationMode {
  COMPETITIVE = 'competitive',
  CONSENSUS = 'consensus',
  DELIBERATIVE = 'deliberative',
  EXPLORATORY = 'exploratory',
  ADAPTIVE = 'adaptive',
  DISCOVERY = 'discovery',
  PEDAGOGICAL = 'pedagogical',
  NEGOTIATION = 'negotiation',
  PROBLEM_SOLVING = 'problem_solving',
  NARRATIVE = 'narrative',
  INVESTIGATIVE = 'investigative',
  THERAPEUTIC = 'therapeutic',
  DEVILS_ADVOCATE = 'devils_advocate',
  FORECASTING = 'forecasting',
  MEDIATION = 'mediation',
  META_COGNITIVE = 'meta_cognitive'
}

export interface SimulationModeConfig {
  mode: SimulationMode;
  description: string;
  agents: AgentConfig[];
  dynamics: DynamicsConfig;
  exitConditions: ExitConditionConfig[];
  phases?: SimulationPhase[];
  roles?: Record<string, RoleConfig>;
  characteristics?: ModeCharacteristics;
}

export interface ModeCharacteristics {
  // Behavioral flags
  maintainNarrativeCoherence?: boolean;
  informationAsymmetry?: boolean;
  emotionalSafety?: boolean;
  constructiveConflict?: boolean;
  timeHorizonAware?: boolean;
  processAwareness?: boolean;
  
  // Bidding modifiers
  biddingBoost?: Record<string, number>;
  biddingPenalty?: Record<string, number>;
  
  // Interaction patterns
  turnPattern?: string;
  requireAcknowledgment?: boolean;
  allowPauses?: boolean;
  allowMetaProposals?: boolean;
}

// Example configurations for different modes
export const SimulationModes = {
  [SimulationMode.CONSENSUS]: {
    description: "Build agreement through collaborative discussion",
    defaultMotivations: [
      new ConsensusSeekingMotivation(),
      new CollaborativeMotivation()
    ],
    selectionStrategy: new ConsensusThresholdStrategy(),
    biddingStrategy: new ConsensusBidding(),
    exitConditions: [
      new ConsensusReachedCondition(),
      new LowEngagementCondition({ threshold: 0.15 })
    ],
    dynamics: {
      encourageAgreement: true,
      penalizePolarization: true,
      rewardCompromise: true
    }
  },
  
  [SimulationMode.DELIBERATIVE]: {
    description: "Explore topics deeply with focus on truth and understanding",
    defaultMotivations: [
      new TruthSeekingMotivation(),
      new CollaborativeMotivation()
    ],
    selectionStrategy: new MultiObjectiveStrategy({
      objectives: ['clarity', 'coverage', 'depth']
    }),
    biddingStrategy: new AdaptiveBidding({
      exploration: new ExplorationBidding(),
      deepening: new DeepeningBidding(),
      synthesis: new SynthesisBidding()
    }),
    exitConditions: [
      new TopicExhaustionCondition(),
      new InsightSaturationCondition()
    ]
  },
  
  [SimulationMode.DISCOVERY]: {
    description: "Maximize idea generation and creative exploration",
    characteristics: {
      biddingBoost: {
        newIdeas: 2.0,
        tangentialThoughts: 1.5,
        "yes-and": 1.8
      },
      biddingPenalty: {
        criticism: 0.3,
        repetition: 0.1,
        prematureConvergence: 0.4
      }
    },
    defaultMotivations: [
      new CreativeExplorationMotivation(),
      new AssociativeThinkingMotivation(),
      new YesAndMotivation()
    ],
    exitConditions: [
      new IdeaSaturationCondition(),
      new EnergyDepletionCondition()
    ]
  },
  
  [SimulationMode.PEDAGOGICAL]: {
    description: "Optimize for knowledge transfer and understanding",
    characteristics: {
      biddingBoost: {
        clarificationQuestions: 1.5,
        examples: 1.3,
        corrections: 1.8
      }
    },
    roles: {
      teacher: {
        motivations: [new ScaffoldingMotivation(), new ClarityMotivation()],
        biddingModifier: 1.2
      },
      learner: {
        motivations: [new CuriosityMotivation(), new UnderstandingMotivation()],
        biddingModifier: 1.0
      }
    },
    exitConditions: [
      new UnderstandingAchievedCondition(),
      new LearningObjectivesMetCondition()
    ]
  },
  
  [SimulationMode.NEGOTIATION]: {
    description: "Find mutually beneficial agreements from different positions",
    characteristics: {
      maintainPositions: true,
      allowConcessions: true,
      trackValueExchange: true
    },
    defaultMotivations: [
      new PositionalMotivation(),
      new ValueMaximizationMotivation(),
      new RelationshipPreservationMotivation()
    ],
    exitConditions: [
      new DealReachedCondition(),
      new ImpasseCondition(),
      new BATNATriggeredCondition()
    ]
  },
  
  [SimulationMode.PROBLEM_SOLVING]: {
    description: "Collaborative work toward concrete solutions",
    phases: [
      { name: "problem-definition", duration: 5 },
      { name: "constraint-identification", duration: 3 },
      { name: "solution-generation", duration: 8 },
      { name: "evaluation", duration: 4 },
      { name: "refinement", duration: 5 }
    ],
    defaultMotivations: [
      new SolutionOrientedMotivation(),
      new ConstraintAwarenessMotivation(),
      new PracticalityMotivation()
    ],
    biddingStrategy: new PhaseAwareBidding(),
    exitConditions: [
      new ViableSolutionFoundCondition(),
      new AllConstraintsSatisfiedCondition()
    ]
  },
  
  [SimulationMode.NARRATIVE]: {
    description: "Collaborative story creation or narrative exploration",
    characteristics: {
      maintainNarrativeCoherence: true,
      encourageCreativeBuilding: true,
      trackStoryElements: true
    },
    defaultMotivations: [
      new NarrativeCoherenceMotivation(),
      new CharacterDevelopmentMotivation(),
      new DramaticTensionMotivation()
    ],
    selectionStrategy: new NarrativeTurnTaking({
      balanceCharacterVoices: true,
      tensionCurve: "rising-action"
    })
  },
  
  [SimulationMode.INVESTIGATIVE]: {
    description: "Uncover information through strategic questioning",
    characteristics: {
      informationAsymmetry: true,
      strategicReveal: true,
      deceptionPossible: true
    },
    defaultMotivations: [
      new InformationSeekingMotivation(),
      new InconsistencyDetectionMotivation(),
      new StrategicRevealMotivation()
    ],
    exitConditions: [
      new TruthUncoveredCondition(),
      new DeceptionExposedCondition(),
      new InformationExhaustedCondition()
    ]
  },
  
  [SimulationMode.THERAPEUTIC]: {
    description: "Emotional support and guided self-discovery",
    characteristics: {
      emotionalSafety: true,
      nonJudgmental: true,
      reflectiveListening: true,
      requireAcknowledgment: true,
      allowPauses: true
    },
    defaultMotivations: [
      new EmpathyMotivation(),
      new ReflectionMotivation(),
      new GrowthFacilitationMotivation()
    ],
    selectionStrategy: new TherapeuticTurnTaking()
  },
  
  [SimulationMode.DEVILS_ADVOCATE]: {
    description: "Systematic challenge of assumptions and ideas",
    characteristics: {
      constructiveConflict: true,
      assumptionChallenging: true,
      steelManArguments: true,
      turnPattern: "challenge-defend-refine"
    },
    defaultMotivations: [
      new AssumptionChallengingMotivation(),
      new RobustnessTestingMotivation(),
      new BlindSpotIlluminationMotivation()
    ]
  },
  
  [SimulationMode.FORECASTING]: {
    description: "Explore future scenarios and implications",
    characteristics: {
      timeHorizonAware: true,
      uncertaintyQuantification: true,
      scenarioBranching: true
    },
    phases: [
      { name: "trend-identification", duration: 4 },
      { name: "scenario-generation", duration: 6 },
      { name: "impact-analysis", duration: 5 },
      { name: "strategy-formulation", duration: 5 }
    ],
    defaultMotivations: [
      new FutureExplorationMotivation(),
      new UncertaintyReductionMotivation(),
      new ContingencyPlanningMotivation()
    ]
  },
  
  [SimulationMode.MEDIATION]: {
    description: "Facilitate resolution between conflicting parties",
    roles: {
      mediator: {
        motivations: [new NeutralityMotivation(), new ProcessFacilitationMotivation()],
        biddingModifier: 1.5
      },
      party: {
        motivations: [new InterestArticulationMotivation(), new CompromiseExplorationMotivation()],
        biddingModifier: 1.0
      }
    },
    phases: [
      { name: "opening-statements", duration: 3 },
      { name: "issue-identification", duration: 4 },
      { name: "interest-exploration", duration: 5 },
      { name: "option-generation", duration: 4 },
      { name: "agreement-building", duration: 4 }
    ]
  },
  
  [SimulationMode.META_COGNITIVE]: {
    description: "Agents reflect on the conversation process itself",
    characteristics: {
      processAwareness: true,
      strategyDiscussion: true,
      explicitGoalSetting: true,
      allowMetaProposals: true
    },
    defaultMotivations: [
      new ProcessImprovementMotivation(),
      new ConversationQualityMotivation()
    ]
  },
  
  [SimulationMode.ADAPTIVE]: {
    description: "Dynamically shifts between modes based on conversation needs",
    modeSelector: new DynamicModeSelector(),
    transitionRules: [
      {
        from: SimulationMode.COMPETITIVE,
        to: SimulationMode.CONSENSUS,
        condition: (metrics) => metrics.polarization > 0.8
      },
      {
        from: SimulationMode.CONSENSUS,
        to: SimulationMode.EXPLORATORY,
        condition: (metrics) => metrics.agreement > 0.9 && metrics.topicCoverage < 0.5
      },
      {
        from: SimulationMode.DISCOVERY,
        to: SimulationMode.PROBLEM_SOLVING,
        condition: (metrics) => metrics.ideaSaturation > 0.7
      },
      {
        from: SimulationMode.PROBLEM_SOLVING,
        to: SimulationMode.DEVILS_ADVOCATE,
        condition: (metrics) => metrics.solutionConfidence > 0.6 && !metrics.robustnessTested
      }
    ]
  }
};
```

### 7. Example Usage

```typescript
// examples/stakeholder-dialogue.ts
import { DialogueSimulation, SimulationMode } from '../src';

async function runStakeholderDialogue() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.NEGOTIATION,
    topic: "City planning for new public transit system",
    agents: [
      {
        name: "Sarah Chen",
        motivations: [
          { type: 'positional', weight: 0.6 },
          { type: 'value-maximization', weight: 0.4 }
        ],
        context: {
          profession: "Small Business Owner",
          expertise: ["retail", "customer service", "local economy"],
          representsGroup: "Downtown Business Association",
          constituencySize: 450,
          keyInterests: [
            "maintaining customer access during construction",
            "ensuring stops near business districts",
            "minimizing disruption to deliveries"
          ],
          currentChallenges: [
            "declining foot traffic",
            "competition from online retail"
          ],
          values: ["community prosperity", "pragmatism", "local identity"]
        }
      },
      {
        name: "Marcus Thompson",
        motivations: [
          { type: 'truth-seeking', weight: 0.5 },
          { type: 'consensus-seeking', weight: 0.5 }
        ],
        context: {
          profession: "Environmental Scientist",
          expertise: ["climate science", "urban sustainability", "public health"],
          representsGroup: "Green Cities Coalition",
          constituencySize: 12000,
          keyInterests: [
            "reducing carbon emissions",
            "improving air quality",
            "creating green corridors"
          ],
          values: ["environmental justice", "long-term thinking", "scientific evidence"],
          pastExperiences: [
            "Led successful bike lane initiative in 2019",
            "Published study on transit and emissions"
          ]
        }
      },
      {
        name: "Rita Patel",
        motivations: [
          { type: 'collaborative', weight: 0.7 },
          { type: 'relationship-preservation', weight: 0.3 }
        ],
        context: {
          profession: "City Council Member",
          expertise: ["public policy", "budget management", "community engagement"],
          yearsOfExperience: 12,
          currentChallenges: [
            "balancing competing interests",
            "working within budget constraints",
            "upcoming re-election"
          ],
          goals: {
            shortTerm: ["pass transit proposal", "maintain coalition"],
            longTerm: ["transform city mobility", "economic growth"]
          },
          relationships: [
            { agentId: "sarah-chen", relationship: "ally", history: "supported her tax proposal" },
            { agentId: "marcus-thompson", relationship: "neutral" }
          ]
        }
      }
    ]
  });

  return simulation.run();
}

// examples/historical-perspectives.ts
async function runHistoricalPerspectivesDialogue() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.DELIBERATIVE,
    topic: "Lessons from pandemic response for future preparedness",
    agents: [
      {
        name: "Dr. Emily Rodriguez",
        context: {
          profession: "Epidemiologist",
          expertise: ["infectious diseases", "public health policy"],
          pastExperiences: [
            "Frontline response during COVID-19",
            "H1N1 pandemic response team member"
          ],
          keyEvents: [
            {
              event: "Initial COVID lockdown decisions",
              impact: "Saw both benefits and unintended consequences",
              year: 2020
            }
          ],
          values: ["evidence-based policy", "health equity", "preparedness"]
        }
      },
      {
        name: "James Liu",
        context: {
          profession: "Restaurant Owner",
          representsGroup: "Independent Restaurant Alliance",
          pastExperiences: [
            "Lost first restaurant during lockdowns",
            "Pivoted second restaurant to delivery model"
          ],
          currentChallenges: [
            "Debt from pandemic",
            "Staff shortage",
            "Changed customer behaviors"
          ],
          values: ["entrepreneurship", "community gathering", "resilience"]
        }
      },
      {
        name: "Aisha Williams",
        context: {
          profession: "Public School Principal",
          expertise: ["education", "child development", "crisis management"],
          demographicInfo: {
            location: "Urban district, 85% low-income families"
          },
          pastExperiences: [
            "Managed remote learning transition",
            "Dealt with learning loss and mental health crisis"
          ],
          keyInterests: [
            "Student wellbeing",
            "Educational equity",
            "Community support systems"
          ]
        }
      }
    ]
  });

  return simulation.run();
}

// examples/cultural-perspectives.ts
async function runCulturalPerspectivesDialogue() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.CONSENSUS,
    topic: "Creating inclusive workplace policies",
    agents: [
      {
        name: "Kenji Tanaka",
        context: {
          demographicInfo: {
            culturalBackground: "Japanese-American, second generation",
            age: 45
          },
          profession: "HR Director",
          expertise: ["cross-cultural communication", "team dynamics"],
          values: ["harmony", "respect", "continuous improvement"],
          pastExperiences: [
            "Experienced cultural misunderstandings early in career",
            "Built successful multicultural teams"
          ]
        }
      },
      {
        name: "Fatima Al-Rashid",
        context: {
          demographicInfo: {
            culturalBackground: "Syrian refugee, in US for 8 years",
            age: 32
          },
          profession: "Software Engineer",
          currentChallenges: [
            "Navigating cultural differences in communication styles",
            "Balancing cultural identity with workplace integration"
          ],
          values: ["family", "professional growth", "cultural pride"],
          keyInterests: [
            "Prayer space accommodations",
            "Flexible hours for cultural obligations",
            "Bias-free evaluation processes"
          ]
        }
      },
      {
        name: "Rebecca Martinez",
        context: {
          demographicInfo: {
            culturalBackground: "Mexican-American, third generation",
            age: 38
          },
          profession: "Team Lead",
          expertise: ["project management", "team building"],
          representsGroup: "Employee Resource Group - LatinX",
          constituencySize: 200,
          goals: {
            shortTerm: ["Improve cultural awareness training"],
            longTerm: ["Create truly inclusive environment"]
          }
        }
      }
    ]
  });

  return simulation.run();
}

// examples/generational-dialogue.ts
async function runGenerationalDialogue() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.EXPLORATORY,
    topic: "The future of work-life balance",
    agents: [
      {
        name: "Robert Stevens",
        context: {
          demographicInfo: { age: 58, education: "MBA from State University" },
          profession: "Senior Executive",
          yearsOfExperience: 35,
          values: ["hard work", "loyalty", "face-time", "mentorship"],
          worldview: "Success comes from dedication and putting in the hours",
          pastExperiences: [
            "Worked way up from entry level",
            "Missed many family events for work"
          ]
        }
      },
      {
        name: "Zoe Chen",
        context: {
          demographicInfo: { age: 26, education: "Computer Science degree" },
          profession: "Product Designer",
          yearsOfExperience: 3,
          values: ["flexibility", "mental health", "impact", "authenticity"],
          worldview: "Work should enable life, not consume it",
          currentChallenges: [
            "Burnout from always-on culture",
            "Seeking meaningful work"
          ]
        }
      },
      {
        name: "David Okonkwo",
        context: {
          demographicInfo: { age: 42 },
          profession: "Middle Manager",
          expertise: ["team leadership", "process improvement"],
          values: ["balance", "efficiency", "family", "career growth"],
          currentChallenges: [
            "Managing diverse generational expectations",
            "Adapting to remote work dynamics"
          ],
          relationships: [
            { agentId: "robert-stevens", relationship: "ally", history: "mentored by him" },
            { agentId: "zoe-chen", relationship: "neutral" }
          ]
        }
      }
    ]
  });

  return simulation.run();
}

// examples/domain-specific-context.ts
async function runDomainSpecificDialogue() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.PROBLEM_SOLVING,
    topic: "Implementing AI in healthcare diagnostics",
    agents: [
      {
        name: "Dr. Priya Sharma",
        context: {
          profession: "Radiologist",
          expertise: ["medical imaging", "cancer detection"],
          domainContext: {
            hospitalType: "Regional Medical Center",
            patientsPerDay: 150,
            currentTools: ["PACS", "basic CAD"],
            specificConcerns: {
              falsePositiveRate: "Must stay below 5%",
              regulatoryCompliance: ["HIPAA", "FDA approval needed"],
              integrationRequirements: "Must work with existing PACS"
            }
          },
          keyInterests: [
            "Maintaining diagnostic accuracy",
            "Reducing radiologist fatigue",
            "Legal liability concerns"
          ]
        }
      },
      {
        name: "Alex Kim",
        context: {
          profession: "AI Research Scientist",
          expertise: ["computer vision", "medical AI"],
          domainContext: {
            organization: "HealthAI Startup",
            fundingStage: "Series B",
            modelPerformance: {
              accuracy: "94.3% on test set",
              fdaStatus: "510(k) pending",
              trainingData: "2.3 million images from 12 hospitals"
            }
          },
          currentChallenges: [
            "Proving generalization across populations",
            "Meeting regulatory requirements",
            "Gaining physician trust"
          ]
        }
      }
    ]
  });

  return simulation.run();
}
```

```typescript
// core/agents/factories/AgentFactory.ts
export class AgentFactory {
  static createFromProfile(
    profile: AgentProfile,
    llmClient: ILLMClient
  ): MotivatedAgent {
    const systemPrompt = this.buildSystemPrompt(profile);
    const motivations = this.selectMotivations(profile);
    const context = this.buildContext(profile);
    
    return new ContextualAgent(
      profile.id,
      profile.name,
      llmClient,
      systemPrompt,
      motivations,
      context
    );
  }
  
  static createStakeholderAgent(
    stakeholderType: StakeholderType,
    specificContext: Partial<AgentContext>,
    llmClient: ILLMClient
  ): MotivatedAgent {
    const template = StakeholderTemplates[stakeholderType];
    const context: AgentContext = {
      ...template.baseContext,
      ...specificContext
    };
    
    return this.createFromProfile({
      id: generateId(),
      name: specificContext.name || template.defaultName,
      motivations: template.motivations,
      context
    }, llmClient);
  }
  
  private static buildSystemPrompt(profile: AgentProfile): string {
    let prompt = profile.basePrompt || "You are participating in a dialogue.";
    
    // Add role-specific instructions
    if (profile.context.profession) {
      prompt += `\n\nYou are a ${profile.context.profession} with deep expertise in your field.`;
    }
    
    // Add stakeholder representation
    if (profile.context.representsGroup) {
      prompt += `\n\nYou represent ${profile.context.representsGroup} and must advocate for their interests while being open to dialogue.`;
    }
    
    // Add communication style based on context
    if (profile.context.demographicInfo?.culturalBackground) {
      prompt += `\n\nYour communication style reflects your ${profile.context.demographicInfo.culturalBackground} background.`;
    }
    
    return prompt;
  }
}

// Predefined stakeholder templates
export const StakeholderTemplates = {
  ENVIRONMENTAL_ACTIVIST: {
    defaultName: "Environmental Advocate",
    baseContext: {
      representsGroup: "Environmental Protection Coalition",
      expertise: ["climate science", "sustainability", "policy"],
      values: ["environmental protection", "intergenerational justice", "systems thinking"],
      keyInterests: ["emissions reduction", "habitat preservation", "renewable energy"]
    },
    motivations: [
      { type: 'truth-seeking', weight: 0.6 },
      { type: 'advocacy', weight: 0.4 }
    ]
  },
  
  BUSINESS_OWNER: {
    defaultName: "Business Representative",
    baseContext: {
      profession: "Business Owner",
      expertise: ["operations", "finance", "market dynamics"],
      values: ["profitability", "innovation", "employment"],
      keyInterests: ["economic viability", "regulatory burden", "competitive advantage"]
    },
    motivations: [
      { type: 'positional', weight: 0.5 },
      { type: 'value-maximization', weight: 0.5 }
    ]
  },
  
  COMMUNITY_ELDER: {
    defaultName: "Community Elder",
    baseContext: {
      yearsOfExperience: 40,
      values: ["tradition", "community cohesion", "wisdom", "gradual change"],
      keyInterests: ["preserving culture", "youth guidance", "community stability"]
    },
    motivations: [
      { type: 'consensus-seeking', weight: 0.6 },
      { type: 'wisdom-sharing', weight: 0.4 }
    ]
  },
  
  TECH_INNOVATOR: {
    defaultName: "Technology Pioneer",
    baseContext: {
      profession: "Tech Entrepreneur",
      expertise: ["AI", "software", "innovation"],
      values: ["disruption", "efficiency", "progress", "meritocracy"],
      worldview: "Technology can solve most problems"
    },
    motivations: [
      { type: 'creative-exploration', weight: 0.5 },
      { type: 'truth-seeking', weight: 0.5 }
    ]
  }
};
```

// examples/brainstorming-session.ts
async function runBrainstormingSession() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.DISCOVERY,
    topic: "Innovative ways to address urban loneliness",
    agents: [
      {
        name: "Wild Innovator",
        motivations: [
          { type: 'creative-exploration', weight: 0.9 },
          { type: 'associative-thinking', weight: 0.1 }
        ]
      },
      {
        name: "Yes-And Builder",
        motivations: [
          { type: 'yes-and', weight: 0.8 },
          { type: 'collaborative', weight: 0.2 }
        ]
      },
      {
        name: "Connector",
        motivations: [
          { type: 'associative-thinking', weight: 0.7 },
          { type: 'creative-exploration', weight: 0.3 }
        ]
      }
    ],
    characteristics: {
      biddingBoost: {
        newIdeas: 2.0,
        buildingOnIdeas: 1.8,
        tangentialConnections: 1.5
      },
      biddingPenalty: {
        criticism: 0.2,
        feasibilityFocus: 0.3 // Save practicality for later
      }
    }
  });

  simulation.on('new-idea', (idea) => {
    console.log(`💡 New idea: ${idea.content}`);
    console.log(`   Building on: ${idea.connections}`);
  });

  return simulation.run();
}

// examples/negotiation-scenario.ts
async function runNegotiationScenario() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.NEGOTIATION,
    topic: "Software development contract terms",
    agents: [
      {
        name: "Client Representative",
        motivations: [
          { type: 'positional', weight: 0.6 },
          { type: 'value-maximization', weight: 0.4 }
        ],
        initialPosition: {
          budget: 100000,
          timeline: "3 months",
          scope: "full-featured app"
        }
      },
      {
        name: "Development Team Lead",
        motivations: [
          { type: 'positional', weight: 0.5 },
          { type: 'relationship-preservation', weight: 0.5 }
        ],
        initialPosition: {
          budget: 150000,
          timeline: "6 months",
          scope: "MVP first, then iterate"
        }
      }
    ],
    exitConditions: [
      {
        type: 'deal-reached',
        config: { requiredAgreements: ['budget', 'timeline', 'scope'] }
      },
      {
        type: 'impasse',
        config: { stalemateThreshold: 5 } // 5 turns without progress
      }
    ]
  });

  simulation.on('concession', (event) => {
    console.log(`${event.agent} moved on ${event.issue}: ${event.from} → ${event.to}`);
  });

  return simulation.run();
}

// examples/teaching-session.ts
async function runTeachingSession() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.PEDAGOGICAL,
    topic: "Understanding recursion in programming",
    agents: [
      {
        name: "Teacher",
        role: "teacher",
        motivations: [
          { type: 'scaffolding', weight: 0.7 },
          { type: 'clarity', weight: 0.3 }
        ]
      },
      {
        name: "Student A",
        role: "learner",
        motivations: [
          { type: 'curiosity', weight: 0.6 },
          { type: 'understanding', weight: 0.4 }
        ],
        knowledgeLevel: 0.3 // Beginner
      },
      {
        name: "Student B",
        role: "learner",
        motivations: [
          { type: 'curiosity', weight: 0.8 },
          { type: 'understanding', weight: 0.2 }
        ],
        knowledgeLevel: 0.5 // Intermediate
      }
    ],
    dynamics: {
      adaptToSlowestLearner: true,
      encourageQuestions: true,
      requireComprehensionChecks: true
    }
  });

  simulation.on('understanding-update', (update) => {
    console.log(`${update.agent} understanding: ${update.before} → ${update.after}`);
  });

  return simulation.run();
}

// examples/multi-modal-workshop.ts
async function runInnovationWorkshop() {
  const simulation = new DialogueSimulation({
    mode: SimulationMode.ADAPTIVE,
    topic: "Redesigning public transportation for 2040",
    sequentialModes: [
      {
        mode: SimulationMode.DISCOVERY,
        duration: 10,
        goal: "Generate creative ideas",
        exitOn: { ideaCount: 20 }
      },
      {
        mode: SimulationMode.DEVILS_ADVOCATE,
        duration: 5,
        goal: "Stress test top ideas",
        exitOn: { ideasChallenged: 0.8 }
      },
      {
        mode: SimulationMode.PROBLEM_SOLVING,
        duration: 10,
        goal: "Develop concrete solutions",
        exitOn: { viableSolutions: 3 }
      },
      {
        mode: SimulationMode.CONSENSUS,
        duration: 5,
        goal: "Align on best approach",
        exitOn: { consensusLevel: 0.75 }
      }
    ],
    agents: createDiverseTeam([
      'urban-planner',
      'technologist', 
      'environmentalist',
      'economist',
      'citizen-advocate'
    ])
  });

  simulation.on('mode-transition', (transition) => {
    console.log(`\n=== Shifting to ${transition.newMode} ===`);
    console.log(`Goal: ${transition.goal}`);
    console.log(`Progress on previous: ${transition.previousProgress}`);
  });

  return simulation.run();
}

// examples/parallel-tracks.ts
async function runParallelDiscussion() {
  const simulation = new ParallelSimulation({
    mainTopic: "Company restructuring strategy",
    tracks: [
      {
        name: "Technical Architecture",
        agents: ["CTO", "Lead Developer"],
        mode: SimulationMode.PROBLEM_SOLVING
      },
      {
        name: "Cultural Change",
        agents: ["HR Director", "Team Lead"],
        mode: SimulationMode.THERAPEUTIC
      },
      {
        name: "Financial Planning",
        agents: ["CFO", "Financial Analyst"],
        mode: SimulationMode.FORECASTING
      }
    ],
    syncStrategy: {
      frequency: 5, // Sync every 5 turns
      mode: SimulationMode.CONSENSUS,
      duration: 3
    },
    finalIntegration: {
      mode: SimulationMode.PROBLEM_SOLVING,
      goal: "Unified restructuring plan"
    }
  });

  return simulation.run();
}
```

### 8. Advanced Composite Workflows

```typescript
// core/workflows/CompositeWorkflow.ts
export class CompositeWorkflow {
  constructor(
    private config: CompositeWorkflowConfig
  ) {}

  async execute(): Promise<WorkflowResult> {
    if (this.config.type === 'sequential') {
      return this.executeSequential();
    } else if (this.config.type === 'parallel') {
      return this.executeParallel();
    } else if (this.config.type === 'hierarchical') {
      return this.executeHierarchical();
    }
  }

  private async executeSequential(): Promise<WorkflowResult> {
    const results = [];
    
    for (const phase of this.config.phases) {
      const simulation = new DebateSimulation({
        mode: phase.mode,
        agents: phase.agents || this.config.agents,
        exitConditions: phase.exitConditions,
        ...phase.config
      });
      
      const result = await simulation.run();
      results.push(result);
      
      // Carry forward insights to next phase
      if (phase.carryForward) {
        this.transferInsights(result, this.config.phases[results.length]);
      }
    }
    
    return this.synthesizeResults(results);
  }
}

// examples/advanced-workflows.ts
// Complex Multi-Phase Innovation Process
export const innovationPipeline = {
  type: 'sequential',
  phases: [
    {
      name: 'Problem Discovery',
      mode: SimulationMode.INVESTIGATIVE,
      duration: 8,
      exitConditions: [{ type: 'problem-clarity', threshold: 0.8 }],
      carryForward: ['problem-statements', 'constraints']
    },
    {
      name: 'Ideation',
      mode: SimulationMode.DISCOVERY,
      duration: 12,
      config: {
        constraints: 'inherit', // From previous phase
        wildnessLevel: 0.9
      }
    },
    {
      name: 'Critical Analysis',
      mode: SimulationMode.DEVILS_ADVOCATE,
      duration: 6,
      config: {
        targetIdeas: 'top-10', // From previous phase
        rigor: 'high'
      }
    },
    {
      name: 'Solution Development',
      mode: SimulationMode.PROBLEM_SOLVING,
      duration: 10,
      config: {
        startingPoint: 'survived-ideas' // From critical analysis
      }
    },
    {
      name: 'Implementation Planning',
      mode: SimulationMode.FORECASTING,
      duration: 8,
      config: {
        timeHorizon: '5-years',
        scenarios: ['optimistic', 'realistic', 'pessimistic']
      }
    }
  ]
};

// Parallel Processing with Periodic Integration
export const parallelResearch = {
  type: 'parallel-with-sync',
  tracks: [
    {
      name: 'Technical Feasibility',
      mode: SimulationMode.PROBLEM_SOLVING,
      agents: ['Engineer', 'Architect', 'QA Lead']
    },
    {
      name: 'Market Analysis',
      mode: SimulationMode.FORECASTING,
      agents: ['Market Researcher', 'Sales Lead', 'Customer Rep']
    },
    {
      name: 'Ethical Considerations',
      mode: SimulationMode.DELIBERATIVE,
      agents: ['Ethicist', 'Legal Advisor', 'Community Rep']
    }
  ],
  syncPoints: [
    {
      afterTurns: 10,
      mode: SimulationMode.CONSENSUS,
      duration: 5,
      goal: 'Share findings and identify conflicts'
    },
    {
      afterTurns: 20,
      mode: SimulationMode.NEGOTIATION,
      duration: 8,
      goal: 'Resolve conflicts and find compromise'
    }
  ],
  finalIntegration: {
    mode: SimulationMode.PROBLEM_SOLVING,
    goal: 'Unified strategy incorporating all perspectives'
  }
};

// Hierarchical Decision Making
export const hierarchicalDeliberation = {
  type: 'hierarchical',
  levels: [
    {
      name: 'Working Groups',
      parallel: true,
      groups: [
        {
          topic: 'Technical Approach',
          mode: SimulationMode.PROBLEM_SOLVING,
          agents: ['Dev1', 'Dev2', 'Dev3']
        },
        {
          topic: 'Business Model',
          mode: SimulationMode.DISCOVERY,
          agents: ['Biz1', 'Biz2', 'Biz3']
        }
      ]
    },
    {
      name: 'Department Synthesis',
      mode: SimulationMode.CONSENSUS,
      agents: ['Tech Lead', 'Business Lead'], // Representatives from each group
      incorporates: 'working-group-conclusions'
    },
    {
      name: 'Executive Decision',
      mode: SimulationMode.DELIBERATIVE,
      agents: ['CEO', 'CTO', 'CFO'],
      incorporates: 'department-recommendations'
    }
  ]
};

// Meta-Learning System
export const metaLearningWorkflow = {
  type: 'recursive',
  baseSimulation: {
    mode: SimulationMode.PROBLEM_SOLVING,
    topic: 'Optimize team communication'
  },
  metaLayer: {
    mode: SimulationMode.META_COGNITIVE,
    frequency: 'every-10-turns',
    purpose: 'Reflect on conversation effectiveness',
    canModify: ['mode', 'strategies', 'agent-motivations']
  },
  learningObjectives: [
    'Identify most effective discussion patterns',
    'Discover optimal mode transitions',
    'Learn agent motivation combinations'
  ]
};

### 1. **Motivation-Driven Architecture**
- Agents have multiple motivations that influence behavior
- Motivations can be weighted and combined
- Easy to add new motivation types

### 2. **Dynamic Exit Conditions**
- Multiple exit strategies beyond fixed turn counts
- Consensus detection based on bid patterns
- Composite conditions for complex scenarios

### 3. **Adaptive Strategies**
- Strategies can change based on conversation dynamics
- Support for mode transitions during simulation
- Meta-strategies that select from multiple approaches

### 4. **Rich Metrics & Analysis**
- Track agreement levels between agents
- Measure topic coverage and depth
- Detect stagnation and polarization

### 5. **Flexible Bidding**
- Bidding reflects internal motivations
- Support for non-competitive bidding
- Bid values can represent different concepts

### 6. **Conversation Dynamics**
- Track and respond to conversation patterns
- Encourage or discourage certain behaviors
- Support for different interaction styles

This architecture allows you to:
- Run consensus-building sessions that end when agreement is reached
- Create Socratic dialogues focused on truth-seeking
- Mix competitive and collaborative elements
- Adapt strategies mid-conversation based on dynamics
- Build custom motivation combinations for specific use cases

The key insight is treating bidding not just as competition for speaking time, but as a signal of internal state that can represent urgency, disagreement, curiosity, or desire to help others.