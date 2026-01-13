import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowsLeftRight, Package, Clock } from '@phosphor-icons/react';
import styles from './ExchangeSuccessModal.module.css';

interface ExchangeSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketName: string;
  removedProductsCount: number;
  replacementProductsCount: number;
  totalValue: number;
  userName: string;
  isPending?: boolean;
}

export const ExchangeSuccessModal: React.FC<ExchangeSuccessModalProps> = ({
  isOpen,
  onClose,
  marketName,
  removedProductsCount,
  replacementProductsCount,
  totalValue,
  userName,
  isPending = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={`${styles.modal} ${isAnimating ? styles.modalAnimated : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon */}
        <div className={styles.iconContainer}>
          {isPending ? (
            <Clock size={72} weight="fill" className={styles.pendingIcon} />
          ) : (
            <CheckCircle size={72} weight="fill" className={styles.successIcon} />
          )}
        </div>

        {/* Title */}
        <div className={styles.titleSection}>
          <h2 className={styles.title}>
            {isPending ? `Perfekt, ${userName}!` : `Perfekt gemacht, ${userName}!`}
          </h2>
          <p className={styles.subtitle}>
            {isPending 
              ? 'Dein Produkttausch wurde vorgemerkt' 
              : 'Dein Produkttausch wurde erfolgreich dokumentiert'
            }
          </p>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Package size={20} weight="fill" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{removedProductsCount}</div>
              <div className={styles.statLabel}>Entnommen</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <ArrowsLeftRight size={20} weight="fill" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{replacementProductsCount}</div>
              <div className={styles.statLabel}>Ersetzt</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <CheckCircle size={20} weight="fill" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{formatPrice(totalValue)}</div>
              <div className={styles.statLabel}>Warenwert</div>
            </div>
          </div>
        </div>

        {/* Market Info */}
        <div className={styles.marketSection}>
          <h3 className={styles.sectionTitle}>Markt</h3>
          <div className={styles.marketCard}>
            <div className={styles.marketName}>{marketName}</div>
            <div className={isPending ? styles.marketBadgePending : styles.marketBadge}>
              {isPending ? 'Vorgemerkt' : 'Dokumentiert'}
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className={styles.messageSection}>
          <p className={styles.message}>
            {isPending
              ? 'Du kannst den Tausch später erfüllen, wenn die Produkte verfügbar sind. Weiter so!'
              : 'Der Tausch wurde erfasst und ist sofort in deinem Dashboard sichtbar. Weiter so!'
            }
          </p>
        </div>

        {/* Close Button */}
        <button className={styles.closeButton} onClick={onClose}>
          Zurück zum Dashboard
        </button>
      </div>
    </div>
  );
};

