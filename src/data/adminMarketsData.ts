import { allMarkets } from './marketsData';
import type { AdminMarket } from '../types/market-types';

// Subgroup codes for different chains
const subgroups = [
  '3F - Adeg', '3R - BILLA Plus', '3A - Billa', '2A - Spar', 'AA - Spar Dornbirn',
  'AB - Spar Wörgl', 'AC - Spar Marchtrenk', 'AD - Spar Maria Saal', 'AE - Spar Graz',
  'AF - Spar St.Pölten', 'AJ - Spar Ebergassing', 'AY - Interspar', 'EC - Griesemann Zams',
  'WA - Hagebau (früher 3e)', 'WB - Nicht Org.', 'Y3 - Futterhaus', 'Z5 - Willi other SPT'
];

// All chain types to ensure at least one of each
const chainTypes = [
  'Adeg', 'Billa+', 'BILLA+ Privat', 'BILLA Privat', 'Eurospar', 
  'Futterhaus', 'Hagebau', 'Interspar', 'Spar', 'Spar Gourmet', 
  'Zoofachhandel', 'Hofer', 'Merkur'
];

// List of Gebietsleiter
const gebietsleiterList = [
  'Max Mustermann',
  'Anna Schmidt',
  'Peter Weber',
  'Laura Fischer',
  'Michael Bauer',
  'Sarah Hoffmann',
  'Thomas Müller',
  'Julia Wagner'
];

// Triple the markets to create enough data for scrolling
const expandedMarkets = [...allMarkets, ...allMarkets, ...allMarkets];

export const adminMarkets: AdminMarket[] = expandedMarkets.map((market, index) => {
  // Assign chain types cyclically to ensure all chains are represented
  const assignedChain = chainTypes[index % chainTypes.length];
  const assignedGL = gebietsleiterList[index % gebietsleiterList.length];
  
  return {
    ...market,
    chain: assignedChain,
    gebietsleiter: assignedGL,
    internalId: `MKT-${String(index + 1).padStart(3, '0')}`,
    isActive: Math.random() > 0.2, // 80% active for demo
    subgroup: subgroups[index % subgroups.length], // Assign subgroup cyclically
  } as AdminMarket;
});

