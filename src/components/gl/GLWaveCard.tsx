import React from 'react';
import { CalendarBlank, Package, CheckCircle } from '@phosphor-icons/react';
import styles from './GLWaveCard.module.css';

interface GLWaveCardProps {
  name: string;
  startDate: string;
  endDate: string;
  displayCount: number;
  displayTarget: number;
  kartonwareCount: number;
  kartonwareTarget: number;
  isFinished?: boolean;
}

export const GLWaveCard: React.FC<GLWaveCardProps> = ({
  name,
  startDate,
  endDate,
  displayCount,
  displayTarget,
  kartonwareCount,
  kartonwareTarget,
  isFinished = false,
}) => {
  const totalItems = displayCount + kartonwareCount;
  const totalTargets = displayTarget + kartonwareTarget;
  const overallProgress = totalTargets > 0 
    ? Math.min(100, Math.round((totalItems / totalTargets) * 100 * 10) / 10) 
    : 0;
  const goalMet = overallProgress >= 100;

  return (
    <div className={`${styles.card} ${isFinished ? styles.cardFinished : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <CalendarBlank size={18} weight="duotone" />
        </div>
        <div className={styles.headerInfo}>
          <h3 className={styles.waveName}>{name}</h3>
          <span className={styles.dateRange}>{startDate} - {endDate}</span>
        </div>
        <div className={`${styles.statusBadge} ${isFinished ? styles.statusFinished : styles.statusActive}`}>
          {isFinished && <CheckCircle size={12} weight="fill" />}
          <span>{isFinished ? 'Fertig' : 'Aktiv'}</span>
        </div>
      </div>

      {/* Progress Display */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={`${styles.progressValue} ${goalMet ? styles.progressValueSuccess : ''}`}>
            {overallProgress}%
          </span>
          <span className={styles.progressLabel}>abgeschlossen</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressBar} ${goalMet ? styles.progressSuccess : ''}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Item Counts */}
      <div className={styles.itemsRow}>
        <div className={styles.itemGroup}>
          <Package size={14} weight="fill" className={styles.itemIcon} />
          <div className={styles.itemInfo}>
            <span className={styles.itemCount}>{displayCount}/{displayTarget}</span>
            <span className={styles.itemLabel}>Displays</span>
          </div>
        </div>
        <div className={styles.itemDivider} />
        <div className={styles.itemGroup}>
          <Package size={14} weight="fill" className={styles.itemIcon} />
          <div className={styles.itemInfo}>
            <span className={styles.itemCount}>{kartonwareCount}/{kartonwareTarget}</span>
            <span className={styles.itemLabel}>Kartonware</span>
          </div>
        </div>
      </div>
    </div>
  );
};
