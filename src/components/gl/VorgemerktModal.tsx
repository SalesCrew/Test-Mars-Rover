import React, { useState, useEffect } from 'react';
import { X, Clock, Check, CaretDown, CaretUp, ArrowsLeftRight } from '@phosphor-icons/react';
import { produktersatzService } from '../../services/produktersatzService';
import type { PendingEntry } from '../../services/produktersatzService';
import styles from './VorgemerktModal.module.css';

interface VorgemerktModalProps {
  isOpen: boolean;
  glId: string;
  onClose: () => void;
  onFulfill: () => void;
}

export const VorgemerktModal: React.FC<VorgemerktModalProps> = ({
  isOpen,
  glId,
  onClose,
  onFulfill,
}) => {
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!isOpen || !glId) return;
      
      setIsLoading(true);
      try {
        const data = await produktersatzService.getPendingEntries(glId);
        setEntries(data);
      } catch (error) {
        console.error('Error fetching pending entries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [isOpen, glId]);

  const handleFulfill = async (id: string) => {
    if (fulfillingId) return;
    
    setFulfillingId(id);
    try {
      await produktersatzService.fulfillEntry(id);
      // Remove from local list
      setEntries(entries.filter(e => e.id !== id));
      onFulfill();
    } catch (error) {
      console.error('Error fulfilling entry:', error);
      alert('Fehler beim Erfüllen. Bitte versuche es erneut.');
    } finally {
      setFulfillingId(null);
    }
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.iconWrapper}>
              <Clock size={28} weight="duotone" />
            </div>
            <div>
              <h2 className={styles.title}>Vorgemerkte Produkttausch</h2>
              <p className={styles.subtitle}>
                {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'} warten auf Erfüllung
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Lade Einträge...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className={styles.emptyState}>
              <Check size={48} weight="regular" />
              <p>Keine vorgemerkten Produkttausch vorhanden</p>
            </div>
          ) : (
            <div className={styles.entriesList}>
              {entries.map((entry) => {
                const isExpanded = expandedEntry === entry.id;
                const isFulfilling = fulfillingId === entry.id;

                return (
                  <div key={entry.id} className={styles.entryCard}>
                    <div 
                      className={styles.entryHeader}
                      onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    >
                      <div className={styles.entryMarketInfo}>
                        <div className={styles.marketName}>{entry.marketName}</div>
                        <span className={styles.chainPill}>{entry.marketChain}</span>
                      </div>
                      <div className={styles.entrySummary}>
                        <span className={styles.productCount}>
                          {entry.takeOutCount} → {entry.replaceCount} Produkte
                        </span>
                        <span className={styles.entryDate}>{formatDate(entry.createdAt)}</span>
                      </div>
                      <div className={styles.expandIcon}>
                        {isExpanded ? (
                          <CaretUp size={18} weight="bold" />
                        ) : (
                          <CaretDown size={18} weight="bold" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={styles.entryDetails}>
                        <div className={styles.exchangeSection}>
                          <div className={styles.exchangeBox}>
                            <div className={styles.exchangeLabel}>Entnommen</div>
                            <div className={styles.productList}>
                              {entry.takeOutProducts.map((p) => (
                                <div key={p.id} className={styles.productItem}>
                                  <span className={styles.productQuantity}>{p.quantity}×</span>
                                  <span className={styles.productName}>{p.name}</span>
                                  <span className={styles.productPrice}>
                                    {formatPrice(p.price * p.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className={styles.exchangeTotal}>
                              Gesamt: {formatPrice(entry.takeOutValue)}
                            </div>
                          </div>

                          <div className={styles.exchangeArrow}>
                            <ArrowsLeftRight size={20} weight="bold" />
                          </div>

                          <div className={styles.exchangeBox}>
                            <div className={styles.exchangeLabel}>Ersetzt durch</div>
                            <div className={styles.productList}>
                              {entry.replaceProducts.map((p) => (
                                <div key={p.id} className={styles.productItem}>
                                  <span className={styles.productQuantity}>{p.quantity}×</span>
                                  <span className={styles.productName}>{p.name}</span>
                                  <span className={styles.productPrice}>
                                    {formatPrice(p.price * p.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className={styles.exchangeTotal}>
                              Gesamt: {formatPrice(entry.replaceValue)}
                            </div>
                          </div>
                        </div>

                        <button
                          className={`${styles.fulfillButton} ${isFulfilling ? styles.fulfilling : ''}`}
                          onClick={() => handleFulfill(entry.id)}
                          disabled={isFulfilling}
                        >
                          <Check size={18} weight="bold" />
                          {isFulfilling ? 'Erfüllen...' : 'Erfüllen'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
