import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonIndicatorProps {
  current: number;
  average: number;
  label: string;
}

export const ComparisonIndicator: React.FC<ComparisonIndicatorProps> = ({
  current,
  average,
  label,
}) => {
  // 差分を計算
  const difference = current - average;
  const threshold = 0.5;

  // アイコンと色を決定
  const getIconAndColor = () => {
    if (difference > threshold) {
      return {
        icon: <TrendingUp className="w-4 h-4" />,
        colorClass: 'text-green-600',
        bgClass: 'bg-green-50',
      };
    } else if (difference < -threshold) {
      return {
        icon: <TrendingDown className="w-4 h-4" />,
        colorClass: 'text-red-600',
        bgClass: 'bg-red-50',
      };
    } else {
      return {
        icon: <Minus className="w-4 h-4" />,
        colorClass: 'text-gray-600',
        bgClass: 'bg-gray-50',
      };
    }
  };

  const { icon, colorClass, bgClass } = getIconAndColor();

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${bgClass}`}>
      <div className={colorClass}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-600">{label}</span>
        <span className={`text-sm font-semibold ${colorClass}`}>
          {average.toFixed(1)}%
        </span>
      </div>
      {Math.abs(difference) > threshold && (
        <span className={`text-xs ${colorClass} ml-auto`}>
          {difference > 0 ? '+' : ''}{difference.toFixed(1)}%
        </span>
      )}
    </div>
  );
};
