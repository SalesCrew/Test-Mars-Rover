import { API_ENDPOINTS } from '../config/database';
import type { AdminMarket } from '../types/market-types';

class MarketService {
  /**
   * Fetch all markets from the database
   */
  async getAllMarkets(): Promise<AdminMarket[]> {
    try {
      const response = await fetch(API_ENDPOINTS.markets.getAll);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.transformMarketsFromDB(data);
    } catch (error) {
      console.error('Error fetching markets:', error);
      throw error;
    }
  }

  /**
   * Get a single market by ID
   */
  async getMarketById(id: string): Promise<AdminMarket> {
    try {
      const response = await fetch(API_ENDPOINTS.markets.getById(id));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.transformMarketFromDB(data);
    } catch (error) {
      console.error(`Error fetching market ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new market
   */
  async createMarket(market: Partial<AdminMarket>): Promise<AdminMarket> {
    try {
      const response = await fetch(API_ENDPOINTS.markets.create, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.transformMarketToDB(market)),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.transformMarketFromDB(data);
    } catch (error) {
      console.error('Error creating market:', error);
      throw error;
    }
  }

  /**
   * Update an existing market
   */
  async updateMarket(id: string, market: Partial<AdminMarket>): Promise<AdminMarket> {
    try {
      const response = await fetch(API_ENDPOINTS.markets.update(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.transformMarketToDB(market)),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.transformMarketFromDB(data);
    } catch (error) {
      console.error(`Error updating market ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a market
   */
  async deleteMarket(id: string): Promise<void> {
    try {
      const response = await fetch(API_ENDPOINTS.markets.delete(id), {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting market ${id}:`, error);
      throw error;
    }
  }

  /**
   * Import multiple markets
   */
  async importMarkets(markets: AdminMarket[]): Promise<{ success: number; failed: number }> {
    try {
      const response = await fetch(API_ENDPOINTS.markets.import, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(markets.map(m => this.transformMarketToDB(m))),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error importing markets:', error);
      throw error;
    }
  }

  /**
   * Transform database record to AdminMarket format
   */
  private transformMarketFromDB(dbMarket: any): AdminMarket {
    return {
      id: dbMarket.id,
      internalId: dbMarket.internal_id,
      name: dbMarket.name,
      address: dbMarket.address || '',
      city: dbMarket.city || '',
      postalCode: dbMarket.postal_code || '',
      chain: dbMarket.chain || '',
      frequency: dbMarket.frequency || 12,
      currentVisits: dbMarket.current_visits || 0,
      lastVisitDate: dbMarket.last_visit_date,
      isCompleted: dbMarket.is_completed || false,
      isActive: dbMarket.is_active ?? true,
      gebietsleiter: dbMarket.gebietsleiter,
      channel: dbMarket.channel,
      banner: dbMarket.banner,
      branch: dbMarket.branch,
      subgroup: dbMarket.subgroup,
      visitDay: dbMarket.visit_day,
      visitDuration: dbMarket.visit_duration,
      customerType: dbMarket.customer_type,
      phone: dbMarket.phone,
      email: dbMarket.email,
      maingroup: dbMarket.maingroup,
      coordinates: dbMarket.latitude && dbMarket.longitude ? {
        lat: parseFloat(dbMarket.latitude),
        lng: parseFloat(dbMarket.longitude),
      } : undefined,
    };
  }

  /**
   * Transform multiple database records to AdminMarket format
   */
  private transformMarketsFromDB(dbMarkets: any[]): AdminMarket[] {
    return dbMarkets.map(m => this.transformMarketFromDB(m));
  }

  /**
   * Transform AdminMarket to database format
   */
  private transformMarketToDB(market: Partial<AdminMarket>): any {
    return {
      id: market.id,
      internal_id: market.internalId,
      name: market.name,
      address: market.address,
      city: market.city,
      postal_code: market.postalCode,
      chain: market.chain,
      frequency: market.frequency,
      current_visits: market.currentVisits,
      last_visit_date: market.lastVisitDate,
      is_completed: market.isCompleted,
      is_active: market.isActive,
      gebietsleiter: market.gebietsleiter,
      channel: market.channel,
      banner: market.banner,
      branch: market.branch,
      subgroup: market.subgroup,
      visit_day: market.visitDay,
      visit_duration: market.visitDuration,
      customer_type: market.customerType,
      phone: market.phone,
      email: market.email,
      maingroup: market.maingroup,
      latitude: market.coordinates?.lat,
      longitude: market.coordinates?.lng,
    };
  }
}

// Export singleton instance
export const marketService = new MarketService();

