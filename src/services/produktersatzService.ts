import { API_BASE_URL } from '../config/database';

export interface ProduktErsatzItem {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productSize: string;
  quantity: number;
  itemType: 'take_out' | 'replace';
}

export interface ProduktErsatzEntry {
  id: string;
  glId: string;
  glName: string;
  marketId: string;
  marketName: string;
  marketChain: string;
  marketAddress: string;
  marketCity: string;
  reason: 'OOS' | 'Listungslücke' | 'Platzierung' | 'Produkttausch';
  notes: string | null;
  items: ProduktErsatzItem[];
  totalItems: number;
  totalValue?: number;
  createdAt: string;
}

export interface CreateProduktErsatzDTO {
  gebietsleiter_id: string;
  market_id: string;
  reason: 'OOS' | 'Listungslücke' | 'Platzierung' | 'Produkttausch';
  notes?: string;
  total_value?: number;
  take_out_items: Array<{
    product_id: string;
    quantity: number;
  }>;
  replace_items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

class ProduktErsatzService {
  // Uses the existing vorverkauf backend - data is compatible
  private baseUrl = `${API_BASE_URL}/vorverkauf`;

  async getAllEntries(glId?: string, search?: string): Promise<ProduktErsatzEntry[]> {
    try {
      const params = new URLSearchParams();
      if (glId) params.append('glId', glId);
      if (search) params.append('search', search);
      
      const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch produktersatz entries: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching produktersatz entries:', error);
      throw error;
    }
  }

  async getEntry(id: string): Promise<ProduktErsatzEntry> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch produktersatz entry: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching produktersatz entry:', error);
      throw error;
    }
  }

  async createEntry(data: CreateProduktErsatzDTO): Promise<{ id: string; itemsCount: number }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create produktersatz entry');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating produktersatz entry:', error);
      throw error;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete produktersatz entry: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting produktersatz entry:', error);
      throw error;
    }
  }
}

export const produktersatzService = new ProduktErsatzService();
