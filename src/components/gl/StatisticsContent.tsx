import React, { useState } from 'react';
import { TimeframeSelector } from './TimeframeSelector';
import { KPIHeroCard } from './KPIHeroCard';
import { wellenData, threeMonthsAverage, oneYearAverage, timeframeOptions } from '../../data/statisticsData';
import type { WelleData } from '../../types/gl-types';
import styles from './StatisticsContent.module.css';

export const StatisticsContent: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<'current' | '3months' | 'year'>('current');
  const [selectedWelleIndex, setSelectedWelleIndex] = useState<number>(0);

  // Determine current data based on selected option
  const getCurrentData = (): WelleData => {
    switch (selectedOption) {
      case 'current':
        return wellenData[selectedWelleIndex];
      case '3months':
        return threeMonthsAverage;
      case 'year':
        return oneYearAverage;
      default:
        return wellenData[0];
    }
  };

  const currentData = getCurrentData();

  // Navigation handlers
  const handleNavigatePrevious = () => {
    if (selectedWelleIndex < wellenData.length - 1) {
      setSelectedWelleIndex(selectedWelleIndex + 1);
    }
  };

  const handleNavigateNext = () => {
    if (selectedWelleIndex > 0) {
      setSelectedWelleIndex(selectedWelleIndex - 1);
    }
  };

  const canNavigatePrevious = selectedWelleIndex < wellenData.length - 1;
  const canNavigateNext = selectedWelleIndex > 0;

  // Option change handler
  const handleOptionChange = (optionId: 'current' | '3months' | 'year') => {
    setSelectedOption(optionId);
    // Reset to current welle when switching back to current mode
    if (optionId === 'current') {
      setSelectedWelleIndex(0);
    }
  };

  return (
    <div className={styles.statisticsContent}>
      <TimeframeSelector
        currentTimeframe={currentData.name}
        selectedOption={selectedOption}
        options={timeframeOptions}
        onOptionChange={handleOptionChange}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        canNavigatePrevious={canNavigatePrevious}
        canNavigateNext={canNavigateNext}
      />

      <div className={styles.cardsContainer}>
        <KPIHeroCard chain="billa" data={currentData.billaPlus} key={`billa-${currentData.id}`} />
        <KPIHeroCard chain="spar" data={currentData.spar} key={`spar-${currentData.id}`} />
      </div>
    </div>
  );
};





