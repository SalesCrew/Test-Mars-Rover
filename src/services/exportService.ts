// Export service for generating Excel downloads
import { API_BASE_URL } from '../config/database';

export interface ColumnDef {
  id: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'datetime' | 'date' | 'boolean';
  default: boolean;
}

export interface DatasetDef {
  id: string;
  label: string;
  columns: ColumnDef[];
}

export interface ExportConfig {
  datasets: string[];
  columns: Record<string, string[]>;
  filters?: {
    dateRange?: { start: string; end: string };
    glIds?: string[];
    welleIds?: string[];
  };
  options?: {
    expandPaletteProducts?: boolean;
    fileName?: string;
  };
}

class ExportService {
  private baseUrl = `${API_BASE_URL}/export`;

  // Dataset definitions (must match backend)
  private datasets: Record<string, DatasetDef> = {
    wellen_submissions: {
      id: 'wellen_submissions',
      label: 'Wellen Vorbestellungen',
      columns: [
        { id: 'created_at', label: 'Datum', type: 'datetime', default: true },
        { id: 'welle_name', label: 'Welle', type: 'string', default: true },
        { id: 'gl_name', label: 'Gebietsleiter', type: 'string', default: true },
        { id: 'gl_email', label: 'GL Email', type: 'string', default: false },
        { id: 'market_name', label: 'Markt', type: 'string', default: true },
        { id: 'market_chain', label: 'Kette', type: 'string', default: true },
        { id: 'market_address', label: 'Adresse', type: 'string', default: true },
        { id: 'market_postal_code', label: 'PLZ', type: 'string', default: true },
        { id: 'market_city', label: 'Stadt', type: 'string', default: true },
        { id: 'market_id', label: 'Markt ID', type: 'string', default: false },
        { id: 'item_type', label: 'Typ', type: 'string', default: true },
        { id: 'item_name', label: 'Artikel', type: 'string', default: true },
        { id: 'container_name', label: 'Palette/Schütte', type: 'string', default: true },
        { id: 'quantity', label: 'Menge', type: 'number', default: true },
        { id: 'value_per_unit', label: 'Wert/Einheit', type: 'currency', default: true },
        { id: 'total_value', label: 'Gesamtwert', type: 'currency', default: true },
        { id: 'photo_url', label: 'Foto URL', type: 'string', default: false },
        { id: 'delivery_photo_url', label: 'Lieferung Foto URL', type: 'string', default: false },
        { id: 'submission_id', label: 'Submission ID', type: 'string', default: false }
      ]
    },
    markets: {
      id: 'markets',
      label: 'Marktbesuche',
      columns: [
        { id: 'id', label: 'ID', type: 'string', default: true },
        { id: 'internal_id', label: 'Interne ID', type: 'string', default: true },
        { id: 'name', label: 'Name', type: 'string', default: true },
        { id: 'chain', label: 'Kette', type: 'string', default: true },
        { id: 'address', label: 'Adresse', type: 'string', default: true },
        { id: 'city', label: 'Stadt', type: 'string', default: true },
        { id: 'postal_code', label: 'PLZ', type: 'string', default: true },
        { id: 'gebietsleiter_name', label: 'Gebietsleiter', type: 'string', default: true },
        { id: 'gebietsleiter_email', label: 'GL Email', type: 'string', default: false },
        { id: 'gebietsleiter_id', label: 'GL ID', type: 'string', default: false },
        { id: 'frequency', label: 'Frequenz', type: 'number', default: true },
        { id: 'current_visits', label: 'Aktuelle Besuche', type: 'number', default: true },
        { id: 'last_visit_date', label: 'Letzter Besuch', type: 'date', default: true },
        { id: 'is_active', label: 'Status', type: 'boolean', default: true },
        { id: 'phone', label: 'Telefon', type: 'string', default: false },
        { id: 'email', label: 'Email', type: 'string', default: false },
        { id: 'channel', label: 'Kanal', type: 'string', default: false },
        { id: 'banner', label: 'Banner', type: 'string', default: false },
        { id: 'subgroup', label: 'Subgroup', type: 'string', default: false },
        { id: 'created_at', label: 'Erstellt am', type: 'datetime', default: false }
      ]
    },
    vorverkauf_entries: {
      id: 'vorverkauf_entries',
      label: 'Vorverkauf Einträge',
      columns: [
        { id: 'created_at', label: 'Datum', type: 'datetime', default: true },
        { id: 'id', label: 'Entry ID', type: 'string', default: false },
        { id: 'gl_name', label: 'Gebietsleiter', type: 'string', default: true },
        { id: 'gl_email', label: 'GL Email', type: 'string', default: false },
        { id: 'market_name', label: 'Markt', type: 'string', default: true },
        { id: 'market_chain', label: 'Kette', type: 'string', default: true },
        { id: 'market_address', label: 'Adresse', type: 'string', default: true },
        { id: 'market_postal_code', label: 'PLZ', type: 'string', default: true },
        { id: 'market_city', label: 'Stadt', type: 'string', default: true },
        { id: 'reason', label: 'Grund', type: 'string', default: true },
        { id: 'status', label: 'Status', type: 'string', default: true },
        { id: 'notes', label: 'Notizen', type: 'string', default: true },
        { id: 'products_summary', label: 'Produkte', type: 'string', default: true },
        { id: 'products_json', label: 'Produkte (JSON)', type: 'string', default: false }
      ]
    },
    action_history: {
      id: 'action_history',
      label: 'Aktionsverlauf',
      columns: [
        { id: 'timestamp', label: 'Zeitstempel', type: 'datetime', default: true },
        { id: 'action_type', label: 'Aktionstyp', type: 'string', default: true },
        { id: 'market_id', label: 'Markt ID', type: 'string', default: false },
        { id: 'market_chain', label: 'Kette', type: 'string', default: true },
        { id: 'market_address', label: 'Adresse', type: 'string', default: true },
        { id: 'market_postal_code', label: 'PLZ', type: 'string', default: true },
        { id: 'market_city', label: 'Stadt', type: 'string', default: true },
        { id: 'target_gl', label: 'Ziel GL', type: 'string', default: true },
        { id: 'previous_gl', label: 'Vorheriger GL', type: 'string', default: true },
        { id: 'performed_by', label: 'Durchgeführt von', type: 'string', default: false },
        { id: 'notes', label: 'Notizen', type: 'string', default: false }
      ]
    },
    gebietsleiter: {
      id: 'gebietsleiter',
      label: 'Gebietsleiter',
      columns: [
        { id: 'id', label: 'ID', type: 'string', default: false },
        { id: 'name', label: 'Name', type: 'string', default: true },
        { id: 'email', label: 'Email', type: 'string', default: true },
        { id: 'phone', label: 'Telefon', type: 'string', default: true },
        { id: 'address', label: 'Adresse', type: 'string', default: true },
        { id: 'city', label: 'Stadt', type: 'string', default: true },
        { id: 'postal_code', label: 'PLZ', type: 'string', default: true },
        { id: 'is_active', label: 'Status', type: 'boolean', default: true },
        { id: 'total_visits', label: 'Gesamtbesuche', type: 'number', default: true },
        { id: 'display_count', label: 'Displays', type: 'number', default: true },
        { id: 'kartonware_count', label: 'Kartonware', type: 'number', default: true },
        { id: 'paletten_value', label: 'Paletten Wert', type: 'currency', default: true },
        { id: 'schuetten_value', label: 'Schütten Wert', type: 'currency', default: true },
        { id: 'created_at', label: 'Erstellt am', type: 'datetime', default: false },
        { id: 'profile_picture_url', label: 'Profilbild URL', type: 'string', default: false }
      ]
    }
  };

  /**
   * Get available datasets
   */
  getDatasets(): DatasetDef[] {
    return Object.values(this.datasets);
  }

  /**
   * Get columns for a specific dataset
   */
  getDatasetColumns(datasetId: string): ColumnDef[] {
    return this.datasets[datasetId]?.columns || [];
  }

  /**
   * Get default columns for a dataset
   */
  getDefaultColumns(datasetId: string): string[] {
    const dataset = this.datasets[datasetId];
    if (!dataset) return [];
    return dataset.columns.filter(col => col.default).map(col => col.id);
  }

  /**
   * Get dataset statistics (row counts)
   */
  async getDatasetStats(): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${this.baseUrl}/dataset-stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch dataset stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching dataset stats:', error);
      return {
        wellen_submissions: 0,
        markets: 0,
        vorverkauf_entries: 0,
        action_history: 0,
        gebietsleiter: 0
      };
    }
  }

  /**
   * Export to Excel
   */
  async exportToExcel(config: ExportConfig): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = config.options?.fileName || 'export.xlsx';
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/i.exec(contentDisposition);
        if (matches && matches[1]) {
          fileName = matches[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }
}

export const exportService = new ExportService();
