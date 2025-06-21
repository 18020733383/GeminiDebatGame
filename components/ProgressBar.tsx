
import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  label: string;
  colorClass?: string; // e.g., 'bg-blue-500'
  max?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  colorClass = 'bg-sky-500',
  max = 100,
}) => {
  const percentage = max > 0 ? (Number(value) / max) * 100 : 0;

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm font-medium text-slate-300">
          {(Number(value) || 0).toFixed(1)} / {max}
        </span>
      </div>
      <div className="w-full bg-slate-600 rounded-full h-2.5 Pdark:bg-slate-700 overflow-hidden">
        <div
          className={`${colorClass} h-2.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={Number(value) || 0}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label} score`}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
