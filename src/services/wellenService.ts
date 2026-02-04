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

export interface WelleEinzelprodukt {
  id: string;
  name: string;
  targetNumber: number;
  currentNumber?: number;
  picture: string | null;
  itemValue?: number | null;
}

export interface WellePaletteProduct {
  id: string;
  name: string;
  valuePerVE: number;
  ve: number;
  ean?: string | null;
}

export interface WellePalette {
  id: string;
  name: string;
  size?: string | null;
  picture?: string | null;
  products: WellePaletteProduct[];
}

export interface WelleSchuette {
  id: string;
  name: string;
  size?: string | null;
  picture?: string | null;
  products: WellePaletteProduct[]; // Same structure as palette products
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
  types: ('display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt')[];
  status: 'upcoming' | 'active' | 'past';
  goalType: 'percentage' | 'value';
  goalPercentage?: number | null;
  goalValue?: number | null;
  displayCount: number;
  kartonwareCount: number;
  paletteCount?: number;
  schutteCount?: number;
  einzelproduktCount?: number;
  displays?: WelleDisplay[];
  kartonwareItems?: WelleKartonware[];
  paletteItems?: WellePalette[];
  schutteItems?: WelleSchuette[];
  einzelproduktItems?: WelleEinzelprodukt[];
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
  types: ('display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt')[];
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
  paletteItems?: Array<{
    name: string;
    size: string | null;
    picture: string | null;
    products: Array<{
      name: string;
      value: string;
      ve: string;
      ean: string;
    }>;
  }>;
  schutteItems?: Array<{
    name: string;
    size: string | null;
    picture: string | null;
    products: Array<{
      name: string;
      value: string;
      ve: string;
      ean: string;
    }>;
  }>;
  einzelproduktItems?: Array<{
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
  item_type: 'display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt';
  item_id: string;
  current_number: number;
  value_per_unit?: number;
  photo_url?: string;
}

class WellenService {
  private baseUrl = `${API_BASE_URL}/wellen`;

  /**
   * Get all wellen with retry for resilience
   */
  async getAllWellen(retryCount = 0): Promise<Welle[]> {
    const maxRetries = 2;
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wellen: ${response.statusText}`);
      }

      const data = await response.json();
      
      // If we got an empty array and haven't retried yet, try once more
      // This handles potential cold-start/stale connection issues
      if (Array.isArray(data) && data.length === 0 && retryCount < maxRetries) {
        console.log(`Wellen returned empty, retrying (attempt ${retryCount + 2}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
        return this.getAllWellen(retryCount + 1);
      }
      
      return data;
    } catch (error) {
      // Retry on network errors
      if (retryCount < maxRetries) {
        console.log(`Wellen fetch failed, retrying (attempt ${retryCount + 2}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.getAllWellen(retryCount + 1);
      }
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
      item_type: 'display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt';
      item_id: string;
      current_number: number;
      value_per_unit?: number;
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

  /**
   * Update individual submission quantity
   */
  async updateSubmission(submissionId: string, quantity: number): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update submission: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  }

  /**
   * Delete individual submission
   */
  async deleteSubmission(submissionId: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete submission: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  }

  /**
   * Get pending delivery photos for a market
   * Returns submissions that don't have a delivery_photo_url yet
   */
  async getPendingDeliveryPhotos(marketId: string): Promise<PendingDeliverySubmission[]> {
    try {
      const response = await fetch(`${this.baseUrl}/market/${marketId}/pending-photos`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch pending photos: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching pending delivery photos:', error);
      throw error;
    }
  }

  /**
   * Upload a delivery verification photo for submissions
   */
  async uploadDeliveryPhoto(submissionIds: string[], photoBase64: string): Promise<{ success: boolean; photoUrl: string; updatedCount: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/upload-delivery-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionIds,
          imageData: photoBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to upload delivery photo: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading delivery photo:', error);
      throw error;
    }
  }

  /**
   * Upload individual delivery photos per palette/schütte
   * Each photo is linked to a specific parent submission ID
   */
  async uploadDeliveryPhotosPerItem(photos: { submissionId: string; photoBase64: string }[]): Promise<{ success: boolean; uploadedCount: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/upload-delivery-photos-per-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photos }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to upload delivery photos: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading delivery photos:', error);
      throw error;
    }
  }
}

// Interface for pending delivery submissions
export interface PendingDeliverySubmission {
  id: string;
  itemName: string;
  itemType: 'display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt';
  quantity: number;
  welleName: string;
  createdAt: string;
  // For palette/schuette items, contains the nested products
  products?: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

export const wellenService = new WellenService();
