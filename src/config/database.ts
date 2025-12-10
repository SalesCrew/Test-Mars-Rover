// Database configuration
export const DB_CONFIG = {
  // Update these values based on your database setup
  host: import.meta.env.VITE_DB_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_DB_PORT || '3306'),
  database: import.meta.env.VITE_DB_NAME || 'mars_rover',
  user: import.meta.env.VITE_DB_USER || 'root',
  password: import.meta.env.VITE_DB_PASSWORD || '',
};

// API endpoints
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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


