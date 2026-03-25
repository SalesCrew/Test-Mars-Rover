import React, { useState, useEffect } from 'react';
import { Calendar, TrendUp, Storefront, User, Tag, Package, CaretDown, CaretUp } from '@phosphor-icons/react';
import styles from './VorverkaufAdminPage.module.css';
import { vorverkaufService, type VorverkaufEntry } from '../../services/vorverkaufService';

// Props now simplified - no wave creation needed
interface VorverkaufAdminPageProps {
  isCreateWelleModalOpen?: boolean;
  onCloseCreateWelleModal?: () => void;
  onOpenCreateWelleModal?: () => void;
}

export const VorverkaufAdminPage: React.FC<VorverkaufAdminPageProps> = () => {
  // State for entries list
  const [entries, setEntries] = useState<VorverkaufEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Expanded entry state
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Load entries from API
  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const allEntries = await vorverkaufService.getAllEntries();
      setEntries(allEntries.filter(e => (e.reason as string) !== 'Produkttausch'));
    } catch (error) {
      console.error('Error loading vorverkauf entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  // Format date for entries
  const formatEntryDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Vienna'
    }).format(date);
  };

  // Reason labels and colors
  const reasonColors: Record<string, { bg: string; text: string }> = {
    'OOS': { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626' },
    'Listungslücke': { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706' },
    'Platzierung': { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563EB' }
  };

  if (isLoading) {
    return (
      <div className={styles.vorverkaufPage}>
        <div className={styles.emptyPageState}>
          <div className={styles.spinner} style={{ width: 48, height: 48 }} />
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.vorverkaufPage}>
      {/* Empty State */}
      {entries.length === 0 && (
        <div className={styles.emptyPageState}>
          <TrendUp size={64} weight="regular" />
          <h3>Keine Vorverkauf-Einträge vorhanden</h3>
          <p>Gebietsleiter können Vorverkäufe direkt in der App eintragen.</p>
        </div>
      )}

      {/* Entries Section */}
      {entries.length > 0 && (
        <div className={styles.submissionsSection}>
          <h2 className={styles.sectionTitle}>Vorverkauf Einträge</h2>
          
          {/* Quick Stats */}
          <div className={styles.submissionStats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{entries.length}</span>
              <span className={styles.statLabel}>Einträge</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {new Set(entries.map(e => e.glId)).size}
              </span>
              <span className={styles.statLabel}>GLs aktiv</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {new Set(entries.map(e => e.marketId)).size}
              </span>
              <span className={styles.statLabel}>Märkte</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {entries.reduce((sum, e) => sum + e.totalItems, 0)}
              </span>
              <span className={styles.statLabel}>Produkte</span>
            </div>
          </div>

          {/* Entries List */}
          <div className={styles.submissionsList}>
            {entries.map(entry => (
              <div 
                key={entry.id} 
                className={`${styles.submissionCard} ${expandedEntryId === entry.id ? styles.submissionCardExpanded : ''}`}
                onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
              >
                <div className={styles.submissionHeader}>
                  <div className={styles.submissionMain}>
                    <div className={styles.submissionGL}>
                      <User size={16} weight="bold" />
                      <span>{entry.glName}</span>
                    </div>
                    <div className={styles.submissionMarket}>
                      <Storefront size={16} />
                      <span className={styles.marketChain}>{entry.marketChain}</span>
                      <span className={styles.marketName}>{entry.marketName}</span>
                    </div>
                  </div>
                  
                  <div className={styles.submissionMeta}>
                    <span 
                      className={styles.reasonBadge}
                      style={{ 
                        backgroundColor: reasonColors[entry.reason]?.bg || 'rgba(107, 114, 128, 0.1)',
                        color: reasonColors[entry.reason]?.text || '#6B7280'
                      }}
                    >
                      <Tag size={12} weight="bold" />
                      {entry.reason}
                    </span>
                    <span className={styles.productCount}>
                      <Package size={14} />
                      {entry.totalItems} Artikel
                    </span>
                    <span className={styles.submissionDate}>
                      <Calendar size={14} />
                      {formatEntryDate(entry.createdAt)}
                    </span>
                    <span className={styles.expandIcon}>
                      {expandedEntryId === entry.id ? <CaretUp size={16} /> : <CaretDown size={16} />}
                    </span>
                  </div>
                </div>

                {/* Expanded Products List */}
                {expandedEntryId === entry.id && (
                  <div className={styles.submissionProducts}>
                    <div className={styles.productsHeader}>
                      <span>Produkt</span>
                      <span>Typ</span>
                      <span>Menge</span>
                    </div>
                    {entry.items.map(item => (
                      <div key={item.id} className={styles.productRow}>
                        <div className={styles.productInfo}>
                          <span className={styles.productName}>{item.productName}</span>
                          <span className={styles.productDetails}>
                            {item.productBrand} {item.productSize && ` · ${item.productSize}`}
                          </span>
                        </div>
                        <span className={styles.itemTypeBadge}>
                          {item.itemType === 'replace' ? 'Ersatz' : 'Rausnehmen'}
                        </span>
                        <span className={styles.productQuantity}>{item.quantity}x</span>
                      </div>
                    ))}
                    {entry.notes && (
                      <div className={styles.submissionNotes}>
                        <strong>Notiz:</strong> {entry.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
