// GL Dashboard Types

export interface User {
  firstName: string;
  lastName: string;
  avatar: string;
  role: 'gl';
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
  status: 'at-risk' | 'on-track';
  lastVisitWeeks: number;
  priorityReason: string;  // "HEUTE: Vorbesteller", "Frequenz überfällig", etc.
  priorityScore: number;   // For sorting/debugging
}

export interface PerformanceMetrics {
  averageVisitDuration: number;
  sellInSuccessRate: number;
  weeklyTrend: Array<{
    week: string;
    sellIns: number;
  }>;
}

export interface GLDashboard {
  user: User;
  bonuses: Bonuses;
  quickActions: {
    openVisitsToday: number;
  };
  frequencyAlerts: MarketFrequencyAlert[];
  performanceMetrics?: PerformanceMetrics;
}

export type NavigationTab = 'dashboard' | 'statistics' | 'vorbesteller' | 'profile';

// Chain Statistics Types
export interface ChainStats {
  chain: string;
  color: string;
  current: number;
  target: number;
  percentage: number;
  totalMarkets: number;
  withVorbesteller: number;
  displayCount: number;
  kartonwareCount: number;
  goalPercentage: number;
}

// Chain Data for Welle
export interface ChainData {
  totalMarkets: number;
  withVorbesteller: number;
  displayCount: number;
  kartonwareCount: number;
  goalPercentage: number;
}

// Welle Data Types for statistics
export interface WelleData {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  billaPlus: ChainData;
  spar: ChainData;
}

// Timeframe Options
export interface TimeframeOption {
  id: string;
  label: string;
  type: 'welle' | 'average';
}

// GL Profile Types
export interface GLProfile {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  profilePictureUrl: string | null;
  createdAt: string;
  // Statistics
  monthlyVisits: number;
  totalMarkets: number;
  monthChangePercent?: number; // Change vs previous month
  sellInChangePercent?: number; // Change vs previous month
  mostVisitedMarket: {
    name: string;
    chain: string;
    visitCount: number;
  };
  averageVisitDuration: number;
  sellInSuccessRate: number;
  vorverkaufeCount?: number; // This month's vorverkauf submissions
  vorbestellerCount?: number; // This month's vorbesteller submissions
  produkttauschCount?: number; // This month's produkttausch entries
  topMarkets: Array<{
    id: string;
    name: string;
    chain: string;
    address: string;
    visitCount: number;
    lastVisit: string;
  }>;
}
