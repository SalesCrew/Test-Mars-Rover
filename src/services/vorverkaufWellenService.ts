import { API_BASE_URL } from '../config/database';
import type { Market } from '../types/market-types';
import type { Product } from '../types/product-types';

// Vorverkauf Welle interface
export interface VorverkaufWelle {
  id: string;
  name: string;
  image: string | null;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'past';
  assignedMarketIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Submission interfaces
export interface VorverkaufSubmissionProduct {
  productId: string;
  quantity: number;
  reason: 'OOS' | 'Listungslücke' | 'Platzierung';
}

export interface VorverkaufSubmissionDTO {
  welleId: string;
  gebietsleiter_id: string;
  market_id: string;
  products: VorverkaufSubmissionProduct[];
  notes?: string;
}

export interface VorverkaufSubmission {
  id: string;
  welleId: string;
  gebietsleiter: {
    id: string;
    first_name: string;
    last_name: string;
  };
  market: {
    id: string;
    name: string;
    city: string;
    chain: string;
  };
  products: {
    id: string;
    product: Product;
    quantity: number;
    reason: string;
  }[];
  notes?: string;
  createdAt: string;
}

// Stats interface
export interface VorverkaufWelleStats {
  totalSubmissions: number;
  uniqueGLs: number;
  uniqueMarkets: number;
  totalProducts: number;
  byReason: {
    OOS: number;
    Listungslücke: number;
    Platzierung: number;
  };
}

const VORVERKAUF_WELLEN_URL = `${API_BASE_URL}/vorverkauf-wellen`;

export const vorverkaufWellenService = {
  // ============================================================================
  // ADMIN: Get all Vorverkauf Wellen
  // ============================================================================
  async getAllWellen(): Promise<VorverkaufWelle[]> {
    const response = await fetch(VORVERKAUF_WELLEN_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch vorverkauf wellen');
    }
    return response.json();
  },

  // ============================================================================
  // ADMIN: Get single Vorverkauf Welle
  // ============================================================================
  async getWelleById(id: string): Promise<VorverkaufWelle> {
    const response = await fetch(`${VORVERKAUF_WELLEN_URL}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch vorverkauf welle');
    }
    return response.json();
  },

  // ============================================================================
  // ADMIN: Create new Vorverkauf Welle
  // ============================================================================
  async createWelle(data: {
    name: string;
    image?: string | null;
    startDate: string;
    endDate: string;
    assignedMarketIds?: string[];
  }): Promise<VorverkaufWelle> {
    const response = await fetch(VORVERKAUF_WELLEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to create vorverkauf welle');
    }
    return response.json();
  },

  // ============================================================================
  // ADMIN: Update Vorverkauf Welle
  // ============================================================================
  async updateWelle(id: string, data: {
    name: string;
    image?: string | null;
    startDate: string;
    endDate: string;
    assignedMarketIds?: string[];
  }): Promise<VorverkaufWelle> {
    const response = await fetch(`${VORVERKAUF_WELLEN_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to update vorverkauf welle');
    }
    return response.json();
  },

  // ============================================================================
  // ADMIN: Delete Vorverkauf Welle
  // ============================================================================
  async deleteWelle(id: string): Promise<void> {
    const response = await fetch(`${VORVERKAUF_WELLEN_URL}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete vorverkauf welle');
    }
  },

  // ============================================================================
  // GL: Get Vorverkauf Wellen for GL (active/upcoming for their markets)
  // ============================================================================
  async getWellenForGL(glId: string): Promise<VorverkaufWelle[]> {
    const response = await fetch(`${VORVERKAUF_WELLEN_URL}/gl/${glId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch vorverkauf wellen for GL');
    }
    return response.json();
  },

  // ============================================================================
  // GL: Get all markets assigned to a wave
  // ============================================================================
  async getWelleMarkets(welleId: string): Promise<Market[]> {
    const url = `${VORVERKAUF_WELLEN_URL}/${welleId}/markets`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch welle markets');
    }
    return response.json();
  },

  // ============================================================================
  // GL: Submit Vorverkauf entry
  // ============================================================================
  async submitVorverkauf(data: VorverkaufSubmissionDTO): Promise<{ id: string }> {
    const response = await fetch(`${VORVERKAUF_WELLEN_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to submit vorverkauf');
    }
    return response.json();
  },

  // ============================================================================
  // ADMIN: Get submissions for a wave
  // ============================================================================
  async getSubmissions(waveId: string): Promise<VorverkaufSubmission[]> {
    const response = await fetch(`${VORVERKAUF_WELLEN_URL}/submissions/${waveId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch submissions');
    }
    return response.json();
  },

  // ============================================================================
  // ADMIN: Get stats for a wave
  // ============================================================================
  async getWelleStats(waveId: string): Promise<VorverkaufWelleStats> {
    const response = await fetch(`${VORVERKAUF_WELLEN_URL}/stats/${waveId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch welle stats');
    }
    return response.json();
  }
};
