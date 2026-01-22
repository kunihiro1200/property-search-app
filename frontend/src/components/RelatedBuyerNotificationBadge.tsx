import React from 'react';

interface RelatedBuyerNotificationBadgeProps {
  count: number;
  onClick: () => void;
}

const RelatedBuyerNotificationBadge: React.FC<RelatedBuyerNotificationBadgeProps> = ({
  count,
  onClick,
}) => {
  if (count === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
      title="関連買主セクションにスクロール"
    >
      <span className="text-sm font-medium text-blue-700">
        関連買主
      </span>
      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full">
        {count}
      </span>
    </button>
  );
};

export default RelatedBuyerNotificationBadge;
