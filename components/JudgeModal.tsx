
import React from 'react';
import { JudgeOutput, SpeakerRole, ScoreDimensions } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ProgressBar from './ProgressBar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface JudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  judgeData: JudgeOutput | null;
  isLoading: boolean;
  error: string | null;
  topic: string;
}

const scoreDimensionLabels: Record<keyof ScoreDimensions, string> = {
  contentAndArgumentation: '内容与论证',
  expressionAndTechnique: '表达与技巧',
  reactionAndAdaptability: '反应与应变',
  presence: '气场',
};

const JudgeModal: React.FC<JudgeModalProps> = ({ isOpen, onClose, judgeData, isLoading, error, topic }) => {
  if (!isOpen) return null;

  const proDimensions = judgeData?.proScores?.dimensions;
  const conDimensions = judgeData?.conScores?.dimensions;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="judgeModalTitle"
    >
      <div 
        className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto text-neutral-light border border-slate-700 relative transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-appear"
        onClick={(e) => e.stopPropagation()} 
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-200 transition-colors text-3xl leading-none p-1 z-10"
          aria-label="关闭评委点评"
        >
          &times;
        </button>

        <h2 id="judgeModalTitle" className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-1 text-center">
          评委点评与打分
        </h2>
        <p className="text-center text-slate-400 mb-6 text-sm sm:text-base">辩题：{topic || "未指定"}</p>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-60">
            <LoadingSpinner size="h-12 w-12" />
            <p className="mt-4 text-slate-300">评委正在紧张点评中...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center text-red-300 bg-red-900/40 p-4 rounded-md my-4">
            <p className="font-semibold text-red-200">获取点评时遇到问题：</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && !judgeData && (
           <div className="text-center text-slate-400 py-10">
            <p>暂无评委数据。</p>
          </div>
        )}

        {judgeData && !isLoading && !error && (
          <>
            {judgeData.roundSummaries && judgeData.roundSummaries.length > 0 && (
              <section className="mb-6">
                <h3 className="text-xl font-semibold text-sky-300 mb-3 border-b border-slate-700 pb-2">各轮总结</h3>
                <ul className="space-y-3 pl-1">
                  {judgeData.roundSummaries.map((round) => (
                    <li key={round.roundNumber} className="text-sm p-3 bg-slate-700/60 rounded-lg shadow">
                      <strong className="text-slate-200">第 {round.roundNumber} 轮：</strong>
                      <span className="text-slate-300">{round.summary}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mb-6">
              <h3 className="text-xl font-semibold text-sky-300 mb-3 border-b border-slate-700 pb-2">总体总结</h3>
              <div className="text-slate-300 p-3 bg-slate-700/60 rounded-lg shadow prose prose-sm prose-invert max-w-none 
                                prose-p:my-1 prose-p:text-slate-300 
                                prose-strong:text-slate-200
                                prose-headings:text-sky-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{judgeData.overallSummary}</ReactMarkdown>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-sky-300 mb-4 border-b border-slate-700 pb-2">双方评分</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pro Scores */}
                <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-700/50 shadow-md">
                  <h4 className="text-lg font-semibold text-blue-300 mb-3 text-center">{SpeakerRole.PRO} 得分</h4>
                  {proDimensions && Object.keys(scoreDimensionLabels).map((key) => (
                    <ProgressBar
                      key={key}
                      label={scoreDimensionLabels[key as keyof ScoreDimensions]}
                      value={proDimensions[key as keyof ScoreDimensions] || 0}
                      colorClass="bg-pro"
                    />
                  ))}
                  <div className="mt-4 pt-3 border-t border-blue-700/50 text-center">
                    <span className="text-md font-semibold text-blue-300">平均分：</span>
                    <span className="text-lg font-bold text-blue-200">{(judgeData.proScores?.average || 0).toFixed(1)} / 100</span>
                  </div>
                </div>

                {/* Con Scores */}
                <div className="p-4 bg-red-900/30 rounded-lg border border-red-700/50 shadow-md">
                  <h4 className="text-lg font-semibold text-red-300 mb-3 text-center">{SpeakerRole.CON} 得分</h4>
                  {conDimensions && Object.keys(scoreDimensionLabels).map((key) => (
                    <ProgressBar
                      key={key}
                      label={scoreDimensionLabels[key as keyof ScoreDimensions]}
                      value={conDimensions[key as keyof ScoreDimensions] || 0}
                      colorClass="bg-con"
                    />
                  ))}
                  <div className="mt-4 pt-3 border-t border-red-700/50 text-center">
                    <span className="text-md font-semibold text-red-300">平均分：</span>
                    <span className="text-lg font-bold text-red-200">{(judgeData.conScores?.average || 0).toFixed(1)} / 100</span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
         <style>
          {`
            @keyframes modal-appear-animation {
              0% { transform: scale(0.95) translateY(10px); opacity: 0; }
              100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            .animate-modal-appear {
              animation: modal-appear-animation 0.2s ease-out forwards;
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default JudgeModal;
