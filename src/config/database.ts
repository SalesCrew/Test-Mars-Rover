// API Configuration
// All requests go through your backend API to keep credentials secure

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const API_ENDPOINTS = {
  markets: {
    getAll: `${API_BASE_URL}/markets`,
    getById: (id: string) => `${API_BASE_URL}/markets/${id}`,
    create: `${API_BASE_URL}/markets`,
    update: (id: string) => `${API_BASE_URL}/markets/${id}`,
    delete: (id: string) => `${API_BASE_URL}/markets/${id}`,
    import: `${API_BASE_URL}/markets/import`,
  },
};


