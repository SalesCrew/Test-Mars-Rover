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
}

export interface TourRoute {
  markets: Market[];
  totalDrivingTime: number; // minutes
  totalWorkTime: number; // 45 min per market
  totalTime: number; // driving + work
  optimizedOrder: string[]; // market IDs in optimal order
}

export interface AdminMarket extends Market {
  internalId: string; // e.g., "MKT-001"
  isActive: boolean;
  subgroup?: string; // e.g., "3F - Adeg", "AB - Spar Wörgl"
  gebietsleiter?: string; // Gebietsleiter
  channel?: string;
  banner?: string;
  branch?: string; // Filiale
  visitDay?: string; // Besuchstag
  visitDuration?: string; // Besuchdauer
  customerType?: string; // Kundentyp
  phone?: string; // Telefonnummer
  email?: string; // E-Mail Adresse
  maingroup?: string; // Maingroup (was haingroup)
}

