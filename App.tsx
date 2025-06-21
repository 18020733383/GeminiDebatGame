
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SpeakerRole, Argument, DebateState, JudgeOutput, ScoreDimensions, GameMode, HistoricalDebateEntry } from './types';
import { 
  GEMINI_MODEL_NAME, 
  APP_TITLE,
  LOCAL_STORAGE_DEBATE_HISTORY_KEY,
  DEBATE_INIT_MESSAGE_PRO,
  DEBATE_SUBSEQUENT_MESSAGE,
  SYSTEM_INSTRUCTION_PRO,
  SYSTEM_INSTRUCTION_CON,
  JUDGE_SYSTEM_INSTRUCTION,
  HUMAN_DEBATE_INIT_MESSAGE
} from './constants';
import LoadingSpinner from './components/LoadingSpinner';
import ArgumentCard from './components/ArgumentCard';
import JudgeModal from './components/JudgeModal';
import HistoricalTopicCard from './components/HistoricalTopicCard';


const LOCAL_STORAGE_API_KEY = 'userApiKey';
const MAX_INPUT_LENGTH = 1000;


const initialState: DebateState = {
  topic: '',
  isDebateActive: false,
  proChat: null,
  conChat: null,
  debateLog: [],
  currentSpeakerToTalk: SpeakerRole.PRO,
  turnCount: 0,
  isLoading: false,
  errorMessage: null,
  // Judge related state
  isJudgeModalOpen: false,
  judgeOutput: null,
  isJudgeLoading: false,
  judgeErrorMessage: null,
  // Game mode state
  gameMode: null,
  humanSpeakerRole: null, 
  isHumanTurn: false,
  humanInput: '',
  // API Key Settings
  userApiKey: null,
  apiKeyInput: '',
  showApiKeySettings: false,
  // Token Usage
  promptTokensUsed: 0,
  candidatesTokensUsed: 0,
  totalTokensUsed: 0,
  // Last API Call Token Usage
  lastCallPromptTokens: 0,
  lastCallCandidatesTokens: 0,
  lastCallTotalTokens: 0,
  // History Feature
  historicalDebates: [],
  showHistoryView: false,
  currentDebateId: null,
  viewingHistoricalDebateId: null,
  // Token Display UI
  isTokenDisplayMinimized: false,
};

const App: React.FC = () => {
  const [debateState, setDebateState] = useState<DebateState>(initialState);
  const [inputTopic, setInputTopic] = useState<string>('');
  const debateLogRef = useRef<HTMLDivElement>(null);
  const humanInputRef = useRef<HTMLTextAreaElement>(null);

  const envApiKey = process.env.API_KEY;

  useEffect(() => {
    const storedUserApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    const storedHistory = localStorage.getItem(LOCAL_STORAGE_DEBATE_HISTORY_KEY);
    let parsedHistory: HistoricalDebateEntry[] = [];
    if (storedHistory) {
      try {
        parsedHistory = JSON.parse(storedHistory).map((entry: HistoricalDebateEntry) => ({
          ...entry,
          createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date(0).toISOString(),
          lastSavedAt: entry.lastSavedAt ? new Date(entry.lastSavedAt).toISOString() : new Date(0).toISOString(),
          debateLog: entry.debateLog.map(arg => ({
            ...arg,
            timestamp: new Date(arg.timestamp) 
          })),
          currentSpeakerNext: entry.currentSpeakerNext || SpeakerRole.PRO, // Fallback for older entries
        }));
      } catch (e) {
        console.error("Failed to parse debate history from localStorage:", e);
        parsedHistory = [];
      }
    }

    setDebateState(prev => ({ 
      ...prev, 
      userApiKey: storedUserApiKey || prev.userApiKey,
      apiKeyInput: storedUserApiKey || '',
      historicalDebates: parsedHistory,
    }));
  }, []);

  useEffect(() => {
    if (debateLogRef.current) {
      debateLogRef.current.scrollTop = debateLogRef.current.scrollHeight;
    }
  }, [debateState.debateLog]);
  
  useEffect(() => {
    if (debateState.gameMode === GameMode.HUMAN_VS_AI && debateState.isHumanTurn && debateState.isDebateActive) {
      humanInputRef.current?.focus();
    }
  }, [debateState.isHumanTurn, debateState.gameMode, debateState.isDebateActive]);

  const getEffectiveApiKey = useCallback((): string | null => {
    if (debateState.userApiKey && debateState.userApiKey.trim() !== '') {
      return debateState.userApiKey.trim();
    }
    return envApiKey || null;
  }, [debateState.userApiKey, envApiKey]);

  const handleSetGameMode = (mode: GameMode) => {
    setDebateState(prev => ({ ...prev, gameMode: mode, errorMessage: null, showApiKeySettings: false, showHistoryView: false }));
  };

  const handleApiKeyInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDebateState(prev => ({ ...prev, apiKeyInput: e.target.value }));
  };

  const handleSaveApiKey = () => {
    const trimmedKey = debateState.apiKeyInput.trim();
    if (trimmedKey) {
      localStorage.setItem(LOCAL_STORAGE_API_KEY, trimmedKey);
      setDebateState(prev => ({ ...prev, userApiKey: trimmedKey, errorMessage: "API 密钥已保存。"}));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_API_KEY);
      setDebateState(prev => ({ ...prev, userApiKey: null, apiKeyInput: '', errorMessage: "用户 API 密钥已清除。" }));
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem(LOCAL_STORAGE_API_KEY);
    setDebateState(prev => ({ 
      ...prev, 
      userApiKey: null, 
      apiKeyInput: '',
      errorMessage: "用户 API 密钥已清除。" 
    }));
  };

  const toggleApiKeySettings = () => {
    setDebateState(prev => ({ ...prev, showApiKeySettings: !prev.showApiKeySettings, errorMessage: null, showHistoryView: false, gameMode: null }));
  };
  
  const handleToggleHistoryView = () => {
    setDebateState(prev => ({
      ...prev,
      showHistoryView: !prev.showHistoryView,
      gameMode: null, 
      showApiKeySettings: false, 
      errorMessage: null,
    }));
  };

  const saveCurrentDebateToHistory = useCallback(() => {
    const { 
      currentDebateId, topic, gameMode, debateLog, humanSpeakerRole, 
      turnCount, promptTokensUsed, candidatesTokensUsed, totalTokensUsed, 
      judgeOutput, currentSpeakerToTalk
    } = debateState; 

    if (!currentDebateId) return; 
    
    const actualArguments = debateLog.filter(arg => arg.speaker !== SpeakerRole.SYSTEM || arg.judgeCommentData);
    if (actualArguments.length === 0 && !judgeOutput) return;

    const newEntry: HistoricalDebateEntry = {
      id: currentDebateId,
      topic,
      gameMode: gameMode!, 
      createdAt: new Date(parseInt(currentDebateId, 10)).toISOString(), 
      lastSavedAt: new Date().toISOString(),
      debateLog: debateLog.map(arg => ({...arg, timestamp: new Date(arg.timestamp)})), 
      humanSpeakerRole,
      finalTurnCount: turnCount,
      finalPromptTokensUsed: promptTokensUsed,
      finalCandidatesTokensUsed: candidatesTokensUsed,
      finalTotalTokensUsed: totalTokensUsed,
      judgeOutputSnapshot: judgeOutput,
      currentSpeakerNext: currentSpeakerToTalk, // Save who is due to speak next
    };
    
    setDebateState(prev => {
      const existingIndex = prev.historicalDebates.findIndex(entry => entry.id === newEntry.id);
      let updatedInternalHistory;
      if (existingIndex > -1) {
        updatedInternalHistory = [...prev.historicalDebates];
        updatedInternalHistory[existingIndex] = newEntry;
      } else {
        updatedInternalHistory = [newEntry, ...prev.historicalDebates];
      }
      updatedInternalHistory.sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());
      localStorage.setItem(LOCAL_STORAGE_DEBATE_HISTORY_KEY, JSON.stringify(updatedInternalHistory));
      return { ...prev, historicalDebates: updatedInternalHistory };
    });
  }, [debateState]);


  const handleNextTurn = useCallback(async () => {
    const effectiveApiKey = getEffectiveApiKey();
    if (!effectiveApiKey) {
      setDebateState(prev => ({ ...prev, errorMessage: "API 密钥未配置。请在设置中提供您自己的密钥或确保应用内置密钥可用。", isLoading: false }));
      return;
    }
    if (!debateState.isDebateActive || !debateState.topic ) {
      setDebateState(prev => ({ ...prev, errorMessage: "辩论未初始化。" }));
      return;
    }
    
    const { gameMode, currentSpeakerToTalk, proChat, conChat, turnCount, topic, debateLog, humanSpeakerRole } = debateState;

    if (gameMode === GameMode.HUMAN_VS_AI && currentSpeakerToTalk === humanSpeakerRole) { 
      console.warn("handleNextTurn was called when it's still considered human's turn based on currentSpeakerToTalk.");
      return; 
    }

    let targetChat: Chat | null;
    let prompt: string;
    let actualSpeakerForTurn = currentSpeakerToTalk;

    setDebateState(prev => ({ ...prev, isLoading: true, errorMessage: null, judgeOutput: null, judgeErrorMessage: null }));

    if (gameMode === GameMode.AI_VS_AI) {
      targetChat = currentSpeakerToTalk === SpeakerRole.PRO ? proChat : conChat;
      // For AI vs AI, initial turn (turnCount 0, Pro speaking) is handled by useEffect after init.
      // Subsequent turns will always have prior arguments.
      const opponentRole = currentSpeakerToTalk === SpeakerRole.PRO ? SpeakerRole.CON : SpeakerRole.PRO;
      const opponentLastArgObj = debateLog.slice().reverse().find(arg => arg.speaker === opponentRole);
      // If no opponent arg (e.g. Pro's first turn in a resumed debate, or Con's first turn after Pro's initial), use init message logic.
      if (turnCount === 0 && currentSpeakerToTalk === SpeakerRole.PRO && !opponentLastArgObj) {
         prompt = DEBATE_INIT_MESSAGE_PRO(topic);
      } else {
        const opponentLastArgContent = opponentLastArgObj ? opponentLastArgObj.content : "对方尚未发言。";
        prompt = DEBATE_SUBSEQUENT_MESSAGE(topic, opponentRole, opponentLastArgContent, currentSpeakerToTalk);
      }

    } else if (gameMode === GameMode.HUMAN_VS_AI) { 
      targetChat = conChat; 
      actualSpeakerForTurn = SpeakerRole.CON; // AI is always CON in HvAI
      const humanLastArgObj = debateLog.slice().reverse().find(arg => arg.speaker === SpeakerRole.PRO && arg.isUserArgument);
      const humanLastArgContent = humanLastArgObj ? humanLastArgObj.content : "您尚未发言。"; // Should always have content because AI turn is triggered after human.
      prompt = DEBATE_SUBSEQUENT_MESSAGE(topic, SpeakerRole.PRO, humanLastArgContent, SpeakerRole.CON);
    } else {
      setDebateState(prev => ({ ...prev, isLoading: false, errorMessage: "无效的游戏模式或状态。" }));
      return;
    }

    if (!targetChat) {
      setDebateState(prev => ({ 
        ...prev, 
        isLoading: false, 
        errorMessage: `聊天会话无效 (${actualSpeakerForTurn})。可能API密钥缺失或初始化失败。` 
      }));
      if (gameMode === GameMode.HUMAN_VS_AI) {
        setDebateState(prev => ({
          ...prev,
          isHumanTurn: true, // Allow human to try again if AI chat failed
          currentSpeakerToTalk: humanSpeakerRole || SpeakerRole.PRO,
        }));
      }
      return;
    }
    
    try {
      const response: GenerateContentResponse = await targetChat.sendMessage({ message: prompt });
      const newArgument: Argument = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        speaker: actualSpeakerForTurn,
        content: response.text.trim(),
        timestamp: new Date(),
        isUserArgument: false,
      };

      let currentCallPromptTokens = 0;
      let currentCallCandidatesTokens = 0;
      let currentCallTotalTokens = 0;

      if (response.usageMetadata) {
        currentCallPromptTokens = response.usageMetadata.promptTokenCount || 0;
        currentCallCandidatesTokens = response.usageMetadata.candidatesTokenCount || 0;
        currentCallTotalTokens = response.usageMetadata.totalTokenCount || 0;
      }

      setDebateState(prev => ({
        ...prev,
        debateLog: [...prev.debateLog, newArgument],
        currentSpeakerToTalk: gameMode === GameMode.AI_VS_AI 
          ? (actualSpeakerForTurn === SpeakerRole.PRO ? SpeakerRole.CON : SpeakerRole.PRO)
          : (humanSpeakerRole || SpeakerRole.PRO), // After AI (CON) speaks, it's human's (PRO) turn
        turnCount: prev.turnCount + 1,
        isLoading: false,
        isHumanTurn: gameMode === GameMode.HUMAN_VS_AI ? true : prev.isHumanTurn,
        lastCallPromptTokens: currentCallPromptTokens,
        lastCallCandidatesTokens: currentCallCandidatesTokens,
        lastCallTotalTokens: currentCallTotalTokens,
        promptTokensUsed: prev.promptTokensUsed + currentCallPromptTokens,
        candidatesTokensUsed: prev.candidatesTokensUsed + currentCallCandidatesTokens,
        totalTokensUsed: prev.totalTokensUsed + currentCallTotalTokens,
      }));
    } catch (error) {
      console.error("Gemini API error (Next Turn):", error);
      const specificErrorMsg = error instanceof Error ? error.message : String(error);
      setDebateState(prev => ({ 
        ...prev, 
        isLoading: false, 
        errorMessage: `AI (${actualSpeakerForTurn}) 生成回应时出错: ${specificErrorMsg}`,
        isHumanTurn: gameMode === GameMode.HUMAN_VS_AI ? true : prev.isHumanTurn, 
        currentSpeakerToTalk: gameMode === GameMode.HUMAN_VS_AI ? (humanSpeakerRole || SpeakerRole.PRO) : prev.currentSpeakerToTalk,
        lastCallPromptTokens: 0, 
        lastCallCandidatesTokens: 0,
        lastCallTotalTokens: 0,
      }));
    }
  }, [debateState, getEffectiveApiKey]);

  const handleInitializeDebate = useCallback(() => {
    if (!inputTopic.trim()) {
      setDebateState(prev => ({ ...prev, errorMessage: "请输入一个有效的辩论题目。" }));
      return;
    }
    if (inputTopic.length > MAX_INPUT_LENGTH) {
      setDebateState(prev => ({ ...prev, errorMessage: `辩论题目过长，请保持在 ${MAX_INPUT_LENGTH} 字以内。`}));
      return;
    }

    const effectiveApiKey = getEffectiveApiKey();
    if (!effectiveApiKey) {
      setDebateState(prev => ({ ...prev, errorMessage: "API 密钥未配置。请在设置中提供您自己的密钥或确保应用内置密钥可用。" }));
      return;
    }
    if (!debateState.gameMode) {
      setDebateState(prev => ({ ...prev, errorMessage: "请先选择一个游戏模式。" }));
      return;
    }

    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    let proChatInstance: Chat | null = null;
    let conChatInstance: Chat | null = null;
    let initialSpeaker = SpeakerRole.PRO;
    let humanRole: SpeakerRole.PRO | null = null;
    let humanTurn = false;
    const initialLog: Argument[] = [];
    const newDebateId = Date.now().toString(); 

    try {
      if (debateState.gameMode === GameMode.AI_VS_AI) {
        proChatInstance = ai.chats.create({
          model: GEMINI_MODEL_NAME,
          config: { systemInstruction: SYSTEM_INSTRUCTION_PRO(inputTopic) }
        });
        conChatInstance = ai.chats.create({
          model: GEMINI_MODEL_NAME,
          config: { systemInstruction: SYSTEM_INSTRUCTION_CON(inputTopic) }
        });
      } else if (debateState.gameMode === GameMode.HUMAN_VS_AI) {
        humanRole = SpeakerRole.PRO; 
        initialSpeaker = SpeakerRole.PRO;
        humanTurn = true;
        conChatInstance = ai.chats.create({ 
          model: GEMINI_MODEL_NAME,
          config: { systemInstruction: SYSTEM_INSTRUCTION_CON(inputTopic) }
        });
        initialLog.push({
          id: `${Date.now()}-system`,
          speaker: SpeakerRole.SYSTEM,
          content: HUMAN_DEBATE_INIT_MESSAGE(humanRole),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
      const specificErrorMsg = error instanceof Error ? error.message : String(error);
      setDebateState(prev => ({ 
        ...prev, 
        errorMessage: `初始化聊天会话失败: ${specificErrorMsg}`,
        isLoading: false, 
        isDebateActive: false,
      }));
      return; 
    }

    setDebateState(prev => ({
      ...initialState, 
      userApiKey: prev.userApiKey, 
      apiKeyInput: prev.apiKeyInput,
      historicalDebates: prev.historicalDebates, 
      isTokenDisplayMinimized: prev.isTokenDisplayMinimized, // Preserve UI preference
      showApiKeySettings: false, 
      topic: inputTopic,
      isDebateActive: true,
      proChat: proChatInstance,
      conChat: conChatInstance,
      currentSpeakerToTalk: initialSpeaker,
      humanSpeakerRole: humanRole,
      isHumanTurn: humanTurn,
      debateLog: initialLog,
      turnCount: 0,
      isLoading: false, 
      errorMessage: null, 
      judgeErrorMessage: null,
      isJudgeModalOpen: false,
      judgeOutput: null,
      isJudgeLoading: false,
      gameMode: prev.gameMode, 
      currentDebateId: newDebateId, 
      viewingHistoricalDebateId: null, 
      promptTokensUsed: 0,
      candidatesTokensUsed: 0,
      totalTokensUsed: 0,
      lastCallPromptTokens: 0,
      lastCallCandidatesTokens: 0,
      lastCallTotalTokens: 0,
    }));
  }, [inputTopic, debateState.gameMode, getEffectiveApiKey, debateState.userApiKey, debateState.apiKeyInput, debateState.historicalDebates, debateState.isTokenDisplayMinimized]);
  
   useEffect(() => {
    // Auto-start for AI vs AI mode, first turn only
    if (
        debateState.gameMode === GameMode.AI_VS_AI && 
        debateState.isDebateActive && 
        debateState.turnCount === 0 && 
        debateState.proChat && // Ensure chat is initialized
        !debateState.isLoading && 
        debateState.debateLog.filter(arg => arg.speaker !== SpeakerRole.SYSTEM).length === 0 && // Only if no actual arguments yet
        debateState.currentSpeakerToTalk === SpeakerRole.PRO
    ) {
      handleNextTurn();
    }
  }, [
      debateState.gameMode, 
      debateState.isDebateActive, 
      debateState.turnCount, 
      debateState.proChat, 
      debateState.isLoading, 
      debateState.debateLog.length,
      debateState.currentSpeakerToTalk,
      handleNextTurn
  ]);

  useEffect(() => {
    // Auto AI (CON) turn in Human vs AI mode after human (PRO) speaks
    if (
      debateState.gameMode === GameMode.HUMAN_VS_AI &&
      !debateState.isHumanTurn &&  // It's not human's turn (meaning human just spoke or AI is due)
      debateState.currentSpeakerToTalk === SpeakerRole.CON && // And it's AI's (CON) turn to speak
      debateState.isDebateActive &&
      !debateState.isLoading &&
      debateState.conChat // Ensure AI's chat is initialized
    ) {
      // Check if the last actual argument was by the human
      const lastLogEntry = debateState.debateLog[debateState.debateLog.length - 1];
      if (lastLogEntry && 
          lastLogEntry.speaker === debateState.humanSpeakerRole && 
          lastLogEntry.isUserArgument) {
        handleNextTurn(); // Trigger AI's response
      }
    }
  }, [
    debateState.gameMode,
    debateState.isHumanTurn,
    debateState.currentSpeakerToTalk,
    debateState.isDebateActive,
    debateState.isLoading,
    debateState.debateLog, 
    debateState.humanSpeakerRole,
    debateState.conChat,
    handleNextTurn,
  ]);

  const handleHumanInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_INPUT_LENGTH) {
      setDebateState(prev => ({ ...prev, humanInput: e.target.value }));
    }
  };

  const handleHumanSubmitArgument = useCallback(async () => {
    if (!debateState.humanInput.trim()) {
      setDebateState(prev => ({...prev, errorMessage: "发言内容不能为空。"}));
      return;
    }
     if (debateState.humanInput.length > MAX_INPUT_LENGTH) {
      setDebateState(prev => ({ ...prev, errorMessage: `发言内容过长，请保持在 ${MAX_INPUT_LENGTH} 字以内。`}));
      return;
    }
    if (!debateState.humanSpeakerRole) {
      setDebateState(prev => ({...prev, errorMessage: "未设定您的辩论角色。"}));
      return;
    }

    const humanArgument: Argument = {
      id: `${Date.now()}-human-${Math.random().toString(36).substr(2, 9)}`,
      speaker: debateState.humanSpeakerRole,
      content: debateState.humanInput,
      timestamp: new Date(),
      isUserArgument: true,
    };

    setDebateState(prev => ({
      ...prev,
      debateLog: [...prev.debateLog, humanArgument],
      humanInput: '', 
      isHumanTurn: false, // After human submits, it's AI's turn
      currentSpeakerToTalk: SpeakerRole.CON, // AI (CON) is next
      turnCount: prev.turnCount + 1,
      errorMessage: null,
      lastCallPromptTokens: 0, // Reset last call tokens, human turn doesn't use API for their speech
      lastCallCandidatesTokens: 0,
      lastCallTotalTokens: 0,
    }));
    // The useEffect for HUMAN_VS_AI will pick this up and call handleNextTurn for AI
  }, [debateState.humanInput, debateState.humanSpeakerRole]);


  const handleResetDebate = () => {
    // Save to history if it's an active debate (new or resumed historical) and has content
    if (debateState.currentDebateId && debateState.isDebateActive) {
        saveCurrentDebateToHistory(); 
    }
    
    setDebateState(prev => ({
        ...initialState, 
        userApiKey: prev.userApiKey,
        apiKeyInput: prev.apiKeyInput,
        historicalDebates: prev.historicalDebates, // Keep the list of historical debates
        isTokenDisplayMinimized: prev.isTokenDisplayMinimized, // Preserve UI preference
        showHistoryView: prev.showHistoryView && !prev.isDebateActive, // If exiting active debate, go to main. If just on history view, stay.
        showApiKeySettings: prev.showApiKeySettings && !prev.isDebateActive,
        // Reset other relevant fields to initial, currentDebateId will be cleared
    }));
    setInputTopic(''); // Also clear the topic input field
  };


  const getAiVsAiButtonText = () => {
    if (!debateState.isDebateActive) return "开始辩论"; // Should not be visible if not active
    if (debateState.isLoading && debateState.currentSpeakerToTalk !== SpeakerRole.SYSTEM) return `${debateState.currentSpeakerToTalk} 正在生成...`;
    if (debateState.currentSpeakerToTalk === SpeakerRole.SYSTEM) return "等待操作"; // Or some other placeholder
    return `请 ${debateState.currentSpeakerToTalk} 发言`;
  };

  const calculateAverageScore = (scores: ScoreDimensions): number => {
    const dimensionValues = Object.values(scores);
    if(dimensionValues.length === 0) return 0;
    const total = dimensionValues.reduce((sum, score) => sum + (Number(score) || 0), 0);
    const average = total / dimensionValues.length;
    return parseFloat(average.toFixed(1));
  };

  const handleFetchJudgeComments = useCallback(async () => {
    const effectiveApiKey = getEffectiveApiKey();
    if (!effectiveApiKey) {
      setDebateState(prev => ({ ...prev, judgeErrorMessage: "API 密钥未配置。请在设置中提供密钥或确保应用内置密钥可用。", isJudgeModalOpen: true }));
      return;
    }
    // Allow judge even if only system messages exist, for testing prompts perhaps, but usually needs actual args.
    if (!debateState.topic || debateState.debateLog.filter(arg => arg.speaker !== SpeakerRole.SYSTEM).length < 1) { 
      setDebateState(prev => ({ ...prev, judgeErrorMessage: "需要至少一方发言才能进行点评。", isJudgeModalOpen: true }));
      return;
    }

    setDebateState(prev => ({ ...prev, isJudgeLoading: true, judgeErrorMessage: null, judgeOutput: null, isJudgeModalOpen: true }));

    try {
      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      const prompt = JUDGE_SYSTEM_INSTRUCTION(debateState.topic, debateState.debateLog);
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      type RawJudgeScores = { dimensions: ScoreDimensions };
      type RawJudgeOutput = Omit<JudgeOutput, 'proScores' | 'conScores'> & { proScores: RawJudgeScores, conScores: RawJudgeScores };
      
      const rawJudgeData = JSON.parse(jsonStr) as RawJudgeOutput;
      
      const defaultScoreDimensions: ScoreDimensions = { contentAndArgumentation: 0, expressionAndTechnique: 0, reactionAndAdaptability: 0, presence: 0 };

      const proDimensions = rawJudgeData.proScores?.dimensions || defaultScoreDimensions;
      const conDimensions = rawJudgeData.conScores?.dimensions || defaultScoreDimensions;

      const processedJudgeData: JudgeOutput = {
        roundSummaries: rawJudgeData.roundSummaries || [],
        overallSummary: rawJudgeData.overallSummary || "评委未提供整体总结。",
        proScores: {
          dimensions: proDimensions,
          average: calculateAverageScore(proDimensions)
        },
        conScores: {
          dimensions: conDimensions,
          average: calculateAverageScore(conDimensions)
        }
      };

      const judgeSummaryArgument: Argument = {
        id: `${Date.now()}-judge-summary-${Math.random().toString(36).substr(2, 9)}`,
        speaker: SpeakerRole.SYSTEM,
        content: "评委已完成点评。详细分析和评分已记录。", // Shorter message for log
        timestamp: new Date(),
        judgeCommentData: processedJudgeData,
      };

      let currentCallPromptTokens = 0;
      let currentCallCandidatesTokens = 0;
      let currentCallTotalTokens = 0;

      if (response.usageMetadata) {
        currentCallPromptTokens = response.usageMetadata.promptTokenCount || 0;
        currentCallCandidatesTokens = response.usageMetadata.candidatesTokenCount || 0;
        currentCallTotalTokens = response.usageMetadata.totalTokenCount || 0;
      }
      
      setDebateState(prev => {
        // Add judge summary to log, replacing old one if exists
        const newLog = [...prev.debateLog.filter(arg => !arg.judgeCommentData), judgeSummaryArgument];

        let updatedHistoricalDebates = prev.historicalDebates;
        // If currently on a historical debate (viewing or active current), update its snapshot
        if (prev.currentDebateId) { 
            const histIndex = updatedHistoricalDebates.findIndex(h => h.id === prev.currentDebateId);
             if (histIndex > -1) {
                updatedHistoricalDebates = [...updatedHistoricalDebates]; // Create new array for react state update
                updatedHistoricalDebates[histIndex] = {
                    ...updatedHistoricalDebates[histIndex],
                    judgeOutputSnapshot: processedJudgeData, // Update snapshot
                    debateLog: newLog.map(arg => ({...arg, timestamp: new Date(arg.timestamp)})), // Update log with judge system message
                    lastSavedAt: new Date().toISOString(), // Update last saved time
                };
                localStorage.setItem(LOCAL_STORAGE_DEBATE_HISTORY_KEY, JSON.stringify(updatedHistoricalDebates));
            }
        }


        return {
          ...prev,
          debateLog: newLog,
          judgeOutput: processedJudgeData, // For immediate display in modal
          isJudgeLoading: false,
          isJudgeModalOpen: true,
          lastCallPromptTokens: currentCallPromptTokens,
          lastCallCandidatesTokens: currentCallCandidatesTokens,
          lastCallTotalTokens: currentCallTotalTokens,
          promptTokensUsed: prev.promptTokensUsed + currentCallPromptTokens,
          candidatesTokensUsed: prev.candidatesTokensUsed + currentCallCandidatesTokens,
          totalTokensUsed: prev.totalTokensUsed + currentCallTotalTokens,
          historicalDebates: updatedHistoricalDebates, // Update state with modified history list
        };
      });

    } catch (error) {
      console.error("Gemini API error (Judge Comments):", error);
      const errorMessage = `获取评委点评失败: ${error instanceof Error ? error.message : String(error)}`;
      setDebateState(prev => ({ 
        ...prev, 
        isJudgeLoading: false, 
        judgeErrorMessage: errorMessage, 
        isJudgeModalOpen: true,
        lastCallPromptTokens: 0, 
        lastCallCandidatesTokens: 0,
        lastCallTotalTokens: 0,
      }));
    }
  }, [debateState.topic, debateState.debateLog, getEffectiveApiKey, debateState.currentDebateId, debateState.historicalDebates]);

  const handleCloseJudgeModal = () => {
    setDebateState(prev => ({ ...prev, isJudgeModalOpen: false, judgeErrorMessage: null }));
  };

  const currentApiKeySource = () => {
    if (debateState.userApiKey && debateState.userApiKey.trim() !== '') {
      return <span className="text-green-400">用户提供的密钥</span>;
    }
    if (envApiKey) {
      return <span className="text-sky-400">应用内置密钥</span>;
    }
    return <span className="text-red-400">无可用密钥</span>;
  };

  const renderDebateLog = () => {
    let proRoundCounter = 0;
    let conRoundCounter = 0;

    return debateState.debateLog.map(arg => {
      let currentArgRound: number | undefined = undefined;
      const argTimestamp = new Date(arg.timestamp); 
      const currentArgument = {...arg, timestamp: argTimestamp};

      if (arg.speaker === SpeakerRole.PRO) {
        proRoundCounter++;
        currentArgRound = proRoundCounter;
      } else if (arg.speaker === SpeakerRole.CON) {
        conRoundCounter++;
        currentArgRound = conRoundCounter;
      }

      return (
        <ArgumentCard 
          key={arg.id} 
          argument={currentArgument} 
          isUserArgument={debateState.gameMode === GameMode.HUMAN_VS_AI && arg.speaker === debateState.humanSpeakerRole && arg.isUserArgument}
          humanPlayerRole={debateState.humanSpeakerRole}
          roundNumber={currentArgRound}
        />
      );
    });
  };

  const formatJudgeOutputToMarkdown = (data: JudgeOutput): string => {
    let judgeMd = "";
    if (data.roundSummaries && data.roundSummaries.length > 0) {
      judgeMd += "### 各轮总结\n\n";
      data.roundSummaries.forEach(rs => {
        judgeMd += `- **第 ${rs.roundNumber} 轮:** ${rs.summary}\n`;
      });
      judgeMd += "\n---\n\n";
    }

    judgeMd += `### 总体总结\n\n${data.overallSummary}\n\n---\n\n`;
    
    judgeMd += "### 双方评分\n\n";
    const scoreDimensionLabelsMd: Record<keyof ScoreDimensions, string> = {
      contentAndArgumentation: '内容与论证',
      expressionAndTechnique: '表达与技巧',
      reactionAndAdaptability: '反应与应变',
      presence: '气场',
    };

    const formatScoresMd = (role: SpeakerRole, scoresData: typeof data.proScores | typeof data.conScores) => {
      let scoreText = `#### ${role} 得分:\n`;
      if (scoresData && scoresData.dimensions) {
        for (const key in scoreDimensionLabelsMd) {
          const K = key as keyof ScoreDimensions;
          scoreText += `- ${scoreDimensionLabelsMd[K]}: ${scoresData.dimensions[K] !== undefined ? scoresData.dimensions[K].toFixed(1) : 'N/A'} / 100\n`;
        }
        scoreText += `- **平均分: ${scoresData.average !== undefined ? scoresData.average.toFixed(1) : 'N/A'} / 100**\n`;
      } else {
        scoreText += "- 无评分数据\n";
      }
      return scoreText + "\n";
    };

    judgeMd += formatScoresMd(SpeakerRole.PRO, data.proScores);
    judgeMd += formatScoresMd(SpeakerRole.CON, data.conScores);
    return judgeMd;
  };


  const handleDownloadMarkdown = () => {
    const { topic, debateLog, humanSpeakerRole, gameMode, promptTokensUsed, candidatesTokensUsed, totalTokensUsed, viewingHistoricalDebateId, currentDebateId, judgeOutput } = debateState;
    
    let effectiveTopic = topic;
    let effectiveLog = debateLog;
    let effectivePromptTokens = promptTokensUsed;
    let effectiveCandidatesTokens = candidatesTokensUsed;
    let effectiveTotalTokens = totalTokensUsed;
    let effectiveJudgeOutput = judgeOutput; // Use current judgeOutput from state first

    // If viewingHistoricalDebateId is set (meaning we loaded one, even if we continued it via currentDebateId)
    // or if currentDebateId points to a historical entry, fetch its latest snapshot.
    const idToFetch = viewingHistoricalDebateId || currentDebateId;
    if (idToFetch) {
        const historicalEntry = debateState.historicalDebates.find(h => h.id === idToFetch);
        if (historicalEntry) {
            effectiveTopic = historicalEntry.topic;
            effectiveLog = historicalEntry.debateLog.map(arg => ({...arg, timestamp: new Date(arg.timestamp)}));
            effectivePromptTokens = historicalEntry.finalPromptTokensUsed;
            effectiveCandidatesTokens = historicalEntry.finalCandidatesTokensUsed;
            effectiveTotalTokens = historicalEntry.finalTotalTokensUsed;
            effectiveJudgeOutput = historicalEntry.judgeOutputSnapshot || judgeOutput; // Prioritize historical snapshot if available
        }
    }


    let markdownContent = `# 辩论总结: ${effectiveTopic || '无辩题'}\n\n---\n\n`;
    
    markdownContent += `## Token 使用情况 (整场辩论)\n\n`;
    markdownContent += `- Prompt Tokens (总计): ${effectivePromptTokens}\n`;
    markdownContent += `- Completion Tokens (总计): ${effectiveCandidatesTokens}\n`;
    markdownContent += `- Total Tokens (总计): ${effectiveTotalTokens}\n\n---\n\n`;

    markdownContent += "## 辩论记录\n\n---\n\n";
    let mdProRound = 0;
    let mdConRound = 0;
    
    // Find judge comment within the log being used for MD generation
    let judgeCommentInLog = effectiveLog.find(arg => arg.speaker === SpeakerRole.SYSTEM && arg.judgeCommentData);

    effectiveLog.forEach(arg => {
      const argTimestamp = new Date(arg.timestamp); 
      if (arg.speaker === SpeakerRole.SYSTEM && arg.judgeCommentData) {
        // This ensures the judge comment from the log is used if present
        markdownContent += `\n## 评委点评 (记录于 ${argTimestamp.toLocaleTimeString('zh-CN')})\n\n---\n\n`;
        markdownContent += formatJudgeOutputToMarkdown(arg.judgeCommentData);
        markdownContent += "\n---\n\n"; 
      } else if (arg.speaker === SpeakerRole.SYSTEM) {
        markdownContent += `**系统消息 (${argTimestamp.toLocaleTimeString('zh-CN')}):**\n${arg.content}\n\n---\n\n`;
      } else {
        let roundNumText = "";
        if (arg.speaker === SpeakerRole.PRO) roundNumText = ` (第 ${++mdProRound} 轮)`;
        if (arg.speaker === SpeakerRole.CON) roundNumText = ` (第 ${++mdConRound} 轮)`;
        
        let speakerDisplayName = `${arg.speaker}${roundNumText}`;
        if (gameMode === GameMode.HUMAN_VS_AI && arg.speaker === humanSpeakerRole && arg.isUserArgument) {
          speakerDisplayName += " (你)";
        }
        
        markdownContent += `### ${speakerDisplayName} - ${argTimestamp.toLocaleTimeString('zh-CN')}\n\n`;
        markdownContent += `${arg.content}\n\n---\n\n`;
      }
    });
    
    // If there's an `effectiveJudgeOutput` (e.g. from current state or historical snapshot) 
    // AND it wasn't already part of the `effectiveLog` (judgeCommentInLog is falsy), then add it.
    if (effectiveJudgeOutput && !judgeCommentInLog) {
        markdownContent += `\n## 评委点评 (最新/快照)\n\n---\n\n`;
        markdownContent += formatJudgeOutputToMarkdown(effectiveJudgeOutput);
        markdownContent += "\n---\n\n";
    }


    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `辩论总结-${effectiveTopic.replace(/[^\w\s一-龥]/gi, '_') || '无辩题'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleLoadHistoricalDebate = (id: string) => {
    const entry = debateState.historicalDebates.find(e => e.id === id);
    if (!entry) {
      setDebateState(prev => ({...prev, errorMessage: "无法加载该历史记录。"}));
      return;
    }

    const effectiveApiKey = getEffectiveApiKey();
    let newProChatInstance: Chat | null = null;
    let newConChatInstance: Chat | null = null;
    let chatInitError: string | null = null;

    // Determine if AI chat will be needed for the next step based on loaded state
    let aiChatNeededForNextStep = false;
    if (entry.gameMode === GameMode.AI_VS_AI) {
        aiChatNeededForNextStep = true; // AI always speaks next or is first in AIvAI
    } else if (entry.gameMode === GameMode.HUMAN_VS_AI && entry.currentSpeakerNext === SpeakerRole.CON) {
        aiChatNeededForNextStep = true; // AI (CON) is next to speak
    }

    if (aiChatNeededForNextStep && !effectiveApiKey) {
        chatInitError = "API 密钥未配置，AI无法继续交互。您可以查看记录或获取评委点评（若之前已保存）。";
    } else if (effectiveApiKey) {
        const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
        try {
            if (entry.gameMode === GameMode.AI_VS_AI) {
                newProChatInstance = ai.chats.create({
                    model: GEMINI_MODEL_NAME,
                    config: { systemInstruction: SYSTEM_INSTRUCTION_PRO(entry.topic) }
                });
                newConChatInstance = ai.chats.create({
                    model: GEMINI_MODEL_NAME,
                    config: { systemInstruction: SYSTEM_INSTRUCTION_CON(entry.topic) }
                });
            } else if (entry.gameMode === GameMode.HUMAN_VS_AI) {
                newConChatInstance = ai.chats.create({ // Human is PRO, AI is CON
                    model: GEMINI_MODEL_NAME,
                    config: { systemInstruction: SYSTEM_INSTRUCTION_CON(entry.topic) }
                });
            }
        } catch (error) {
            console.error("Error re-initializing chat for loaded debate:", error);
            chatInitError = `重新初始化AI聊天会话失败: ${error instanceof Error ? error.message : String(error)}. AI无法继续。`;
            newProChatInstance = null;
            newConChatInstance = null;
        }
    }

    setDebateState(prev => ({
      ...prev,
      topic: entry.topic,
      isDebateActive: true, 
      proChat: newProChatInstance,
      conChat: newConChatInstance,
      debateLog: entry.debateLog.map(arg => ({...arg, timestamp: new Date(arg.timestamp)})), 
      currentSpeakerToTalk: entry.currentSpeakerNext, 
      turnCount: entry.finalTurnCount,
      isLoading: false, // Not loading anymore
      errorMessage: chatInitError || null, // Show error from chat init if any
      judgeOutput: entry.judgeOutputSnapshot, 
      isJudgeModalOpen: false,
      judgeErrorMessage: null,
      gameMode: entry.gameMode,
      humanSpeakerRole: entry.humanSpeakerRole,
      isHumanTurn: entry.gameMode === GameMode.HUMAN_VS_AI && entry.currentSpeakerNext === entry.humanSpeakerRole,
      humanInput: '',
      promptTokensUsed: entry.finalPromptTokensUsed, 
      candidatesTokensUsed: entry.finalCandidatesTokensUsed,
      totalTokensUsed: entry.finalTotalTokensUsed,
      lastCallPromptTokens: 0, 
      lastCallCandidatesTokens: 0,
      lastCallTotalTokens: 0,
      showHistoryView: false, 
      showApiKeySettings: false,
      viewingHistoricalDebateId: entry.id, // Mark that we loaded this from history
      currentDebateId: entry.id, // Set currentDebateId to ensure saving updates this entry
    }));
    setInputTopic(entry.topic); 
  };

  const handleDeleteHistoricalDebate = (id: string) => {
    // Capture details of the entry to be deleted *before* modifying the historicalDebates list.
    const entryToDelete = debateState.historicalDebates.find(entry => entry.id === id);

    const updatedHistory = debateState.historicalDebates.filter(entry => entry.id !== id);

    // Check if any entry was actually removed.
    if (updatedHistory.length === debateState.historicalDebates.length) {
      setDebateState(prev => ({ ...prev, errorMessage: `未能找到ID为 "${id}" 的历史记录进行删除。请刷新页面后重试。` }));
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_DEBATE_HISTORY_KEY, JSON.stringify(updatedHistory));
    
    // Determine if the deleted entry was the one currently active or being viewed.
    // This check is done on the state *before* `setDebateState` is called for this deletion.
    const wasActiveOrViewedDebateDeleted = debateState.viewingHistoricalDebateId === id || debateState.currentDebateId === id;

    setDebateState(prev => {
      // Re-check based on `prev` state for accuracy within the updater function.
      const isActiveOrViewedDebateDeletedInPrev = prev.viewingHistoricalDebateId === id || prev.currentDebateId === id;
      
      let stateUpdateFields: Partial<DebateState>;

      if (isActiveOrViewedDebateDeletedInPrev) {
        // If the active/viewed debate is deleted, reset relevant parts of the state,
        // preserve API key settings, use the updated historical debates list,
        // and ensure the UI stays on (or returns to) the history view.
        stateUpdateFields = {
          ...initialState, // Start with a full reset to default values
          userApiKey: prev.userApiKey, // Preserve current API key
          apiKeyInput: prev.apiKeyInput, // Preserve current API key input value
          historicalDebates: updatedHistory, // Use the new, filtered list
          isTokenDisplayMinimized: prev.isTokenDisplayMinimized, // Preserve UI preference
          showHistoryView: true, // Remain on/return to the history view
          errorMessage: "历史记录已删除。", 
          // All other fields (topic, isDebateActive, chats, debateLog, etc.) are reset by ...initialState
        };
      } else {
        // If the deleted debate was not the one currently active or being viewed,
        // only update the list of historical debates and show a confirmation message.
        stateUpdateFields = {
          historicalDebates: updatedHistory,
          errorMessage: "历史记录已删除。",
        };
      }
      
      return {
        ...prev, // Apply all properties from the previous state
        ...stateUpdateFields, // Override with the calculated specific updates
      };
    });

    // If the deleted debate was active/viewed and its topic was in the main input field, clear the input field.
    // `handleResetDebate` normally calls `setInputTopic('')`.
    // If `wasActiveOrViewedDebateDeleted` is true, the state was reset using `initialState`,
    // which clears `debateState.topic`. We also need to clear `inputTopic`.
    if (wasActiveOrViewedDebateDeleted && entryToDelete && inputTopic === entryToDelete.topic) {
        setInputTopic('');
    }
  };

  const handleToggleTokenDisplay = () => {
    setDebateState(prev => ({ ...prev, isTokenDisplayMinimized: !prev.isTokenDisplayMinimized }));
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-neutral-light flex flex-col items-center p-4 sm:p-8 selection:bg-sky-500 selection:text-white">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 py-2">
          {APP_TITLE}
        </h1>
        {debateState.isDebateActive && debateState.topic && (
          <p className="mt-2 text-xl text-slate-300">
            {debateState.viewingHistoricalDebateId && <span className="text-yellow-400">[历史继续] </span>}
            当前辩题: <span className="font-semibold text-sky-300">{debateState.topic}</span>
            {debateState.gameMode === GameMode.HUMAN_VS_AI && debateState.humanSpeakerRole && (
              <span className="text-lg ml-2 text-purple-300">(您是: {debateState.humanSpeakerRole})</span>
            )}
          </p>
        )}
      </header>

      {!debateState.gameMode && !debateState.showApiKeySettings && !debateState.showHistoryView && (
        <div className="w-full max-w-lg p-6 sm:p-8 bg-slate-800 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold text-center text-slate-200 mb-6">选择辩论模式</h2>
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => handleSetGameMode(GameMode.AI_VS_AI)}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-150 ease-in-out text-lg"
            >
              🤖 AI vs. AI 🤖
            </button>
            <button
              onClick={() => handleSetGameMode(GameMode.HUMAN_VS_AI)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-150 ease-in-out text-lg"
            >
              👤 人机对战 🤖
            </button>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
             <button
              onClick={handleToggleHistoryView}
              className="flex-1 text-slate-300 hover:text-sky-300 transition-colors py-2 px-4 rounded-md border border-slate-600 hover:border-sky-500 text-sm"
            >
              📜 查看历史辩题
            </button>
            <button
              onClick={toggleApiKeySettings}
              className="flex-1 text-slate-300 hover:text-sky-300 transition-colors py-2 px-4 rounded-md border border-slate-600 hover:border-sky-500 text-sm"
            >
              ⚙️ 设置 API 密钥
            </button>
          </div>
        </div>
      )}
      
      {debateState.showHistoryView && (
        <div className="w-full max-w-xl p-6 sm:p-8 bg-slate-800 rounded-xl shadow-2xl">
            <button 
                onClick={() => setDebateState(prev => ({...prev, showHistoryView: false, errorMessage: null }))}
                className="text-sm text-sky-400 hover:text-sky-300 mb-6"
            >
                &larr; 返回主菜单
            </button>
            <h2 className="text-2xl font-semibold text-center text-slate-200 mb-6">历史辩题记录</h2>
            {debateState.historicalDebates.length === 0 ? (
                <p className="text-slate-400 text-center py-6">暂无历史记录。</p>
            ) : (
                <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                    {debateState.historicalDebates.map(entry => (
                        <HistoricalTopicCard 
                            key={entry.id} 
                            entry={entry} 
                            onLoad={handleLoadHistoricalDebate}
                            onDelete={handleDeleteHistoricalDebate}
                        />
                    ))}
                </div>
            )}
        </div>
      )}


      {debateState.showApiKeySettings && !debateState.gameMode && !debateState.showHistoryView && (
         <div className="w-full max-w-lg p-6 sm:p-8 bg-slate-800 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold text-center text-slate-200 mb-6">API 密钥设置</h2>
          <p className="text-sm text-slate-400 mb-1">当前使用: {currentApiKeySource()}</p>
          <textarea
            value={debateState.apiKeyInput}
            onChange={handleApiKeyInputChange}
            placeholder="输入您的 Google Gemini API 密钥 (可选)"
            rows={2}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors placeholder-slate-500 text-neutral-light mb-3"
            aria-label="API密钥输入框"
          />
          <p className="text-xs text-slate-500 mb-4">
            如果留空，将尝试使用应用内置的 API 密钥。输入您自己的密钥以使用您的配额。密钥将保存在您的浏览器本地。
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSaveApiKey}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
            >
              保存密钥
            </button>
            {debateState.userApiKey && (
              <button
                onClick={handleClearApiKey}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
              >
                清除已存密钥
              </button>
            )}
          </div>
          <button
            onClick={() => setDebateState(prev => ({...prev, showApiKeySettings: false, errorMessage: null }))}
            className="mt-6 w-full text-slate-400 hover:text-sky-300 transition-colors py-2 px-4 rounded-md border border-slate-600 hover:border-sky-500"
          >
            返回选择模式
          </button>
        </div>
      )}


      {debateState.gameMode && !debateState.isDebateActive && !debateState.showHistoryView && (
        <div className="w-full max-w-lg p-6 sm:p-8 bg-slate-800 rounded-xl shadow-2xl">
          <button 
            onClick={() => setDebateState(prev => ({...prev, gameMode: null, errorMessage: null, showApiKeySettings: false, showHistoryView: false}))}
            className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          >
            &larr; 返回选择模式
          </button>
          <label htmlFor="topicInput" className="block text-lg font-medium text-slate-300 mb-2">
            输入辩论题目 ({debateState.gameMode === GameMode.AI_VS_AI ? "AI vs. AI" : "人机对战"}):
          </label>
          <textarea
            id="topicInput"
            value={inputTopic}
            onChange={(e) => {
              if (e.target.value.length <= MAX_INPUT_LENGTH) {
                setInputTopic(e.target.value);
              }
            }}
            placeholder="例如：人工智能对人类社会的利大于弊"
            rows={3}
            maxLength={MAX_INPUT_LENGTH}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors placeholder-slate-500 text-neutral-light"
            aria-label="辩论题目输入框"
          />
          <div className="text-xs text-slate-400 text-right mt-1 pr-1">
            {inputTopic.length} / {MAX_INPUT_LENGTH}
          </div>
          <button
            onClick={handleInitializeDebate}
            disabled={!inputTopic.trim() || debateState.isLoading}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-lg"
          >
            {debateState.isLoading && <LoadingSpinner size="h-6 w-6 mr-2" />}
            开始辩论
          </button>
           <p className="text-xs text-slate-500 mt-4 text-center">
            当前 API 密钥来源: {currentApiKeySource()}
          </p>
        </div>
      )}
      
      {debateState.isDebateActive && !debateState.showHistoryView && (
        <div className="w-full max-w-3xl">
          <div 
            ref={debateLogRef} 
            className="h-[55vh] max-h-[calc(100vh-400px)] sm:max-h-[calc(100vh-380px)] overflow-y-auto p-4 bg-slate-800/70 backdrop-blur-sm rounded-xl shadow-inner border border-slate-700 mb-6 scroll-smooth"
            aria-live="polite"
          >
            {debateState.debateLog.length === 0 && !debateState.isLoading && (
              <p className="text-center text-slate-400 py-10">辩论即将开始...</p>
            )}
            {renderDebateLog()}
            {debateState.isLoading && debateState.currentSpeakerToTalk !== SpeakerRole.SYSTEM && (
               debateState.gameMode === GameMode.AI_VS_AI || (debateState.gameMode === GameMode.HUMAN_VS_AI && !debateState.isHumanTurn)
            ) && (
              <div className="flex items-center justify-center p-4 my-2 text-slate-400">
                <LoadingSpinner size="h-6 w-6 mr-3" />
                <span>{debateState.currentSpeakerToTalk === SpeakerRole.CON && debateState.gameMode === GameMode.HUMAN_VS_AI ? `AI (${SpeakerRole.CON})` : debateState.currentSpeakerToTalk} 正在思考...</span>
              </div>
            )}
          </div>

          {debateState.gameMode === GameMode.HUMAN_VS_AI && debateState.isHumanTurn && (
            <div className="mb-4">
              <textarea
                ref={humanInputRef}
                value={debateState.humanInput}
                onChange={handleHumanInputChange}
                placeholder={`您 (${debateState.humanSpeakerRole}) 的发言... (最多 ${MAX_INPUT_LENGTH} 字)`}
                rows={4}
                maxLength={MAX_INPUT_LENGTH}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors placeholder-slate-500 text-neutral-light mb-1"
                aria-label="您的发言输入框"
                disabled={debateState.isLoading}
              />
              <div className="text-xs text-slate-400 text-right mb-2 pr-1">
                {debateState.humanInput.length} / {MAX_INPUT_LENGTH}
              </div>
              <button
                onClick={handleHumanSubmitArgument}
                disabled={!debateState.humanInput.trim() || debateState.isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-lg"
              >
                 {/* No spinner here as submit is instant, loading is for AI's turn */}
                提交发言
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {debateState.gameMode === GameMode.AI_VS_AI && (
              <button
                onClick={handleNextTurn}
                disabled={debateState.isLoading || debateState.isJudgeLoading || debateState.isHumanTurn /* Should always be false in AIvAI but good for safety */ || debateState.currentSpeakerToTalk === SpeakerRole.SYSTEM}
                className="col-span-2 sm:col-span-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {debateState.isLoading && debateState.currentSpeakerToTalk !== SpeakerRole.SYSTEM && <LoadingSpinner size="h-6 w-6 mr-2" />}
                {getAiVsAiButtonText()}
              </button>
            )}
             {/* Placeholder for spacing in human mode if AI vs AI button not shown. Adjust grid as needed. */}
             {debateState.gameMode === GameMode.HUMAN_VS_AI && <div className="hidden sm:block sm:col-span-1"></div>}


            <button
              onClick={handleFetchJudgeComments}
              disabled={debateState.isLoading || debateState.isJudgeLoading || debateState.debateLog.filter(arg=> arg.speaker !== SpeakerRole.SYSTEM).length < 1}
              className="col-span-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="获取评委点评"
            >
              评委点评
            </button>
             <button
              onClick={handleDownloadMarkdown}
              disabled={debateState.isLoading || debateState.isJudgeLoading || debateState.debateLog.filter(arg => arg.speaker !== SpeakerRole.SYSTEM).length < 1}
              className="col-span-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="下载Markdown总结"
            >
              下载 .md
            </button>
            <button
              onClick={handleResetDebate}
              disabled={debateState.isLoading || debateState.isJudgeLoading}
              className="col-span-2 sm:col-span-1 bg-slate-600 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-150 ease-in-out text-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {/* Text changes based on whether it's a new debate or a loaded historical one being exited */}
              {debateState.currentDebateId && debateState.isDebateActive ? '退出并保存' : '返回主菜单'}
            </button>
          </div>
        </div>
      )}

      {debateState.isDebateActive && !debateState.showHistoryView && (
        <div 
          className={`fixed bottom-4 left-4 bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg shadow-md text-xs text-slate-300 z-30 transition-all duration-300 ease-in-out ${
            debateState.isTokenDisplayMinimized ? 'max-h-12 overflow-hidden' : 'max-h-96' 
          }`}
          aria-live="polite"
        >
          <button
            onClick={handleToggleTokenDisplay}
            className="w-full flex justify-between items-center text-left mb-1 cursor-pointer hover:bg-slate-700/50 p-1 -mx-1 -mt-1 rounded focus:outline-none"
            aria-expanded={!debateState.isTokenDisplayMinimized}
            aria-controls="token-details"
            title={debateState.isTokenDisplayMinimized ? "展开Token详情" : "收起Token详情"}
          >
            <h4 className="font-semibold text-slate-200 text-sm">Token 使用情况:</h4>
            <span className="text-xl text-sky-400 leading-none">
              {debateState.isTokenDisplayMinimized ? '⊕' : '⊖'} 
            </span>
          </button>
          {!debateState.isTokenDisplayMinimized && (
            <div id="token-details" className="mt-2">
              <div className="mb-1.5">
                <p className="text-slate-200 underline decoration-sky-500 decoration-1 underline-offset-2">本次消耗:</p>
                <p>Prompt: <span className="font-medium text-sky-400">{debateState.lastCallPromptTokens}</span></p>
                <p>Completion: <span className="font-medium text-green-400">{debateState.lastCallCandidatesTokens}</span></p>
                <p>Total: <span className="font-medium text-purple-400">{debateState.lastCallTotalTokens}</span></p>
              </div>
              <hr className="border-slate-600 my-1.5" />
              <div className="mt-1.5">
                <p className="text-slate-200 underline decoration-teal-500 decoration-1 underline-offset-2">共消耗:</p>
                <p>Prompt: <span className="font-medium text-sky-400">{debateState.promptTokensUsed}</span></p>
                <p>Completion: <span className="font-medium text-green-400">{debateState.candidatesTokensUsed}</span></p>
                <p>Total: <span className="font-medium text-purple-400">{debateState.totalTokensUsed}</span></p>
              </div>
            </div>
          )}
        </div>
      )}

      {debateState.errorMessage && (
        <div 
          className="fixed bottom-4 right-4 max-w-md bg-red-700 text-white p-4 rounded-lg shadow-xl z-50 animate-pulse-once"
          role="alert"
          aria-atomic="true"
        >
          <p className="font-semibold">提示：</p>
          <p>{debateState.errorMessage}</p>
          <button onClick={() => setDebateState(prev => ({...prev, errorMessage: null}))} className="absolute top-1 right-2 text-white text-xl">&times;</button>
        </div>
      )}
      
      {debateState.judgeErrorMessage && !debateState.isJudgeModalOpen && (
         <div 
          className="fixed bottom-16 right-4 max-w-md bg-yellow-600 text-white p-4 rounded-lg shadow-xl z-50 animate-pulse-once"
          role="alert"
          aria-atomic="true"
        >
          <p className="font-semibold">评委提示：</p>
          <p>{debateState.judgeErrorMessage}</p>
          <button onClick={() => setDebateState(prev => ({...prev, judgeErrorMessage: null}))} className="absolute top-1 right-2 text-white text-xl">&times;</button>
        </div>
      )}
      <style>{`
        .animate-pulse-once {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 1;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(45, 55, 72, 0.5); /* slate-700 with opacity */
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4A5568; /* gray-600 from tailwind config neutral-medium */
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #718096; /* gray-500 */
        }
      `}</style>

      <JudgeModal
        isOpen={debateState.isJudgeModalOpen}
        onClose={handleCloseJudgeModal}
        judgeData={debateState.judgeOutput}
        isLoading={debateState.isJudgeLoading}
        error={debateState.judgeErrorMessage}
        topic={debateState.topic}
      />
    </div>
  );
};

export default App;