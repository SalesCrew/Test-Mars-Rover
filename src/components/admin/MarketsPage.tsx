import React, { useState } from 'react';
import { MapPin } from '@phosphor-icons/react';
import AnimatedList from '../gl/AnimatedList';
import { MarketListItem } from './MarketListItem';
import { MarketDetailsModal } from './MarketDetailsModal';
import { adminMarkets } from '../../data/adminMarketsData';
import type { AdminMarket } from '../../types/market-types';
import styles from './MarketsPage.module.css';

export const MarketsPage: React.FC = () => {
  const [markets, setMarkets] = useState<AdminMarket[]>(adminMarkets);
  const [selectedMarket, setSelectedMarket] = useState<AdminMarket | null>(null);
  const marketIds = markets.map(m => m.id);

  const handleMarketClick = (market: AdminMarket) => {
    setSelectedMarket(market);
  };

  const handleCloseModal = () => {
    setSelectedMarket(null);
  };

  const handleSaveMarket = (updatedMarket: AdminMarket) => {
    setMarkets(prevMarkets => 
      prevMarkets.map(m => m.id === updatedMarket.id ? updatedMarket : m)
    );
  };

  return (
    <div className={styles.pageContainer}>
      {/* Import Placeholder Section */}
      <div className={styles.importPlaceholder}>
        <span className={styles.placeholderText}>Import-Funktionalität folgt</span>
      </div>

      {/* Markets List Container */}
      <div className={styles.listContainer}>
        {/* List Header */}
        <div className={styles.listHeader}>
          <div className={styles.headerCell}>Handelskette</div>
          <div className={styles.headerCell}>ID</div>
          <div className={styles.headerCell}>Adresse</div>
          <div className={styles.headerCell}>Subgroup</div>
          <div className={styles.headerCell}></div>
          <div className={styles.headerCell}>Frequenz</div>
          <div className={styles.headerCell}>Status</div>
        </div>

        {/* Markets List */}
        {markets.length === 0 ? (
          <div className={styles.emptyState}>
            <MapPin size={48} weight="regular" />
            <span>Keine Märkte vorhanden</span>
          </div>
        ) : (
          <AnimatedList
            items={marketIds}
            showGradients={true}
            enableArrowNavigation={false}
            displayScrollbar={false}
            className={styles.marketsList}
          >
            {(_item, index) => {
              const market = markets[index];
              return <MarketListItem market={market} onClick={handleMarketClick} />;
            }}
          </AnimatedList>
        )}
      </div>

      {/* Market Details Modal */}
      {selectedMarket && (
        <MarketDetailsModal
          market={selectedMarket}
          onClose={handleCloseModal}
          onSave={handleSaveMarket}
        />
      )}
    </div>
  );
};

