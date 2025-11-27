import React, { useEffect, useState } from 'react';
import { CheckCircle, MapPin, Clock, TrendUp, Check } from '@phosphor-icons/react';
import { AnimatedListWrapper } from './AnimatedListWrapper';
import styles from './TourCompletionModal.module.css';

interface TourCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedMarkets: string[];
  marketNames: { id: string; name: string }[];
  startTime: Date;
  endTime: Date;
  userName: string;
}

export const TourCompletionModal: React.FC<TourCompletionModalProps> = ({
  isOpen,
  onClose,
  completedMarkets,
  marketNames,
  startTime,
  endTime,
  userName,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalTime = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
  const hours = Math.floor(totalTime / 60);
  const minutes = totalTime % 60;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={`${styles.modal} ${isAnimating ? styles.modalAnimated : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon */}
        <div className={styles.iconContainer}>
          <CheckCircle size={72} weight="fill" className={styles.successIcon} />
        </div>

        {/* Title */}
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Hervorragende Arbeit, {userName}!</h2>
          <p className={styles.subtitle}>Deine Tour wurde erfolgreich abgeschlossen</p>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <MapPin size={20} weight="fill" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{completedMarkets.length}</div>
              <div className={styles.statLabel}>Märkte besucht</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Clock size={20} weight="fill" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`}
              </div>
              <div className={styles.statLabel}>Gesamtdauer</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <TrendUp size={20} weight="fill" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{formatTime(startTime)} - {formatTime(endTime)}</div>
              <div className={styles.statLabel}>Zeitraum</div>
            </div>
          </div>
        </div>

        {/* Markets List */}
        <div className={styles.marketsSection}>
          <h3 className={styles.sectionTitle}>Besuchte Märkte</h3>
          <div className={styles.marketsList}>
            <AnimatedListWrapper delay={60}>
              {completedMarkets.map((marketId, index) => {
                const market = marketNames.find(m => m.id === marketId);
                if (!market) return null;
                
                return (
                  <div key={marketId} className={styles.marketItem}>
                    <div className={styles.marketCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.marketNumber}>{index + 1}</div>
                    <div className={styles.marketName}>{market.name}</div>
                  </div>
                );
              }).filter((item): item is React.ReactElement => item !== null)}
            </AnimatedListWrapper>
          </div>
        </div>

        {/* Close Button */}
        <button className={styles.closeButton} onClick={onClose}>
          Zurück zum Dashboard
        </button>
      </div>
    </div>
  );
};

