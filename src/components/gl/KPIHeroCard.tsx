import React, { useEffect, useState } from 'react';
import { MapPin, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import CountUp from './CountUp';
import type { ChainStats } from '../../types/gl-types';
import styles from './KPIHeroCard.module.css';

interface KPIHeroCardProps {
  chain: 'billa' | 'spar';
  data: ChainStats;
}

export const KPIHeroCard: React.FC<KPIHeroCardProps> = ({ chain, data }) => {
  const [progressAnimated, setProgressAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgressAnimated(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const currentPercentage = Math.round((data.withVorbesteller / data.totalMarkets) * 1000) / 10;
  const progressWidth = progressAnimated ? Math.min(currentPercentage, 100) : 0;
  const isGoalMet = currentPercentage >= data.goalPercentage;
  
  const stillNeeded = Math.max(
    0,
    Math.ceil((data.totalMarkets * data.goalPercentage) / 100) - data.withVorbesteller
  );

  const chainConfig = {
    billa: {
      name: 'BILLA+ DISPLAYS & KARTONWARE',
      overlayClass: styles.billaOverlay,
    },
    spar: {
      name: 'SPAR DISPLAYS & KARTONWARE',
      overlayClass: styles.sparOverlay,
    },
  };

  const config = chainConfig[chain];

  return (
    <div className={styles.heroCard}>
      {/* Chain-specific radial gradient overlay */}
      <div className={`${styles.chainOverlay} ${config.overlayClass}`} />

      {/* Top Section: Percentage Display */}
      <div className={styles.topSection}>
        <span className={styles.chainLabel}>{config.name}</span>
        <div className={styles.percentageContainer}>
          <span className={`${styles.percentage} ${isGoalMet ? styles.percentageSuccess : ''}`}>
            <CountUp from={0} to={currentPercentage} duration={1.5} delay={0.2} />%
          </span>
        </div>
        <span className={styles.goalLabel}>(Ziel: {data.goalPercentage}%)</span>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${isGoalMet ? styles.progressFillComplete : ''}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className={styles.statsGrid}>
        {/* Total Markets */}
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <MapPin size={14} weight="regular" />
          </div>
          <div className={styles.statValue}>
            <CountUp from={0} to={data.totalMarkets} duration={1.2} delay={0.4} />
          </div>
          <span className={styles.statLabel}>Märkte</span>
        </div>

        {/* With Vorbesteller */}
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${isGoalMet ? styles.statIconGreen : styles.statIconBlue}`}>
            <CheckCircle size={14} weight="regular" />
          </div>
          <div className={styles.statValue}>
            <CountUp from={0} to={data.withVorbesteller} duration={1.2} delay={0.5} />
          </div>
          <span className={styles.statLabel}>mit Vorbesteller</span>
          <span className={styles.statSubLabel}>
            ({data.displayCount} Display, {data.kartonwareCount} Kartonware)
          </span>
        </div>

        {/* Still Needed */}
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
            <WarningCircle size={14} weight="regular" />
          </div>
          <div className={styles.statValue}>
            <CountUp from={0} to={stillNeeded} duration={1.2} delay={0.6} />
          </div>
          <span className={styles.statLabel}>fehlen noch</span>
        </div>
      </div>
    </div>
  );
};

