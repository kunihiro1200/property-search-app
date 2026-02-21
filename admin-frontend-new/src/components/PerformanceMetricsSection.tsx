import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { MetricCard } from './MetricCard';
import { RepresentativeTable } from './RepresentativeTable';

interface RepresentativeMetric {
  representative: string;
  count: number;
  rate: number;
}

interface RepresentativeMetricWithAverage extends RepresentativeMetric {
  fiscalYearMonthlyAverage: number;
}

interface EnhancedPerformanceMetrics {
  month: string;
  visitAppraisalRate: {
    currentValue: number;
    fiscalYearMonthlyAverage: number;
    target: 28;
  };
  exclusiveContracts: {
    byRepresentative: RepresentativeMetricWithAverage[];
    total: {
      count: number;
      rate: number;
      fiscalYearMonthlyAverage: number;
      target: 48;
    };
  };
  competitorLossUnvisited: {
    currentValue: number;
    fiscalYearMonthlyAverage: number;
    previousYearMonthlyAverage: number;
  };
  competitorLossVisited: {
    byRepresentative: RepresentativeMetricWithAverage[];
    total: {
      count: number;
      rate: number;
      fiscalYearMonthlyAverage: number;
      previousYearMonthlyAverage: number;
    };
  };
}

export const PerformanceMetricsSection: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [metrics, setMetrics] = useState<EnhancedPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [selectedMonth]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/sellers/performance-metrics?month=${selectedMonth}`);
      setMetrics(response.data);
    } catch (err) {
      console.error('Failed to fetch performance metrics:', err);
      setError('実績データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">実績</h2>
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">実績</h2>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">実績</h2>
        <div className="text-center py-8 text-gray-500">データがありません</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">実績</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="month-select" className="text-sm font-medium text-gray-700">
            月選択:
          </label>
          <input
            id="month-select"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* レスポンシブグリッドレイアウト */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
        {/* 訪問査定取得割合 */}
        <MetricCard
          title="訪問査定取得割合"
          currentValue={metrics.visitAppraisalRate.currentValue}
          monthlyAverage={metrics.visitAppraisalRate.fiscalYearMonthlyAverage}
          target={metrics.visitAppraisalRate.target}
          showProgressBar={true}
        />

        {/* 専任件数（専任割合） */}
        <MetricCard
          title="専任件数（専任割合）"
          currentValue={metrics.exclusiveContracts.total.rate}
          monthlyAverage={metrics.exclusiveContracts.total.fiscalYearMonthlyAverage}
          target={metrics.exclusiveContracts.total.target}
          showProgressBar={true}
        >
          <div className="text-sm text-gray-700 mb-2">
            合計: {metrics.exclusiveContracts.total.count}件
          </div>
          <RepresentativeTable
            data={metrics.exclusiveContracts.byRepresentative}
            showTotal={false}
          />
        </MetricCard>

        {/* 他決割合（未訪問） */}
        <MetricCard
          title="他決割合（未訪問）"
          currentValue={metrics.competitorLossUnvisited.currentValue}
          monthlyAverage={metrics.competitorLossUnvisited.fiscalYearMonthlyAverage}
          previousYearAverage={metrics.competitorLossUnvisited.previousYearMonthlyAverage}
        />

        {/* 他決割合（訪問済み） */}
        <MetricCard
          title="他決割合（訪問済み）"
          currentValue={metrics.competitorLossVisited.total.rate}
          monthlyAverage={metrics.competitorLossVisited.total.fiscalYearMonthlyAverage}
          previousYearAverage={metrics.competitorLossVisited.total.previousYearMonthlyAverage}
        >
          <div className="text-sm text-gray-700 mb-2">
            合計: {metrics.competitorLossVisited.total.count}件
          </div>
          <RepresentativeTable
            data={metrics.competitorLossVisited.byRepresentative}
            showTotal={false}
          />
        </MetricCard>
      </div>
    </div>
  );
};
