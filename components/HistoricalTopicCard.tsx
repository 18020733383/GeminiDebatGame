import React from 'react';
import { HistoricalDebateEntry, GameMode, SpeakerRole } from '../types';

interface HistoricalTopicCardProps {
  entry: HistoricalDebateEntry;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

const HistoricalTopicCard: React.FC<HistoricalTopicCardProps> = ({ entry, onLoad, onDelete }) => {
  const gameModeText = entry.gameMode === GameMode.AI_VS_AI ? "🤖 AI vs. AI" : "👤 人机对战";
  const hasJudgeCommentary = !!entry.judgeOutputSnapshot;
  const judgeStatusText = hasJudgeCommentary ? "⚖️ 已点评" : "➖ 未点评";
  const judgeStatusColor = hasJudgeCommentary ? "text-green-400" : "text-slate-500";
  
  // Calculate current round based on finalTurnCount (number of arguments)
  // Each pair of arguments (or a single argument if it's the start of a pair) constitutes a round.
  const currentRoundDisplay = entry.finalTurnCount > 0 ? Math.ceil(entry.finalTurnCount / 2) : 0;


  const handleDelete = () => {
    if (window.confirm(`您确定要删除历史记录：“${entry.topic}”吗？此操作无法撤销。`)) {
      onDelete(entry.id);
    }
  };

  const creationDate = new Date(entry.createdAt).toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="bg-slate-700/70 p-4 rounded-lg shadow-lg mb-4 border border-slate-600 hover:shadow-xl transition-shadow duration-200">
      <h3 
        className="text-lg font-semibold text-sky-300 mb-2 truncate"
        title={entry.topic}
      >
        {entry.topic}
      </h3>
      <div className="text-xs text-slate-400 mb-1">
        创建于: {creationDate}
      </div>
      <div className="text-sm text-slate-300 mb-1">
        模式: <span className="font-medium">{gameModeText}</span> | 当前轮次: <span className="font-medium">{currentRoundDisplay}</span>
      </div>
      <div className={`text-sm mb-3 ${judgeStatusColor}`}>
        评委: <span className="font-medium">{judgeStatusText}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-auto">
        <button
          onClick={() => onLoad(entry.id)}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors duration-150"
          aria-label={`加载辩题 ${entry.topic}`}
        >
          加载并继续
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors duration-150"
          aria-label={`删除辩题 ${entry.topic}`}
        >
          删除记录
        </button>
      </div>
    </div>
  );
};

export default HistoricalTopicCard;