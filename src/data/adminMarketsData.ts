import { allMarkets } from './marketsData';
import type { AdminMarket } from '../types/market-types';

// Subgroup codes for different chains
const subgroups = [
  '3F - Adeg', '3R - BILLA Plus', '3A - Billa', '2A - Spar', 'AA - Spar Dornbirn',
  'AB - Spar Wörgl', 'AC - Spar Marchtrenk', 'AD - Spar Maria Saal', 'AE - Spar Graz',
  'AF - Spar St.Pölten', 'AJ - Spar Ebergassing', 'AY - Interspar', 'EC - Griesemann Zams',
  'WA - Hagebau (früher 3e)', 'WB - Nicht Org.', 'Y3 - Futterhaus', 'Z5 - Willi other SPT'
];

// Triple the markets to create enough data for scrolling
const expandedMarkets = [...allMarkets, ...allMarkets, ...allMarkets];

export const adminMarkets: AdminMarket[] = expandedMarkets.map((market, index) => ({
  ...market,
  // Rename "Billa" to "Billa+" to match the actual naming
  chain: market.chain === 'Billa' ? 'Billa Plus' : market.chain,
  internalId: `MKT-${String(index + 1).padStart(3, '0')}`,
  isActive: Math.random() > 0.2, // 80% active for demo
  subgroup: subgroups[index % subgroups.length], // Assign subgroup cyclically
})) as AdminMarket[];

