import React, { useMemo } from 'react';
import { X, Storefront, MapPin, Check, Clock } from '@phosphor-icons/react';
import type { Market } from '../../types/market-types';
import styles from './MarketsVisitedModal.module.css';

interface MarketsVisitedModalProps {
  isOpen: boolean;
  markets: Market[];
  onClose: () => void;
}

// Calculate if the market visit is still "fresh" (within frequency period minus 5 days)
const isVisitFresh = (market: Market): boolean => {
  if (!market.lastVisitDate || market.currentVisits === 0) return false;
  
  const frequency = market.frequency || 12; // Default to 12 visits per year
  const daysPerVisit = Math.floor(365 / frequency); // Days between required visits
  const freshnessThreshold = daysPerVisit - 5; // Minus 5 days buffer
  
  const lastVisit = new Date(market.lastVisitDate);
  const today = new Date();
  const daysSinceVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceVisit < freshnessThreshold;
};

// Format date to German format
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Calculate days since last visit
const getDaysSinceVisit = (dateStr: string | undefined): number | null => {
  if (!dateStr) return null;
  const lastVisit = new Date(dateStr);
  const today = new Date();
  return Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
};

export const MarketsVisitedModal: React.FC<MarketsVisitedModalProps> = ({
  isOpen,
  markets,
  onClose
}) => {
  if (!isOpen) return null;

  // Sort markets: unvisited at top, visited at bottom
  // Among visited, sort by freshness (fresh ones grouped, stale ones treated as unvisited)
  const sortedMarkets = useMemo(() => {
    return [...markets].sort((a, b) => {
      const aFresh = isVisitFresh(a);
      const bFresh = isVisitFresh(b);
      
      // Fresh visits go to bottom
      if (aFresh && !bFresh) return 1;
      if (!aFresh && bFresh) return -1;
      
      // Among same category, sort by name
      return a.name.localeCompare(b.name);
    });
  }, [markets]);

  const freshCount = sortedMarkets.filter(m => isVisitFresh(m)).length;
  const pendingCount = sortedMarkets.length - freshCount;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.iconWrapper}>
              <MapPin size={24} weight="duotone" />
            </div>
            <div className={styles.headerInfo}>
              <h2 className={styles.modalTitle}>Meine Märkte</h2>
              <span className={styles.marketCount}>
                {freshCount} von {markets.length} besucht
              </span>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className={styles.statsSummary}>
          <div className={styles.statBadge}>
            <span className={styles.statNumber}>{pendingCount}</span>
            <span className={styles.statText}>Offen</span>
          </div>
          <div className={`${styles.statBadge} ${styles.statBadgeSuccess}`}>
            <span className={styles.statNumber}>{freshCount}</span>
            <span className={styles.statText}>Besucht</span>
          </div>
        </div>

        {/* Markets List */}
        <div className={styles.marketsList}>
          {sortedMarkets.map((market) => {
            const isFresh = isVisitFresh(market);
            const daysSince = getDaysSinceVisit(market.lastVisitDate);
            
            return (
              <div 
                key={market.id} 
                className={`${styles.marketCard} ${isFresh ? styles.marketCardVisited : ''}`}
              >
                <div className={styles.marketIcon}>
                  <Storefront size={18} weight="fill" />
                </div>
                <div className={styles.marketInfo}>
                  <span className={styles.marketName}>{market.name}</span>
                  <span className={styles.marketMeta}>
                    {market.chain} • {market.city}
                  </span>
                </div>
                <div className={styles.marketStatus}>
                  {isFresh ? (
                    <div className={styles.visitedBadge}>
                      <Check size={12} weight="bold" />
                      <span>Besucht</span>
                    </div>
                  ) : market.currentVisits && market.currentVisits > 0 ? (
                    <div className={styles.staleBadge}>
                      <Clock size={12} weight="fill" />
                      <span>{daysSince}d</span>
                    </div>
                  ) : (
                    <div className={styles.pendingBadge}>
                      <span>Offen</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className={styles.footerInfo}>
          <Clock size={14} weight="fill" />
          <span>Besuch gilt als frisch bis {'{Frequenz} - 5 Tage'} nach letztem Besuch</span>
        </div>
      </div>
    </div>
  );
};
