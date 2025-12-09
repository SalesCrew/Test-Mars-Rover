import React from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { TimeframeOption } from '../../types/gl-types';
import styles from './TimeframeSelector.module.css';

interface TimeframeSelectorProps {
  currentTimeframe: string;
  selectedOption: 'current' | '3months' | 'year';
  options: TimeframeOption[];
  onOptionChange: (optionId: 'current' | '3months' | 'year') => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  currentTimeframe,
  selectedOption,
  options,
  onOptionChange,
  onNavigatePrevious,
  onNavigateNext,
  canNavigatePrevious,
  canNavigateNext,
}) => {
  const showNavigation = selectedOption === 'current';

  return (
    <div className={styles.selector}>
      <div className={styles.navigation}>
        {showNavigation && (
          <button
            className={styles.arrowButton}
            onClick={onNavigatePrevious}
            disabled={!canNavigatePrevious}
            aria-label="Vorherige Welle"
          >
            <CaretLeft size={20} weight="bold" />
          </button>
        )}
        
        <div className={styles.currentWelle}>
          {currentTimeframe}
        </div>

        {showNavigation && (
          <button
            className={styles.arrowButton}
            onClick={onNavigateNext}
            disabled={!canNavigateNext}
            aria-label="Nächste Welle"
          >
            <CaretRight size={20} weight="bold" />
          </button>
        )}
      </div>

      <div className={styles.options}>
        {options.map((option) => (
          <button
            key={option.id}
            className={`${styles.option} ${selectedOption === option.id ? styles.optionSelected : ''}`}
            onClick={() => onOptionChange(option.id as 'current' | '3months' | 'year')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};





