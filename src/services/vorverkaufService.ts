import { API_BASE_URL } from '../config/database';

export interface VorverkaufItem {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productSize: string;
  quantity: number;
  itemType?: 'take_out' | 'replace';
}

export interface VorverkaufEntry {
  id: string;
  glId: string;
  glName: string;
  marketId: string;
  marketName: string;
  marketChain: string;
  marketAddress: string;
  marketCity: string;
  reason: 'OOS' | 'Listungslücke' | 'Platzierung';
  notes: string | null;
  items: VorverkaufItem[];
  totalItems: number;
  createdAt: string;
}

export interface CreateVorverkaufDTO {
  gebietsleiter_id: string;
  market_id: string;
  reason: 'OOS' | 'Listungslücke' | 'Platzierung';
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

class VorverkaufService {
  private baseUrl = `${API_BASE_URL}/vorverkauf`;

  async getAllEntries(glId?: string, search?: string): Promise<VorverkaufEntry[]> {
    try {
      const params = new URLSearchParams();
      if (glId) params.append('glId', glId);
      if (search) params.append('search', search);
      
      const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vorverkauf entries: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching vorverkauf entries:', error);
      throw error;
    }
  }

  async getEntry(id: string): Promise<VorverkaufEntry> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vorverkauf entry: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching vorverkauf entry:', error);
      throw error;
    }
  }

  async createEntry(data: CreateVorverkaufDTO): Promise<{ id: string; itemsCount: number }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create vorverkauf entry');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating vorverkauf entry:', error);
      throw error;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete vorverkauf entry: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting vorverkauf entry:', error);
      throw error;
    }
  }
}

export const vorverkaufService = new VorverkaufService();
