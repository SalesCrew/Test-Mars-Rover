/**
 * Day Tracking Service
 * Handles all API calls for the day time tracking system
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const DAY_TRACKING_API = `${API_BASE_URL}/fragebogen/day-tracking`;

// ============================================================================
// TYPES
// ============================================================================

export type DayTrackingStatus = 'active' | 'completed' | 'force_closed' | 'not_started';

export interface DayTracking {
  id: string;
  gebietsleiter_id: string;
  tracking_date: string;
  day_start_time: string | null;
  day_end_time: string | null;
  skipped_first_fahrzeit: boolean;
  total_fahrzeit: string | null;
  total_besuchszeit: string | null;
  total_unterbrechung: string | null;
  total_arbeitszeit: string | null;
  markets_visited: number;
  status: DayTrackingStatus;
  created_at: string;
  updated_at: string;
}

export interface MarketVisitForDay {
  id: string;
  market_id: string;
  market_name: string;
  market_start_time: string | null;
  market_end_time: string | null;
  besuchszeit_von: string | null;
  besuchszeit_bis: string | null;
  besuchszeit_diff: string | null;
  calculated_fahrzeit: string | null;
  visit_order: number;
  created_at: string;
}

export interface DaySummary {
  dayTracking: DayTracking | null;
  marketVisits: MarketVisitForDay[];
  totalFahrzeit: string;
  totalBesuchszeit: string;
  totalUnterbrechung: string;
  totalArbeitszeit: string;
  marketsVisited: number;
}

export interface StartDayRequest {
  skipFahrzeit: boolean;
  startTime?: string; // Optional override, defaults to current time
}

export interface EndDayRequest {
  endTime: string; // Required arrival time
  forceClose?: boolean; // If true, marks as force_closed
}

// ============================================================================
// SERVICE
// ============================================================================

class DayTrackingService {
  /**
   * Start a new day tracking session
   */
  async startDay(glId: string, options: StartDayRequest): Promise<DayTracking> {
    const url = `${DAY_TRACKING_API}/start`;
    console.log('🟡 dayTrackingService.startDay:', { url, glId, options });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gebietsleiter_id: glId,
          skip_fahrzeit: options.skipFahrzeit,
          start_time: options.startTime,
        }),
      });

      console.log('🟡 startDay response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ startDay error response:', errorText);
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = { error: errorText }; }
        throw new Error(errorData.error || `Failed to start day (HTTP ${response.status})`);
      }

      const data = await response.json();
      console.log('✅ startDay success:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in startDay:', error);
      throw error;
    }
  }

  /**
   * End the current day tracking session
   */
  async endDay(glId: string, options: EndDayRequest): Promise<DayTracking> {
    try {
      const response = await fetch(`${DAY_TRACKING_API}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gebietsleiter_id: glId,
          end_time: options.endTime,
          force_close: options.forceClose || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to end day');
      }

      return response.json();
    } catch (error) {
      console.error('Error ending day:', error);
      throw error;
    }
  }

  /**
   * Get the current day tracking status for a GL
   */
  async getStatus(glId: string, date?: string): Promise<DayTracking | null> {
    try {
      const dateParam = date || new Date().toISOString().split('T')[0];
      const response = await fetch(`${DAY_TRACKING_API}/status/${glId}?date=${dateParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No day tracking record exists
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get day status');
      }

      return response.json();
    } catch (error) {
      console.error('Error getting day status:', error);
      throw error;
    }
  }

  /**
   * Get all market visits for a GL on a specific date
   */
  async getMarketVisitsForDay(glId: string, date?: string): Promise<MarketVisitForDay[]> {
    try {
      const dateParam = date || new Date().toISOString().split('T')[0];
      const response = await fetch(`${DAY_TRACKING_API}/${glId}/${dateParam}/visits`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get market visits');
      }

      return response.json();
    } catch (error) {
      console.error('Error getting market visits:', error);
      throw error;
    }
  }

  /**
   * Get the full day summary including all visits and calculated totals
   */
  async getDaySummary(glId: string, date?: string): Promise<DaySummary> {
    try {
      const dateParam = date || new Date().toISOString().split('T')[0];
      const response = await fetch(`${DAY_TRACKING_API}/${glId}/${dateParam}/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get day summary');
      }

      return response.json();
    } catch (error) {
      console.error('Error getting day summary:', error);
      throw error;
    }
  }

  /**
   * Record market visit start time
   */
  async recordMarketStart(glId: string, marketId: string): Promise<{ visit_order: number; calculated_fahrzeit: string | null }> {
    try {
      const now = new Date();
      const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const response = await fetch(`${DAY_TRACKING_API}/market-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gebietsleiter_id: glId,
          market_id: marketId,
          start_time: startTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record market start');
      }

      return response.json();
    } catch (error) {
      console.error('Error recording market start:', error);
      throw error;
    }
  }

  /**
   * Update day tracking times (day_start_time or day_end_time)
   */
  async updateDayTimes(glId: string, date: string, times: { day_start_time?: string; day_end_time?: string }): Promise<DayTracking> {
    try {
      const response = await fetch(`${DAY_TRACKING_API}/update-times`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gebietsleiter_id: glId,
          date,
          ...times,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update day times');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating day times:', error);
      throw error;
    }
  }

  /**
   * Helper: Format interval string (HH:MM:SS) to readable format (Xh Ym)
   */
  formatInterval(interval: string | null): string {
    if (!interval) return '0:00';
    
    // Handle HH:MM:SS format
    const parts = interval.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
      }
      return `0:${minutes.toString().padStart(2, '0')}`;
    }
    
    return interval;
  }

  /**
   * Helper: Get current time as HH:MM string
   */
  getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Helper: Check if it's past 9 PM (21:00)
   */
  isPast9PM(): boolean {
    return new Date().getHours() >= 21;
  }
}

export const dayTrackingService = new DayTrackingService();
