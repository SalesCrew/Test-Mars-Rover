import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, Storefront, MagnifyingGlass, CheckCircle, Clock, CaretDown, CaretRight, Package } from '@phosphor-icons/react';
import { API_BASE_URL } from '../../config/database';
import styles from './WaveMarketsModal.module.css';

interface WaveMarketsModalProps {
  welle: {
    id: string;
    name: string;
  };
  onClose: () => void;
}

interface ProductDetail {
  name: string;
  quantity: number;
  value: number;
}

interface ActivityItem {
  type: string;
  name: string;
  quantity: number;
  value: number;
  products?: ProductDetail[];
}

interface Activity {
  glName: string;
  timestamp: string;
  items: ActivityItem[];
  totalValue: number;
}

interface VisitedMarket {
  id: string;
  name: string;
  chain: string;
  address: string;
  gebietsleiter: string;
  visitedBy: string;
  visitedAt: string;
  activities: Activity[];
}

interface NotVisitedMarket {
  id: string;
  name: string;
  chain: string;
  address: string;
  gebietsleiter: string;
}

// Chain color mapping - matching MarketsPage/GLDetailModal colors
const getChainColors = (chain: string): { bg: string; text: string; border: string } => {
  switch (chain) {
    // BILLA Family - Yellow variants
    case 'Billa+':
    case 'BILLA+':
    case 'BILLA Plus':
      return { bg: '#FED304', text: '#854D0E', border: '#FED304' };
    case 'BILLA+ Privat':
    case 'BILLA Plus Privat':
      return { bg: '#FBBF24', text: '#854D0E', border: '#FBBF24' };
    case 'BILLA Privat':
    case 'Billa':
      return { bg: '#F59E0B', text: '#854D0E', border: '#F59E0B' };
    
    // SPAR Family - Red/Green variants
    case 'Spar':
      return { bg: '#EF4444', text: '#FFFFFF', border: '#EF4444' };
    case 'Eurospar':
      return { bg: '#DC2626', text: '#FFFFFF', border: '#DC2626' };
    case 'Interspar':
      return { bg: '#B91C1C', text: '#FFFFFF', border: '#B91C1C' };
    case 'Spar Gourmet':
      return { bg: '#059669', text: '#FFFFFF', border: '#059669' };
    
    // Other Chains
    case 'Hofer':
      return { bg: '#3B82F6', text: '#FFFFFF', border: '#3B82F6' };
    case 'Merkur':
      return { bg: '#10B981', text: '#FFFFFF', border: '#10B981' };
    case 'Adeg':
    case 'ADEG':
      return { bg: '#8B5CF6', text: '#FFFFFF', border: '#8B5CF6' };
    case 'Penny':
      return { bg: '#EF4444', text: '#FFFFFF', border: '#EF4444' };
    case 'Futterhaus':
      return { bg: '#F97316', text: '#FFFFFF', border: '#F97316' };
    case 'Hagebau':
      return { bg: '#0EA5E9', text: '#FFFFFF', border: '#0EA5E9' };
    case 'Zoofachhandel':
      return { bg: '#EC4899', text: '#FFFFFF', border: '#EC4899' };
    
    default:
      return { bg: '#6B7280', text: '#FFFFFF', border: '#6B7280' };
  }
};

export const WaveMarketsModal: React.FC<WaveMarketsModalProps> = ({ welle, onClose }) => {
  const [visited, setVisited] = useState<VisitedMarket[]>([]);
  const [notVisited, setNotVisited] = useState<NotVisitedMarket[]>([]);
  const [visitedCount, setVisitedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/wellen/${welle.id}/markets-status`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setVisited(data.visited || []);
        setNotVisited(data.notVisited || []);
        setVisitedCount(data.visitedCount || 0);
        setTotalCount(data.totalCount || 0);
      } catch (error) {
        console.error('Error fetching wave markets:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [welle.id]);

  const toggleMarket = (marketId: string) => {
    setExpandedMarkets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(marketId)) {
        newSet.delete(marketId);
      } else {
        newSet.add(marketId);
      }
      return newSet;
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('de-AT', {
      timeZone: 'Europe/Vienna',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getChainStyle = (chain: string) => {
    return getChainColors(chain);
  };

  // Filter markets based on search
  const filteredVisited = useMemo(() => {
    if (!searchQuery.trim()) return visited;
    const query = searchQuery.toLowerCase();
    return visited.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.chain.toLowerCase().includes(query) ||
      m.address?.toLowerCase().includes(query) ||
      m.gebietsleiter?.toLowerCase().includes(query) ||
      m.visitedBy?.toLowerCase().includes(query)
    );
  }, [visited, searchQuery]);

  const filteredNotVisited = useMemo(() => {
    if (!searchQuery.trim()) return notVisited;
    const query = searchQuery.toLowerCase();
    return notVisited.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.chain.toLowerCase().includes(query) ||
      m.address?.toLowerCase().includes(query) ||
      m.gebietsleiter?.toLowerCase().includes(query)
    );
  }, [notVisited, searchQuery]);

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Storefront size={28} weight="duotone" />
            <div className={styles.headerInfo}>
              <h2 className={styles.title}>Märkte - {welle.name}</h2>
              <p className={styles.subtitle}>
                <span className={styles.visitedBadge}>{visitedCount}</span>
                <span className={styles.subtitleDivider}>/</span>
                <span>{totalCount} Märkte besucht</span>
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Search Bar */}
        <div className={styles.searchSection}>
          <div className={styles.searchWrapper}>
            <MagnifyingGlass size={18} weight="regular" className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Suche nach Markt, Handelskette, PLZ, Adresse, GL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Lade Märkte...</p>
            </div>
          ) : (
            <>
              {/* Visited Markets Section */}
              {filteredVisited.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <CheckCircle size={18} weight="fill" className={styles.sectionIconVisited} />
                    <h3 className={styles.sectionTitle}>Besucht</h3>
                    <span className={styles.sectionCount}>{filteredVisited.length}</span>
                  </div>
                  <div className={styles.marketsList}>
                    {filteredVisited.map((market) => (
                      <div key={market.id} className={styles.marketCard}>
                        <div 
                          className={styles.marketHeader}
                          onClick={() => toggleMarket(market.id)}
                        >
                          <div className={styles.marketInfo}>
                            <div className={styles.marketTop}>
                              <span 
                                className={styles.chainPill}
                                style={{
                                  background: getChainStyle(market.chain).bg,
                                  color: getChainStyle(market.chain).text,
                                  borderColor: getChainStyle(market.chain).border
                                }}
                              >
                                {market.chain}
                              </span>
                              <span className={styles.marketName}>{market.name}</span>
                              <span className={styles.marketAddress}>{market.address}</span>
                            </div>
                            <div className={styles.marketMeta}>
                              <span className={styles.visitedStamp}>
                                <CheckCircle size={12} weight="fill" />
                                Besucht
                              </span>
                              <span className={styles.visitInfo}>
                                {market.visitedBy} • {formatDate(market.visitedAt)}
                              </span>
                            </div>
                          </div>
                          <div className={styles.expandIcon}>
                            {expandedMarkets.has(market.id) ? (
                              <CaretDown size={18} weight="bold" />
                            ) : (
                              <CaretRight size={18} weight="bold" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Activities */}
                        {expandedMarkets.has(market.id) && market.activities.length > 0 && (
                          <div className={styles.activitiesSection}>
                            {market.activities.map((activity, idx) => (
                              <div key={idx} className={styles.activityRow}>
                                <div className={styles.activityHeader}>
                                  <Clock size={14} weight="regular" />
                                  <span className={styles.activityTime}>{formatDate(activity.timestamp)}</span>
                                  <span className={styles.activityGL}>{activity.glName}</span>
                                  {activity.totalValue > 0 && (
                                    <span className={styles.activityValue}>
                                      €{activity.totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                                <div className={styles.activityItems}>
                                  {activity.items.map((item, iIdx) => (
                                    <div key={iIdx} className={styles.activityItemWrapper}>
                                      <div className={`${styles.activityItem} ${item.products ? styles.activityItemParent : ''}`}>
                                        <Package size={12} weight="fill" />
                                        <span className={styles.itemQty}>
                                          {item.products ? `${item.products.reduce((s, p) => s + p.quantity, 0)}x` : `${item.quantity}x`}
                                        </span>
                                        <span className={styles.itemName}>{item.name}</span>
                                        <span className={`${styles.itemType} ${item.type === 'palette' ? styles.itemTypePalette : item.type === 'schuette' ? styles.itemTypeSchuette : ''}`}>
                                          {item.type === 'display' ? 'Display' : item.type === 'kartonware' ? 'Kartonware' : item.type === 'palette' ? 'Palette' : 'Schütte'}
                                        </span>
                                        {item.value > 0 && (
                                          <span className={styles.itemValue}>
                                            €{item.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        )}
                                      </div>
                                      {/* Nested products for palette/schuette */}
                                      {item.products && item.products.length > 0 && (
                                        <div className={styles.nestedProducts}>
                                          {item.products.map((prod, pIdx) => (
                                            <div key={pIdx} className={styles.nestedProduct}>
                                              <span className={styles.nestedQty}>{prod.quantity}x</span>
                                              <span className={styles.nestedName}>{prod.name}</span>
                                              {prod.value > 0 && (
                                                <span className={styles.nestedValue}>
                                                  €{prod.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Not Visited Markets Section */}
              {filteredNotVisited.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <Clock size={18} weight="regular" className={styles.sectionIconPending} />
                    <h3 className={styles.sectionTitle}>Noch nicht besucht</h3>
                    <span className={styles.sectionCount}>{filteredNotVisited.length}</span>
                  </div>
                  <div className={styles.marketsList}>
                    {filteredNotVisited.map((market) => (
                      <div key={market.id} className={`${styles.marketCard} ${styles.marketCardPending}`}>
                        <div className={styles.marketHeader}>
                          <div className={styles.marketInfo}>
                            <div className={styles.marketTop}>
                              <span 
                                className={styles.chainPill}
                                style={{
                                  background: getChainStyle(market.chain).bg,
                                  color: getChainStyle(market.chain).text,
                                  borderColor: getChainStyle(market.chain).border
                                }}
                              >
                                {market.chain}
                              </span>
                              <span className={styles.marketName}>{market.name}</span>
                              <span className={styles.marketAddress}>{market.address}</span>
                            </div>
                            <div className={styles.marketMeta}>
                              <span className={styles.glName}>GL: {market.gebietsleiter || 'Nicht zugewiesen'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredVisited.length === 0 && filteredNotVisited.length === 0 && (
                <div className={styles.emptyState}>
                  <Storefront size={48} weight="thin" />
                  <p>{searchQuery ? 'Keine Märkte gefunden' : 'Keine Märkte zugewiesen'}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
