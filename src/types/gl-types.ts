// GL Dashboard TypeScript Types

export interface User {
  firstName: string;
  lastName: string;
  avatar: string;
  role: 'gl' | 'admin';
}

export interface Bonuses {
  yearTotal: number;
  percentageChange: number;
  sellIns: number;
  preOrders: number;
  marketsVisited: {
    current: number;
    target: number;
  };
}

export interface MarketFrequencyAlert {
  marketId: string;
  name: string;
  address: string;
  visits: {
    current: number;
    required: number;
  };
  status: 'on-track' | 'at-risk';
  lastVisitWeeks: number; // weeks since last visit
}

export interface PerformanceMetrics {
  averageVisitDuration: number; // in minutes
  sellInSuccessRate: number; // percentage
  weeklyTrend: Array<{
    week: string;
    sellIns: number;
  }>;
}

export interface GLDashboard {
  user: User;
  bonuses: Bonuses;
  frequencyAlerts: MarketFrequencyAlert[];
  performanceMetrics?: PerformanceMetrics;
  quickActions: {
    openVisitsToday: number;
  };
}

export type NavigationTab = 'dashboard' | 'statistics' | 'sell-ins' | 'profile';

export interface WelleData {
  id: string;
  name: string; // e.g., "KW 48-49" or "Q4 2024"
  startDate: Date;
  endDate: Date;
  billaPlus: ChainStats;
  spar: ChainStats;
}

export interface ChainStats {
  totalMarkets: number; // Total markets for this chain
  withVorbesteller: number; // Markets with Display or Kartonware
  displayCount: number; // Markets with Display
  kartonwareCount: number; // Markets with Kartonware
  goalPercentage: number; // 80 for Billa+, 60 for Spar
}

export interface TimeframeOption {
  id: 'current' | '3months' | 'year' | 'custom';
  label: string;
  type: 'welle' | 'average';
}

