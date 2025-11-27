import React from 'react';
import { CaretRight } from '@phosphor-icons/react';
import type { MarketFrequencyAlert } from '../../types/gl-types';
import AnimatedList from './AnimatedList';
import styles from './MarketFrequencyAlerts.module.css';

interface MarketFrequencyAlertsProps {
  alerts: MarketFrequencyAlert[];
  onViewAll?: () => void;
  onMarketClick?: (marketId: string) => void;
}

export const MarketFrequencyAlerts: React.FC<MarketFrequencyAlertsProps> = ({
  alerts,
  onViewAll,
  onMarketClick,
}) => {
  if (alerts.length === 0) {
    return null;
  }

  const alertItems = alerts.map(alert => alert.marketId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Vorschläge für heute</h2>
      </div>

      <AnimatedList
        items={alertItems}
        onItemSelect={(item) => onMarketClick?.(item)}
        showGradients={false}
        enableArrowNavigation={false}
        displayScrollbar={false}
        className={styles.animatedListContainer}
      >
        {(_item, index) => {
          const alert = alerts[index];
          return (
            <button
              className={styles.alertCard}
              onClick={() => onMarketClick?.(alert.marketId)}
              aria-label={`${alert.name} - ${alert.visits.current} von ${alert.visits.required} Besuchen`}
            >
              <div className={styles.marketInfo}>
                <span className={styles.marketName}>{alert.name}</span>
                <span className={styles.marketAddress}>{alert.address}</span>
              </div>

              <span className={styles.lastVisit}>
                {alert.lastVisitWeeks}W
              </span>

              <div className={styles.progressContainer}>
                <ProgressRing
                  current={alert.visits.current}
                  required={alert.visits.required}
                  status={alert.status}
                />
                <CaretRight size={20} weight="bold" className={styles.chevron} />
              </div>
            </button>
          );
        }}
      </AnimatedList>
    </div>
  );
};

interface ProgressRingProps {
  current: number;
  required: number;
  status: 'on-track' | 'at-risk';
}

const ProgressRing: React.FC<ProgressRingProps> = ({ current, required, status }) => {
  const [animatedProgress, setAnimatedProgress] = React.useState(0);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / required, 1);
  const strokeDashoffset = circumference * (1 - animatedProgress);

  const color = status === 'on-track' ? 'var(--color-teal-mid)' : 'var(--color-warning)';

  React.useEffect(() => {
    // Small delay before starting animation
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className={styles.progressRing}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        {/* Background circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="var(--color-stroke)"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className={styles.progressText}>
        <span className={styles.progressValue}>{current}/{required}</span>
      </div>
    </div>
  );
};

