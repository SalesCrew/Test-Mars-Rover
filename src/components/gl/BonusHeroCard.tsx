import React from 'react';
import { Receipt, CalendarCheck, MapPin } from '@phosphor-icons/react';
import type { Bonuses } from '../../types/gl-types';
import styles from './BonusHeroCard.module.css';

interface BonusHeroCardProps {
  bonuses: Bonuses | null;
  isLoading?: boolean;
  onClick?: () => void;
  onMarketsClick?: () => void;
}

export const BonusHeroCard: React.FC<BonusHeroCardProps> = ({ bonuses, isLoading, onClick, onMarketsClick }) => {
  // TEMPORARY: Set to true to show stats (Jahresumsatz, Vorbestellungen, Märkte besucht)
  const SHOW_STATS = true;
  
  const [progressAnimated, setProgressAnimated] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setProgressAnimated(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const sellInsProgress = progressAnimated && bonuses ? (bonuses.sellIns / 60) * 100 : 0;
  const preOrdersProgress = progressAnimated && bonuses ? (bonuses.preOrders / 40) * 100 : 0;
  const marketsProgress = progressAnimated && bonuses ? (bonuses.marketsVisited.current / bonuses.marketsVisited.target) * 100 : 0;

  return (
      <div 
        className={`${styles.bonusHero} ${onClick ? styles.interactive : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
      {/* TEMPORARY: Stats hidden - set SHOW_STATS = true to reinstate */}
      {SHOW_STATS && (
        <>
          <div className={styles.topSection}>
            <span className={styles.label}>Jahresumsatz</span>
            <div className={styles.amountContainer}>
              {isLoading ? (
                <span className={styles.loadingValue}>—</span>
              ) : (
                <span className={styles.amount}>
                  €{bonuses?.yearTotal.toLocaleString('de-DE') ?? '—'}
                </span>
              )}
            </div>
            {!isLoading && bonuses && bonuses.percentageChange !== 0 && (
              <div className={styles.percentageContainer}>
                <span className={`${styles.percentage} ${bonuses.percentageChange >= 0 ? styles.positive : styles.negative}`}>
                  {formatPercentage(bonuses.percentageChange)}
                </span>
                <span className={styles.comparisonText}>vs Agenturdurchschnitt</span>
              </div>
            )}
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                <span className={styles.statIconContainer}>
                  <Receipt size={18} weight="regular" />
                </span>
                {isLoading ? <span className={styles.loadingValueSmall}>—</span> : bonuses?.sellIns ?? '—'}
              </div>
              <div className={styles.statProgress}>
                <div className={styles.statProgressBar} style={{ width: `${sellInsProgress}%` }}></div>
              </div>
              <span className={styles.statLabel}>Vorverkäufe</span>
            </div>

            <div className={styles.stat}>
              <div className={styles.statValue}>
                <span className={styles.statIconContainer}>
                  <CalendarCheck size={18} weight="regular" />
                </span>
                {isLoading ? <span className={styles.loadingValueSmall}>—</span> : bonuses?.preOrders ?? '—'}
              </div>
              <div className={styles.statProgress}>
                <div className={styles.statProgressBar} style={{ width: `${preOrdersProgress}%` }}></div>
              </div>
              <span className={styles.statLabel}>Vorbestellungen</span>
            </div>

            <div 
              className={`${styles.stat} ${onMarketsClick ? styles.statClickable : ''}`}
              onClick={(e) => {
                if (onMarketsClick) {
                  e.stopPropagation();
                  onMarketsClick();
                }
              }}
              role={onMarketsClick ? 'button' : undefined}
              tabIndex={onMarketsClick ? 0 : undefined}
            >
              <div className={styles.statValue}>
                <span className={styles.statIconContainer}>
                  <MapPin size={18} weight="regular" />
                </span>
                {isLoading ? (
                  <span className={styles.loadingValueSmall}>—</span>
                ) : (
                  <>
                    {bonuses?.marketsVisited.current ?? '—'}
                    <span className={styles.statTarget}>/{bonuses?.marketsVisited.target ?? '—'}</span>
                  </>
                )}
              </div>
              <div className={styles.statProgress}>
                <div className={styles.statProgressBar} style={{ width: `${marketsProgress}%` }}></div>
              </div>
              <span className={styles.statLabel}>Märkte besucht</span>
            </div>
          </div>
        </>
      )}
      </div>
  );
};

