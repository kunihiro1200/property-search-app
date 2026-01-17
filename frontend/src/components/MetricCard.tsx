import React from 'react';
import { ProgressBar } from './ProgressBar';
import { ComparisonIndicator } from './ComparisonIndicator';

interface MetricCardProps {
  title: string;
  currentValue: number;
  monthlyAverage: number;
  target?: number;
  previousYearAverage?: number;
  unit?: string;
  showProgressBar?: boolean;
  children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  currentValue,
  monthlyAverage,
  target,
  previousYearAverage,
  unit = '%',
  showProgressBar = false,
  children,
}) => {
  // 達成度を計算
  const achievementRate = target !== undefined ? (currentValue / target) * 100 : undefined;
  
  // 月平均との差分を計算
  const differenceFromAverage = currentValue - monthlyAverage;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* タイトル行 */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          {target !== undefined && (
            <>
              <span className="text-xs text-gray-500">（目標: {target}{unit}）</span>
              {achievementRate !== undefined && (
                <span className="text-xs font-semibold text-blue-600">
                  達成度: {achievementRate.toFixed(1)}%
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* メイン数値行 */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm text-gray-600">当月：</span>
          <span className="text-2xl font-bold text-gray-900">
            {currentValue.toFixed(1)}{unit}
          </span>
          <span className="text-sm text-gray-600">
            （月平均{monthlyAverage.toFixed(1)}{unit}）
          </span>
          {Math.abs(differenceFromAverage) > 0.5 && (
            <span className={`text-sm font-semibold ${
              differenceFromAverage > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {differenceFromAverage > 0 ? '+' : ''}{differenceFromAverage.toFixed(1)}{unit}
            </span>
          )}
        </div>
      </div>

      {/* プログレスバー */}
      {showProgressBar && target !== undefined && (
        <div className="mb-4">
          <ProgressBar current={currentValue} target={target} />
        </div>
      )}

      {/* 前年度平均との比較 */}
      {previousYearAverage !== undefined && (
        <div className="mb-4">
          <ComparisonIndicator
            current={currentValue}
            average={previousYearAverage}
            label="前年度平均"
          />
        </div>
      )}

      {/* 子要素（テーブルなど） */}
      {children && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};
