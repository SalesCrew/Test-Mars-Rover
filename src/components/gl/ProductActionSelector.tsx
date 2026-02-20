import React from 'react';
import { ArrowsLeftRight, Gift, X } from '@phosphor-icons/react';
import styles from './ProductActionSelector.module.css';

interface ProductActionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProdukttausch: () => void;
  onSelectNaraIncentive: () => void;
}

export const ProductActionSelector: React.FC<ProductActionSelectorProps> = ({
  isOpen,
  onClose,
  onSelectProdukttausch,
  onSelectNaraIncentive
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Was möchtest du tun?</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className={styles.cards}>
          <button className={styles.card} onClick={onSelectProdukttausch}>
            <div className={styles.cardIcon}>
              <ArrowsLeftRight size={32} weight="duotone" />
            </div>
            <span className={styles.cardTitle}>Produkttausch</span>
            <span className={styles.cardSubtitle}>Ersatzprodukte berechnen</span>
          </button>

          <button className={`${styles.card} ${styles.cardNara}`} onClick={onSelectNaraIncentive}>
            <div className={`${styles.cardIcon} ${styles.cardIconNara}`}>
              <Gift size={32} weight="duotone" />
            </div>
            <span className={styles.cardTitle}>NARA-Incentive</span>
            <span className={styles.cardSubtitle}>Produkte an Markt vergeben</span>
          </button>
        </div>
      </div>
    </div>
  );
};
