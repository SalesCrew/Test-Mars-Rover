import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { X, Storefront, MapPin, Check, Clock, CaretLeft, Package, ArrowsLeftRight, ShoppingCart, Spinner, CalendarBlank } from '@phosphor-icons/react';
import type { Market } from '../../types/market-types';
import { API_BASE_URL } from '../../config/database';
import styles from './MarketsVisitedModal.module.css';

interface MarketsVisitedModalProps {
  isOpen: boolean;
  markets: Market[];
  userId: string;
  onClose: () => void;
}

interface Activity {
  id: string;
  type: 'vorbesteller' | 'vorverkauf' | 'produkttausch' | 'marktbesuch';
  date: string;
  glName: string;
  glId: string | null;
  details: any;
}

interface VisitGroup {
  date: string;
  label: string;
  activities: Activity[];
}

const isVisitFresh = (market: Market): boolean => {
  if (!market.lastVisitDate || market.currentVisits === 0) return false;
  const frequency = market.frequency || 12;
  const daysPerVisit = Math.floor(365 / frequency);
  const freshnessThreshold = daysPerVisit - 5;
  const lastVisit = new Date(market.lastVisitDate);
  const today = new Date();
  const daysSinceVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceVisit < freshnessThreshold;
};

const getDaysSinceVisit = (dateStr: string | undefined): number | null => {
  if (!dateStr) return null;
  const lastVisit = new Date(dateStr);
  const today = new Date();
  return Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
};

const getExpectedVisitsToDate = (frequency: number): number => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return Math.round((frequency / 365) * dayOfYear);
};

const MiniProgressRing: React.FC<{ current: number; required: number }> = ({ current, required }) => {
  const expected = getExpectedVisitsToDate(required);
  const isOnTrack = current >= expected;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / required, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const color = isOnTrack ? '#10B981' : '#F59E0B';

  return (
    <div className={styles.miniRing}>
      <svg width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={radius} fill="none" stroke="rgba(226,232,240,0.6)" strokeWidth="2.5" />
        <circle
          cx="19" cy="19" r={radius} fill="none"
          stroke={color} strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 19 19)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className={styles.miniRingText} style={{ color }}>{current}/{required}</span>
    </div>
  );
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const groupByVisitDate = (activities: Activity[]): VisitGroup[] => {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = new Date(a.date).toISOString().split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  const groups: VisitGroup[] = [];
  for (const [date, acts] of map) {
    groups.push({
      date,
      label: formatDate(date),
      activities: acts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });
  }
  groups.sort((a, b) => b.date.localeCompare(a.date));
  return groups;
};

export const MarketsVisitedModal: React.FC<MarketsVisitedModalProps> = ({
  isOpen,
  markets,
  userId,
  onClose
}) => {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [history, setHistory] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedMarket(null);
      setHistory([]);
    }
  }, [isOpen]);

  const fetchHistory = useCallback(async (marketId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/markets/${marketId}/history?gl_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching market history:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleMarketClick = useCallback((market: Market) => {
    setSelectedMarket(market);
    fetchHistory(market.id);
  }, [fetchHistory]);

  const handleBack = useCallback(() => {
    setSelectedMarket(null);
    setHistory([]);
  }, []);

  const sortedMarkets = useMemo(() => [...markets].sort((a, b) => {
    const aFresh = isVisitFresh(a);
    const bFresh = isVisitFresh(b);
    if (aFresh && !bFresh) return 1;
    if (!aFresh && bFresh) return -1;
    return a.name.localeCompare(b.name);
  }), [markets]);

  const freshCount = sortedMarkets.filter(m => isVisitFresh(m)).length;
  const pendingCount = sortedMarkets.length - freshCount;

  const visitGroups = useMemo(() => groupByVisitDate(history), [history]);
  const submissionGroups = useMemo(() => {
    return visitGroups.map(g => ({
      ...g,
      activities: g.activities.filter(a => a.type !== 'marktbesuch')
    }));
  }, [visitGroups]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {!selectedMarket ? (
          <>
            {/* List View Header */}
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

            <div className={styles.marketsList}>
              {sortedMarkets.map((market) => {
                const isFresh = isVisitFresh(market);
                const daysSince = getDaysSinceVisit(market.lastVisitDate);
                return (
                  <div
                    key={market.id}
                    className={`${styles.marketCard} ${isFresh ? styles.marketCardVisited : ''}`}
                    onClick={() => handleMarketClick(market)}
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
                    <div className={styles.marketStatusArea}>
                      <MiniProgressRing current={market.currentVisits || 0} required={market.frequency || 12} />
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
                  </div>
                );
              })}
            </div>

            <div className={styles.footerInfo}>
              <Clock size={14} weight="fill" />
              <span>Besuch gilt als frisch bis {'Frequenz - 5 Tage'} nach letztem Besuch</span>
            </div>
          </>
        ) : (
          <>
            {/* Detail View */}
            <div className={styles.detailHeader}>
              <button className={styles.backButton} onClick={handleBack}>
                <CaretLeft size={18} weight="bold" />
              </button>
              <div className={styles.detailHeaderInfo}>
                <h2 className={styles.detailTitle}>{selectedMarket.name}</h2>
                <span className={styles.detailMeta}>{selectedMarket.chain} • {selectedMarket.city}</span>
              </div>
              <button className={styles.closeButton} onClick={onClose}>
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.detailBody}>
              {loading ? (
                <div className={styles.loadingState}>
                  <Spinner size={28} className={styles.spinner} />
                  <span>Lade Besuchsverlauf...</span>
                </div>
              ) : submissionGroups.length === 0 || submissionGroups.every(g => g.activities.length === 0) ? (
                <div className={styles.emptyState}>
                  <CalendarBlank size={36} weight="duotone" />
                  <span>Noch keine Einträge für diesen Markt</span>
                </div>
              ) : (
                submissionGroups.map(group => {
                  if (group.activities.length === 0) return null;
                  return (
                    <div key={group.date} className={styles.visitGroup}>
                      <div className={styles.visitDateRow}>
                        <CalendarBlank size={14} weight="fill" />
                        <span className={styles.visitDateText}>Besuch am {group.label}</span>
                      </div>
                      <div className={styles.visitEntries}>
                        {group.activities.map(activity => (
                          <ActivityCard key={activity.id} activity={activity} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => {
  const { type, details } = activity;

  if (type === 'vorbesteller') {
    return (
      <div className={styles.submissionCard}>
        <div className={styles.submissionHeader}>
          <div className={`${styles.submissionTypeBadge} ${styles.typeBadgeVorbesteller}`}>
            <Package size={12} weight="fill" />
            <span>Vorbesteller</span>
          </div>
          <span className={styles.submissionWave}>{details.welleName}</span>
        </div>
        <div className={styles.submissionContent}>
          {details.products && details.products.length > 0 ? (
            <div className={styles.productList}>
              {details.products.map((p: any, i: number) => (
                <div key={i} className={styles.productRow}>
                  <span className={styles.productName}>{p.name}</span>
                  <span className={styles.productQty}>{p.quantity}x</span>
                </div>
              ))}
              {details.totalValue > 0 && (
                <div className={styles.totalRow}>
                  Gesamt: €{details.totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.productRow}>
              <span className={styles.productName}>
                {details.itemName}
              </span>
              <span className={styles.productQty}>{details.quantity}x</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'vorverkauf') {
    return (
      <div className={styles.submissionCard}>
        <div className={styles.submissionHeader}>
          <div className={`${styles.submissionTypeBadge} ${styles.typeBadgeVorverkauf}`}>
            <ShoppingCart size={12} weight="fill" />
            <span>Vorverkauf</span>
          </div>
          <span className={styles.submissionWave}>{details.welleName}</span>
        </div>
        <div className={styles.submissionContent}>
          {details.products && details.products.length > 0 ? (
            <div className={styles.productList}>
              {details.products.map((p: any, i: number) => (
                <div key={i} className={styles.productRow}>
                  <span className={styles.productName}>{p.name}</span>
                  <div className={styles.productMeta}>
                    <span className={styles.productQty}>{p.quantity}x</span>
                    {p.reason && <span className={styles.reasonBadge}>{p.reason}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className={styles.noItems}>Keine Produkte</span>
          )}
          {details.notes && <div className={styles.notesRow}>{details.notes}</div>}
        </div>
      </div>
    );
  }

  if (type === 'produkttausch') {
    const takeOut = (details.items || []).filter((i: any) => i.itemType === 'take_out');
    const replace = (details.items || []).filter((i: any) => i.itemType === 'replace');
    return (
      <div className={styles.submissionCard}>
        <div className={styles.submissionHeader}>
          <div className={`${styles.submissionTypeBadge} ${styles.typeBadgeProdukttausch}`}>
            <ArrowsLeftRight size={12} weight="fill" />
            <span>Produkttausch</span>
          </div>
        </div>
        <div className={styles.submissionContent}>
          {takeOut.length > 0 && (
            <div className={styles.tauschSection}>
              <span className={styles.tauschLabel}>Entnommen</span>
              {takeOut.map((item: any, i: number) => (
                <div key={i} className={styles.productRow}>
                  <span className={styles.productName}>{item.name}</span>
                  <span className={styles.productQty}>{item.quantity}x</span>
                </div>
              ))}
            </div>
          )}
          {replace.length > 0 && (
            <div className={styles.tauschSection}>
              <span className={styles.tauschLabel}>Ersetzt durch</span>
              {replace.map((item: any, i: number) => (
                <div key={i} className={styles.productRow}>
                  <span className={styles.productName}>{item.name}</span>
                  <span className={styles.productQty}>{item.quantity}x</span>
                </div>
              ))}
            </div>
          )}
          {details.notes && <div className={styles.notesRow}>{details.notes}</div>}
        </div>
      </div>
    );
  }

  return null;
};
