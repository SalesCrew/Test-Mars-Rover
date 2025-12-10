import type { WelleData, TimeframeOption } from '../types/gl-types';

// Mock data for different Wellen (waves)
export const wellenData: WelleData[] = [
  // Current Welle (newest)
  {
    id: 'kw48-49',
    name: 'KW 48-49',
    startDate: new Date('2024-11-25'),
    endDate: new Date('2024-12-08'),
    billaPlus: {
      totalMarkets: 120,
      withVorbesteller: 101,
      displayCount: 68,
      kartonwareCount: 33,
      goalPercentage: 80,
    },
    spar: {
      totalMarkets: 90,
      withVorbesteller: 54,
      displayCount: 38,
      kartonwareCount: 16,
      goalPercentage: 60,
    },
  },
  // Previous Welle
  {
    id: 'kw46-47',
    name: 'KW 46-47',
    startDate: new Date('2024-11-11'),
    endDate: new Date('2024-11-24'),
    billaPlus: {
      totalMarkets: 120,
      withVorbesteller: 98,
      displayCount: 65,
      kartonwareCount: 33,
      goalPercentage: 80,
    },
    spar: {
      totalMarkets: 90,
      withVorbesteller: 52,
      displayCount: 36,
      kartonwareCount: 16,
      goalPercentage: 60,
    },
  },
  {
    id: 'kw44-45',
    name: 'KW 44-45',
    startDate: new Date('2024-10-28'),
    endDate: new Date('2024-11-10'),
    billaPlus: {
      totalMarkets: 120,
      withVorbesteller: 94,
      displayCount: 62,
      kartonwareCount: 32,
      goalPercentage: 80,
    },
    spar: {
      totalMarkets: 90,
      withVorbesteller: 50,
      displayCount: 34,
      kartonwareCount: 16,
      goalPercentage: 60,
    },
  },
  {
    id: 'kw42-43',
    name: 'KW 42-43',
    startDate: new Date('2024-10-14'),
    endDate: new Date('2024-10-27'),
    billaPlus: {
      totalMarkets: 120,
      withVorbesteller: 92,
      displayCount: 61,
      kartonwareCount: 31,
      goalPercentage: 80,
    },
    spar: {
      totalMarkets: 90,
      withVorbesteller: 49,
      displayCount: 33,
      kartonwareCount: 16,
      goalPercentage: 60,
    },
  },
  {
    id: 'kw40-41',
    name: 'KW 40-41',
    startDate: new Date('2024-09-30'),
    endDate: new Date('2024-10-13'),
    billaPlus: {
      totalMarkets: 120,
      withVorbesteller: 88,
      displayCount: 58,
      kartonwareCount: 30,
      goalPercentage: 80,
    },
    spar: {
      totalMarkets: 90,
      withVorbesteller: 47,
      displayCount: 31,
      kartonwareCount: 16,
      goalPercentage: 60,
    },
  },
  {
    id: 'kw38-39',
    name: 'KW 38-39',
    startDate: new Date('2024-09-16'),
    endDate: new Date('2024-09-29'),
    billaPlus: {
      totalMarkets: 120,
      withVorbesteller: 86,
      displayCount: 56,
      kartonwareCount: 30,
      goalPercentage: 80,
    },
    spar: {
      totalMarkets: 90,
      withVorbesteller: 45,
      displayCount: 30,
      kartonwareCount: 15,
      goalPercentage: 60,
    },
  },
  {
    id: 'kw36-37',
    name: 'KW 36-37',
    startDate: new Date('2024-09-02'),
    endDate: new Date('2024-09-15'),
    billaPlus: {
      totalMarkets: 120,
      withVorbesteller: 83,
      displayCount: 54,
      kartonwareCount: 29,
      goalPercentage: 80,
    },
    spar: {
      totalMarkets: 90,
      withVorbesteller: 43,
      displayCount: 28,
      kartonwareCount: 15,
      goalPercentage: 60,
    },
  },
  // Oldest Welle
  {
    id: 'kw34-35',
    name: 'KW 34-35',
    startDate: new Date('2024-08-19'),
    endDate: new Date('2024-09-01'),
    billaPlus: {
      totalMarkets: 120,
      withVorbesteller: 80,
      displayCount: 52,
      kartonwareCount: 28,
      goalPercentage: 80,
    },
    spar: {
      totalMarkets: 90,
      withVorbesteller: 42,
      displayCount: 27,
      kartonwareCount: 15,
      goalPercentage: 60,
    },
  },
];

// Calculate average data for 3 months (last 6 Wellen)
export const threeMonthsAverage: WelleData = {
  id: '3months-avg',
  name: '∅ 3 Monate',
  startDate: new Date('2024-08-19'),
  endDate: new Date('2024-12-08'),
  billaPlus: {
    totalMarkets: 120,
    withVorbesteller: Math.round(
      wellenData.slice(0, 6).reduce((sum, w) => sum + w.billaPlus.withVorbesteller, 0) / 6
    ),
    displayCount: Math.round(
      wellenData.slice(0, 6).reduce((sum, w) => sum + w.billaPlus.displayCount, 0) / 6
    ),
    kartonwareCount: Math.round(
      wellenData.slice(0, 6).reduce((sum, w) => sum + w.billaPlus.kartonwareCount, 0) / 6
    ),
    goalPercentage: 80,
  },
  spar: {
    totalMarkets: 90,
    withVorbesteller: Math.round(
      wellenData.slice(0, 6).reduce((sum, w) => sum + w.spar.withVorbesteller, 0) / 6
    ),
    displayCount: Math.round(
      wellenData.slice(0, 6).reduce((sum, w) => sum + w.spar.displayCount, 0) / 6
    ),
    kartonwareCount: Math.round(
      wellenData.slice(0, 6).reduce((sum, w) => sum + w.spar.kartonwareCount, 0) / 6
    ),
    goalPercentage: 60,
  },
};

// Calculate average data for 1 year (all Wellen)
export const oneYearAverage: WelleData = {
  id: '1year-avg',
  name: '∅ 1 Jahr',
  startDate: new Date('2023-12-01'),
  endDate: new Date('2024-12-08'),
  billaPlus: {
    totalMarkets: 120,
    withVorbesteller: Math.round(
      wellenData.reduce((sum, w) => sum + w.billaPlus.withVorbesteller, 0) / wellenData.length
    ),
    displayCount: Math.round(
      wellenData.reduce((sum, w) => sum + w.billaPlus.displayCount, 0) / wellenData.length
    ),
    kartonwareCount: Math.round(
      wellenData.reduce((sum, w) => sum + w.billaPlus.kartonwareCount, 0) / wellenData.length
    ),
    goalPercentage: 80,
  },
  spar: {
    totalMarkets: 90,
    withVorbesteller: Math.round(
      wellenData.reduce((sum, w) => sum + w.spar.withVorbesteller, 0) / wellenData.length
    ),
    displayCount: Math.round(
      wellenData.reduce((sum, w) => sum + w.spar.displayCount, 0) / wellenData.length
    ),
    kartonwareCount: Math.round(
      wellenData.reduce((sum, w) => sum + w.spar.kartonwareCount, 0) / wellenData.length
    ),
    goalPercentage: 60,
  },
};

// Timeframe options for the selector
export const timeframeOptions: TimeframeOption[] = [
  {
    id: 'current',
    label: 'Aktuelle Welle',
    type: 'welle',
  },
  {
    id: '3months',
    label: '∅ 3 Monate',
    type: 'average',
  },
  {
    id: 'year',
    label: '∅ 1 Jahr',
    type: 'average',
  },
];







