import React from 'react';

interface RepresentativeMetricWithAverage {
  representative: string;
  count: number;
  rate: number;
  fiscalYearMonthlyAverage: number;
}

interface RepresentativeTableProps {
  data: RepresentativeMetricWithAverage[];
  showTotal?: boolean;
  totalData?: {
    count: number;
    rate: number;
    fiscalYearMonthlyAverage: number;
  };
}

export const RepresentativeTable: React.FC<RepresentativeTableProps> = ({
  data,
  showTotal = false,
  totalData,
}) => {
  // データを割合の降順にソート
  const sortedData = [...data].sort((a, b) => b.rate - a.rate);

  if (sortedData.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        データなし
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              担当者
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
              件数
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
              割合
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
              月平均
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm text-gray-900">
                {item.representative}
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                {item.count}
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                {item.rate.toFixed(1)}%
              </td>
              <td className="px-4 py-2 text-sm text-gray-600 text-right">
                {item.fiscalYearMonthlyAverage.toFixed(1)}%
              </td>
            </tr>
          ))}
          {showTotal && totalData && (
            <tr className="bg-gray-50 font-bold">
              <td className="px-4 py-2 text-sm text-gray-900">
                合計
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                {totalData.count}
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                {totalData.rate.toFixed(1)}%
              </td>
              <td className="px-4 py-2 text-sm text-gray-600 text-right">
                {totalData.fiscalYearMonthlyAverage.toFixed(1)}%
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
