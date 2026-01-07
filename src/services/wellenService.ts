import { API_BASE_URL } from '../config/database';

export interface WelleDisplay {
  id: string;
  name: string;
  targetNumber: number;
  currentNumber?: number;
  picture: string | null;
  itemValue?: number | null;
}

export interface WelleKartonware {
  id: string;
  name: string;
  targetNumber: number;
  currentNumber?: number;
  picture: string | null;
  itemValue?: number | null;
}

export interface WelleKWDay {
  kw: string;
  days: string[];
}

export interface Welle {
  id: string;
  name: string;
  image: string | null;
  startDate: string;
  endDate: string;
  types: ('display' | 'kartonware')[];
  status: 'upcoming' | 'active' | 'past';
  goalType: 'percentage' | 'value';
  goalPercentage?: number | null;
  goalValue?: number | null;
  displayCount: number;
  kartonwareCount: number;
  displays?: WelleDisplay[];
  kartonwareItems?: WelleKartonware[];
  kwDays?: WelleKWDay[];
  assignedMarketIds?: string[];
  participatingGLs?: number;
  totalGLs?: number;
}

export interface CreateWelleDTO {
  name: string;
  image: string | null;
  startDate: string;
  endDate: string;
  goalType: 'percentage' | 'value';
  goalPercentage?: number | null;
  goalValue?: number | null;
  displays: Array<{
    name: string;
    targetNumber: number;
    picture: string | null;
    itemValue?: number | null;
  }>;
  kartonwareItems: Array<{
    name: string;
    targetNumber: number;
    picture: string | null;
    itemValue?: number | null;
  }>;
  kwDays: Array<{
    kw: string;
    days: string[];
  }>;
  assignedMarketIds: string[];
}

export interface UpdateWelleDTO extends CreateWelleDTO {
  id: string;
}

export interface UpdateProgressDTO {
  gebietsleiter_id: string;
  market_id?: string;
  item_type: 'display' | 'kartonware';
  item_id: string;
  current_number: number;
  photo_url?: string;
}

class WellenService {
  private baseUrl = `${API_BASE_URL}/wellen`;

  /**
   * Get all wellen
   */
  async getAllWellen(): Promise<Welle[]> {
    // #region agent log
    const debugStartTime = Date.now();
    fetch('http://127.0.0.1:7242/ingest/35f7e71b-d3fc-4c62-8097-9c7adee771ff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wellenService.ts:getAllWellen:start',message:'Starting getAllWellen fetch',data:{baseUrl:this.baseUrl,timestamp:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/35f7e71b-d3fc-4c62-8097-9c7adee771ff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wellenService.ts:getAllWellen:response',message:'Got response',data:{status:response.status,ok:response.ok,statusText:response.statusText,duration:Date.now()-debugStartTime},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        throw new Error(`Failed to fetch wellen: ${response.statusText}`);
      }

      const data = await response.json();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/35f7e71b-d3fc-4c62-8097-9c7adee771ff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wellenService.ts:getAllWellen:data',message:'Parsed JSON data',data:{wellenCount:data?.length||0,isArray:Array.isArray(data),totalDuration:Date.now()-debugStartTime},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
      // #endregion
      
      return data;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/35f7e71b-d3fc-4c62-8097-9c7adee771ff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wellenService.ts:getAllWellen:error',message:'Fetch error occurred',data:{error:String(error),duration:Date.now()-debugStartTime},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching wellen:', error);
      throw error;
    }
  }

  /**
   * Get a single welle by ID
   */
  async getWelleById(id: string): Promise<Welle> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch welle: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching welle:', error);
      throw error;
    }
  }

  /**
   * Create a new welle
   */
  async createWelle(welle: CreateWelleDTO): Promise<{ id: string; message: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(welle),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create welle: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating welle:', error);
      throw error;
    }
  }

  /**
   * Update an existing welle
   */
  async updateWelle(id: string, welle: CreateWelleDTO): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(welle),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update welle: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating welle:', error);
      throw error;
    }
  }

  /**
   * Delete a welle
   */
  async deleteWelle(id: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete welle: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting welle:', error);
      throw error;
    }
  }

  /**
   * Update GL progress for a welle (batch)
   */
  async updateProgressBatch(welleId: string, data: {
    gebietsleiter_id: string;
    market_id: string;
    items: Array<{
      item_type: 'display' | 'kartonware';
      item_id: string;
      current_number: number;
    }>;
    photo_url?: string;
  }): Promise<{ message: string; items_updated: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/${welleId}/progress/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update progress: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating progress batch:', error);
      throw error;
    }
  }

  /**
   * Update GL progress for a welle
   */
  async updateProgress(welleId: string, progress: UpdateProgressDTO): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${welleId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progress),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update progress: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  /**
   * Get GL progress for a specific welle
   */
  async getGLProgress(welleId: string, glId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${welleId}/progress/${glId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching progress:', error);
      throw error;
    }
  }
}

export const wellenService = new WellenService();
