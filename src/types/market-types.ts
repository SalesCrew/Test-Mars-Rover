// Market Selection & Tour Planning Types

export interface Market {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  chain: 'Adeg' | 'Billa+' | 'BILLA+' | 'BILLA Plus' | 'BILLA+ Privat' | 'BILLA Plus Privat' | 
         'BILLA Privat' | 'Eurospar' | 'Futterhaus' | 'Hagebau' | 'Interspar' | 'Spar' | 
         'Spar Gourmet' | 'Zoofachhandel' | 'Hofer' | 'Merkur' | string;
  frequency: number; // visits per year
  currentVisits: number;
  lastVisitDate?: string; // ISO date
  isCompleted?: boolean; // completed today
  coordinates?: {
    lat: number;
    lng: number;
  };
  // Additional fields from Excel import
  channel?: string;
  banner?: string;
  branch?: string; // Filiale (Row O)
  maingroup?: string; // Row R
  subgroup?: string; // Row S
  gebietsleiter?: string; // UUID of assigned GL
  gebietsleiterName?: string; // Row L - Gebietsleiter name
  isActive?: boolean; // Row N - status
}

export interface TourRoute {
  markets: Market[];
  totalDrivingTime: number; // minutes
  totalWorkTime: number; // 45 min per market
  totalTime: number; // driving + work
  optimizedOrder: string[]; // market IDs in optimal order
}

export interface AdminMarket extends Market {
  internalId: string; // e.g., "MKT-001" (auto-generated)
  isActive: boolean; // Row N: Status from Excel
  subgroup?: string; // Row S: e.g., "3F - Adeg", "AB - Spar Wörgl"
  gebietsleiter?: string; // UUID of the assigned GL (gebietsleiter_id in DB)
  gebietsleiterName?: string; // Row L: Gebietsleiter name (visible in UI)
  gebietsleiterEmail?: string; // GL email for notifications (Row M from Excel)
  email?: string; // Market contact email (NOT used anymore)
  channel?: string; // Row D: Distribution channel
  banner?: string; // Row E: Banner/Brand group
  branch?: string; // Row O: Filiale
  visitDay?: string; // Besuchstag (not from Excel)
  visitDuration?: string; // Row Q: Besuchsdauer (e.g., "30 min")
  customerType?: string; // Kundentyp (not from Excel)
  phone?: string; // Not displayed in UI anymore
  maingroup?: string; // Row R: Maingroup
}

