import { Chat } from "@google/genai";

export enum SpeakerRole {
  PRO = "正方",
  CON = "反方",
  SYSTEM = "系统",
  JUDGE = "评委"
}

export interface Argument {
  id: string;
  speaker: SpeakerRole; 
  content: string;
  timestamp: Date;
  isUserArgument?: boolean; // Flag to identify user's argument
  judgeCommentData?: JudgeOutput; // To store full judge output for system message placeholders
}

// Types for Judge's evaluation
export interface ScoreDimensions {
  contentAndArgumentation: number; // 内容与论证
  expressionAndTechnique: number; // 表达与技巧
  reactionAndAdaptability: number; // 反应与应变
  presence: number; // 气场
}

export interface SpeakerScores {
  dimensions: ScoreDimensions;
  average: number; // Calculated on client-side
}

export interface JudgeOutput {
  roundSummaries: Array<{ roundNumber: number, summary: string }>;
  overallSummary: string;
  proScores: SpeakerScores;
  conScores: SpeakerScores;
}

export enum GameMode {
  AI_VS_AI = "ai-vs-ai",
  HUMAN_VS_AI = "human-vs-ai",
}

export interface HistoricalDebateEntry {
  id: string; // Unique ID for this debate session, set at its initialization (currentDebateId)
  topic: string;
  gameMode: GameMode;
  createdAt: string; // ISO string: when the debate session was first created/initialized
  lastSavedAt: string; // ISO string: when this entry was last saved to history
  debateLog: Argument[];
  humanSpeakerRole: SpeakerRole.PRO | null; // For HvAI mode
  finalTurnCount: number;
  finalPromptTokensUsed: number;
  finalCandidatesTokensUsed: number;
  finalTotalTokensUsed: number;
  judgeOutputSnapshot: JudgeOutput | null; // Store the judge output directly
  currentSpeakerNext: SpeakerRole; // Who is due to speak next when this was saved
}

export interface DebateState {
  topic: string;
  isDebateActive: boolean;
  proChat: Chat | null; // AI Pro in AIvAI, or null if human is Pro in HvAI
  conChat: Chat | null; // AI Con in AIvAI, or AI opponent in HvAI
  debateLog: Argument[];
  currentSpeakerToTalk: SpeakerRole;
  turnCount: number;
  isLoading: boolean; // General loading (AI response or human submitting)
  errorMessage: string | null;
  
  // Judge related state
  isJudgeModalOpen: boolean;
  judgeOutput: JudgeOutput | null; // For modal display
  isJudgeLoading: boolean;
  judgeErrorMessage: string | null;

  // Game mode state
  gameMode: GameMode | null;
  humanSpeakerRole: SpeakerRole.PRO | null; // Human is always PRO in HvAI for this version
  isHumanTurn: boolean; // True if it's human's turn in HUMAN_VS_AI
  humanInput: string; // Current text in human's input textarea

  // API Key Settings
  userApiKey: string | null; // User-provided API key, loaded from localStorage
  apiKeyInput: string; // Current value in the API key input field
  showApiKeySettings: boolean; // To toggle visibility of API key settings UI

  // Cumulative Token Usage
  promptTokensUsed: number;
  candidatesTokensUsed: number;
  totalTokensUsed: number;

  // Last API Call Token Usage
  lastCallPromptTokens: number;
  lastCallCandidatesTokens: number;
  lastCallTotalTokens: number;

  // History Feature
  historicalDebates: HistoricalDebateEntry[];
  showHistoryView: boolean;
  currentDebateId: string | null; // ID for the current *active* new debate session OR the ID of the loaded historical debate being interacted with
  viewingHistoricalDebateId: string | null; // ID of the historical debate that was initially loaded (could be same as currentDebateId if resuming)

  // Token Display UI
  isTokenDisplayMinimized: boolean;
}