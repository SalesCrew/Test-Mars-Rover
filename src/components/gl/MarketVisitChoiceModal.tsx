import React from 'react';
import { CalendarBlank, Storefront, ArrowClockwise, Clock, Info } from '@phosphor-icons/react';
import styles from './MarketVisitChoiceModal.module.css';

interface MarketVisitChoiceModalProps {
  isOpen: boolean;
  marketName: string;
  lastVisitDate: string; // ISO date string (e.g., "2026-01-15")
  onCreateNewVisit: () => void;
  onCountToExisting: () => void;
  onClose: () => void;
}

// Format date from ISO to German format (e.g., "15. Januar 2026")
const formatDateGerman = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('de-DE', options);
};

// Calculate days since last visit
const getDaysSince = (dateStr: string): number => {
  if (!dateStr) return 0;
  const lastVisit = new Date(dateStr);
  const today = new Date();
  const diffTime = today.getTime() - lastVisit.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const MarketVisitChoiceModal: React.FC<MarketVisitChoiceModalProps> = ({
  isOpen,
  marketName,
  lastVisitDate,
  onCreateNewVisit,
  onCountToExisting,
  onClose
}) => {
  if (!isOpen) return null;

  const formattedDate = formatDateGerman(lastVisitDate);
  const daysSince = getDaysSince(lastVisitDate);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.iconWrapper}>
            <CalendarBlank size={28} weight="duotone" />
          </div>
          <div className={styles.headerInfo}>
            <h2 className={styles.modalTitle}>Marktbesuch</h2>
            <span className={styles.marketName}>
              <Storefront size={14} weight="fill" />
              {marketName}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {/* Last Visit Info */}
          <div className={styles.lastVisitInfo}>
            <Clock size={18} weight="fill" />
            <span>
              Letzter Besuch am <strong>{formattedDate}</strong>
              <span className={styles.daysBadge}>vor {daysSince} {daysSince === 1 ? 'Tag' : 'Tagen'}</span>
            </span>
          </div>

          {/* Question */}
          <p className={styles.questionText}>
            Soll diese Aktion als neuer Besuch gezählt werden, oder zum letzten Besuch hinzugefügt werden?
          </p>

          {/* Info Box */}
          <div className={styles.infoBox}>
            <Info size={18} weight="fill" />
            <span>
              Neue Besuche zählen zu deinem Frequenz-Ziel. Wähle "Zum letzten Besuch", wenn du noch im selben Besuch bist.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          <button 
            className={styles.secondaryButton}
            onClick={onCountToExisting}
          >
            <Clock size={18} weight="bold" />
            Zum letzten Besuch
          </button>
          <button 
            className={styles.primaryButton}
            onClick={onCreateNewVisit}
          >
            <ArrowClockwise size={18} weight="bold" />
            Neuer Besuch
          </button>
        </div>
      </div>
    </div>
  );
};
