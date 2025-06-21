
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Argument, SpeakerRole } from '../types';

interface ArgumentCardProps {
  argument: Argument;
  isUserArgument?: boolean;
  humanPlayerRole?: SpeakerRole.PRO | SpeakerRole.CON | null;
  roundNumber?: number; // New prop for round number
}

const ArgumentCard: React.FC<ArgumentCardProps> = ({ argument, isUserArgument, humanPlayerRole, roundNumber }) => {
  const isPro = argument.speaker === SpeakerRole.PRO;
  let cardBgColor = 'bg-slate-700'; // Default for system messages
  let borderColor = 'border-slate-500';
  let textColor = 'text-slate-300';
  let speakerLabelText = argument.speaker === SpeakerRole.SYSTEM ? '系统消息' : argument.speaker;

  if (argument.speaker === SpeakerRole.PRO || argument.speaker === SpeakerRole.CON) {
    cardBgColor = isPro ? 'bg-blue-600/30' : 'bg-red-600/30';
    borderColor = isPro ? 'border-pro' : 'border-con';
    textColor = isPro ? 'text-blue-300' : 'text-red-300';
    speakerLabelText = isPro ? SpeakerRole.PRO : SpeakerRole.CON;

    if (roundNumber) {
      speakerLabelText += ` (第 ${roundNumber} 轮)`;
    }

    if (isUserArgument && argument.speaker === humanPlayerRole) {
      speakerLabelText = `${argument.speaker} (你)${roundNumber ? ` (第 ${roundNumber} 轮)` : ''}`;
    } else if (isUserArgument && humanPlayerRole && argument.speaker !== humanPlayerRole) {
      // This case should ideally not happen if humanPlayerRole is set correctly
      // But if it does, ensure round number is still appended if available
      speakerLabelText = `${argument.speaker}${roundNumber ? ` (第 ${roundNumber} 轮)` : ''}`;
    }
  }


  return (
    <div className={`p-4 rounded-lg shadow-lg mb-4 border-l-4 ${borderColor} ${cardBgColor} transition-all duration-300 ease-in-out transform hover:scale-[1.01]`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-semibold text-lg ${textColor}`}>{speakerLabelText}</h3>
        <span className="text-xs text-slate-400">{argument.timestamp.toLocaleTimeString('zh-CN')}</span>
      </div>
      <div className="text-neutral-light prose prose-sm prose-invert max-w-none 
                      prose-p:mb-2 prose-p:last:mb-0
                      prose-strong:font-semibold
                      prose-em:italic
                      prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-2
                      prose-ol:list-decimal prose-ol:pl-5 prose-ol:mb-2
                      prose-li:mb-1
                      prose-blockquote:pl-4 prose-blockquote:border-l-4 prose-blockquote:border-slate-500 prose-blockquote:italic prose-blockquote:text-slate-400
                      prose-code:bg-slate-700 prose-code:p-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm
                      prose-a:text-sky-400 hover:prose-a:text-sky-300 prose-a:transition-colors">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{argument.content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ArgumentCard;
