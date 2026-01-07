import React from 'react';
import { TrendUp, Storefront, Package } from '@phosphor-icons/react';
import styles from './GLChainCard.module.css';

interface GLChainCardProps {
  chainName: string;
  chainColor: string;
  goalType?: 'percentage' | 'value';
  currentPercentage?: number;
  goalPercentage?: number;
  currentValue?: number;
  goalValue?: number;
  totalValue?: number;
  totalMarkets: number;
  marketsWithProgress: number;
}

export const GLChainCard: React.FC<GLChainCardProps> = ({
  chainName,
  chainColor,
  goalType = 'percentage',
  currentPercentage = 0,
  goalPercentage = 80,
  currentValue = 0,
  goalValue = 0,
  totalValue = 0,
  totalMarkets = 0,
  marketsWithProgress = 0,
}) => {
  // Ensure values are numbers and not undefined/null
  const safeCurrentPercentage = currentPercentage ?? 0;
  const safeGoalPercentage = goalPercentage ?? 80;
  const safeCurrentValue = currentValue ?? 0;
  // For value-based goals: use totalValue (sum of all item values) as the goal target
  const safeTargetValue = (totalValue ?? 0) || (goalValue ?? 0);
  const safeTotalMarkets = totalMarkets ?? 0;
  const safeMarketsWithProgress = marketsWithProgress ?? 0;

  // Calculate progress based on goal type
  const isValueBased = goalType === 'value';
  
  let progressWidth = 0;
  let goalMet = false;
  
  if (isValueBased) {
    progressWidth = safeTargetValue > 0 
      ? Math.min(100, (safeCurrentValue / safeTargetValue) * 100) 
      : 0;
    goalMet = safeCurrentValue >= safeTargetValue;
  } else {
    progressWidth = safeGoalPercentage > 0 
      ? Math.min(100, (safeCurrentPercentage / safeGoalPercentage) * 100) 
      : 0;
    goalMet = safeCurrentPercentage >= safeGoalPercentage;
  }
  
  const remaining = Math.max(0, Math.ceil((safeTotalMarkets * safeGoalPercentage) / 100) - safeMarketsWithProgress);

  return (
    <div className={styles.card}>
      {/* Chain Badge */}
      <div className={styles.header}>
        <div className={styles.chainBadge} style={{ background: chainColor }}>
          {chainName}
        </div>
        {goalMet && (
          <div className={styles.goalBadge}>
            <TrendUp size={12} weight="bold" />
            <span>Erreicht</span>
          </div>
        )}
      </div>

      {/* Main Value Display */}
      <div className={styles.mainDisplay}>
        {isValueBased ? (
          <>
            <span className={`${styles.value} ${goalMet ? styles.valueSuccess : ''}`}>
              €{safeCurrentValue.toLocaleString('de-DE')}
            </span>
            <span className={styles.goal}>von €{safeTargetValue.toLocaleString('de-DE')}</span>
          </>
        ) : (
          <>
            <span className={`${styles.value} ${goalMet ? styles.valueSuccess : ''}`}>
              {safeCurrentPercentage.toFixed(1)}%
            </span>
            <span className={styles.goal}>von {safeGoalPercentage.toFixed(0)}%</span>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressBar} ${goalMet ? styles.progressSuccess : ''}`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {/* Metrics Row */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <Storefront size={14} weight="fill" className={styles.metricIcon} />
          <div className={styles.metricContent}>
            <span className={styles.metricValue}>{safeTotalMarkets}</span>
            <span className={styles.metricLabel}>Märkte</span>
          </div>
        </div>
        <div className={styles.metric}>
          <Package size={14} weight="fill" className={styles.metricIcon} />
          <div className={styles.metricContent}>
            <span className={styles.metricValue}>{safeMarketsWithProgress}</span>
            <span className={styles.metricLabel}>Bearbeitet</span>
          </div>
        </div>
        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconWarning}`}>
            <span className={styles.remainingIcon}>!</span>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricValue}>{remaining}</span>
            <span className={styles.metricLabel}>Offen</span>
          </div>
        </div>
      </div>
    </div>
  );
};
