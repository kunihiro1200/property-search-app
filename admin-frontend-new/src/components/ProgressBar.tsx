import React from 'react';

interface ProgressBarProps {
  current: number;
  target: number;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  showPercentage = true,
}) => {
  // 達成度を計算（0-100%の範囲に制限）
  const percentage = Math.min((current / target) * 100, 100);
  
  // 達成度に応じた色を決定
  const getColorClass = (): string => {
    if (percentage >= 100) {
      return 'bg-green-500';
    } else if (percentage >= 80) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`達成度 ${percentage.toFixed(1)}%`}
        />
      </div>
      {showPercentage && (
        <div className="mt-1 text-xs text-gray-600 text-right">
          達成度: {percentage.toFixed(1)}%
        </div>
      )}
    </div>
  );
};
