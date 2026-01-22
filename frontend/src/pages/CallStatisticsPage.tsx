import React from 'react';
import { CallStatistics } from '../components/CallStatistics';

export const CallStatisticsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <CallStatistics />
    </div>
  );
};

export default CallStatisticsPage;
