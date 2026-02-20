import { API_BASE_URL } from '../config/database';

export interface CreateNaraIncentiveDTO {
  gebietsleiter_id: string;
  market_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

export interface NaraIncentiveItem {
  id: string;
  productId: string;
  productName: string;
  productWeight: string;
  productPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface NaraIncentiveSubmission {
  id: string;
  glId: string;
  glName: string;
  marketId: string;
  marketName: string;
  marketChain: string;
  marketAddress: string;
  marketCity: string;
  totalValue: number;
  createdAt: string;
  items: NaraIncentiveItem[];
}

class NaraIncentiveService {
  private baseUrl = `${API_BASE_URL}/nara-incentive`;

  async createSubmission(data: CreateNaraIncentiveDTO): Promise<{ id: string; itemsCount: number }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create NARA-Incentive submission');
    }

    return await response.json();
  }

  async deleteSubmission(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });

    if (!response.ok) {
      throw new Error(`Failed to delete NARA-Incentive submission: ${response.statusText}`);
    }
  }

  async getAllSubmissions(glId?: string): Promise<NaraIncentiveSubmission[]> {
    const params = new URLSearchParams();
    if (glId) params.append('glId', glId);

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch NARA-Incentive submissions: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const naraIncentiveService = new NaraIncentiveService();
