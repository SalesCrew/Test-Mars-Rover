import React from 'react';
import type { AdminMarket } from '../../types/market-types';
import styles from './MarketListItem.module.css';

interface MarketListItemProps {
  market: AdminMarket;
  onClick: (market: AdminMarket) => void;
}

const getChainColor = (chain: string): string => {
  switch (chain) {
    // BILLA Family - Yellow variants
    case 'Billa+':
    case 'BILLA+':
    case 'BILLA Plus':
      return '#FED304'; // Bright Yellow
    case 'BILLA+ Privat':
    case 'BILLA Plus Privat':
      return '#FBBF24'; // Golden Yellow
    case 'BILLA Privat':
      return '#F59E0B'; // Amber
    
    // SPAR Family - Red/Green variants
    case 'Spar':
      return '#EF4444'; // Red
    case 'Eurospar':
      return '#DC2626'; // Darker Red
    case 'Interspar':
      return '#B91C1C'; // Dark Red
    case 'Spar Gourmet':
      return '#059669'; // Emerald Green
    
    // Other Chains
    case 'Hofer':
      return '#3B82F6'; // Blue
    case 'Merkur':
      return '#10B981'; // Green
    case 'Adeg':
      return '#8B5CF6'; // Purple
    case 'Futterhaus':
      return '#F97316'; // Orange
    case 'Hagebau':
      return '#0EA5E9'; // Sky Blue
    case 'Zoofachhandel':
      return '#EC4899'; // Pink
    default:
      return '#6B7280'; // Gray for unknown
  }
};

const getChainBadgeClass = (chain: string): string => {
  switch (chain) {
    case 'Billa+':
    case 'BILLA+':
    case 'BILLA Plus':
      return styles.billaPlus;
    case 'BILLA+ Privat':
    case 'BILLA Plus Privat':
      return styles.billaPlusPrivat;
    case 'BILLA Privat':
      return styles.billaPrivat;
    case 'Spar':
      return styles.spar;
    case 'Eurospar':
      return styles.eurospar;
    case 'Interspar':
      return styles.interspar;
    case 'Spar Gourmet':
      return styles.sparGourmet;
    case 'Hofer':
      return styles.hofer;
    case 'Merkur':
      return styles.merkur;
    case 'Adeg':
      return styles.adeg;
    case 'Futterhaus':
      return styles.futterhaus;
    case 'Hagebau':
      return styles.hagebau;
    case 'Zoofachhandel':
      return styles.zoofachhandel;
    default:
      return styles.default;
  }
};

const ProgressRing: React.FC<{ current: number; required: number }> = ({ current, required }) => {
  const [animatedProgress, setAnimatedProgress] = React.useState(0);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / required, 1);
  const strokeDashoffset = circumference * (1 - animatedProgress);
  const status = progress >= 0.8 ? 'on-track' : 'at-risk';
  const color = status === 'on-track' ? '#14B8A6' : '#F59E0B';

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className={styles.progressRing}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="rgba(226, 232, 240, 0.6)"
          strokeWidth="3"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className={styles.progressText}>
        <span className={styles.progressValue}>{current}/{required}</span>
      </div>
    </div>
  );
};

export const MarketListItem: React.FC<MarketListItemProps> = ({ market, onClick }) => {
  const lastVisitWeeks = market.lastVisitDate 
    ? Math.floor((Date.now() - new Date(market.lastVisitDate).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0;

  const chainColor = getChainColor(market.chain);
  const statusColor = market.isActive ? '#10B981' : '#EF4444';

  const itemStyle = {
    background: `linear-gradient(to right, 
      ${chainColor}0D 0%, 
      transparent 25%, 
      transparent 80%, 
      ${statusColor}0D 100%
    )`
  };

  return (
    <div className={styles.marketItem} style={itemStyle} onClick={() => onClick(market)}>
      <div className={styles.chainCell}>
        <span className={`${styles.chainBadge} ${getChainBadgeClass(market.chain)}`}>
          {market.chain}
        </span>
      </div>
      
      <div className={styles.idCell}>
        {market.internalId}
      </div>
      
      <div className={styles.addressCell}>
        <div className={styles.addressStreet}>{market.address}</div>
        <div className={styles.addressCity}>{market.postalCode} {market.city}</div>
      </div>

      <div className={styles.gebietsleiterCell}>
        {market.gebietsleiter || '-'}
      </div>

      <div className={styles.subgroupCell}>
        {market.subgroup || '-'}
      </div>

      <span className={styles.lastVisit}>
        {lastVisitWeeks}W
      </span>
      
      <div className={styles.frequencyCell}>
        <ProgressRing current={market.currentVisits} required={market.frequency} />
      </div>
      
      <div className={styles.statusCell}>
        <div className={`${styles.statusDot} ${market.isActive ? styles.statusDotActive : ''}`} />
        <span className={market.isActive ? styles.statusActive : styles.statusInactive}>
          {market.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>
    </div>
  );
};

