import { API_ENDPOINTS } from '../config/database';
import type { Product } from '../types/product-types';

// Get all products
export const getAllProducts = async (options?: { includeArchived?: boolean }): Promise<Product[]> => {
  const url = options?.includeArchived
    ? `${API_ENDPOINTS.products.getAll}?includeArchived=true`
    : API_ENDPOINTS.products.getAll;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
};

// Get single product
export const getProductById = async (id: string): Promise<Product> => {
  const response = await fetch(API_ENDPOINTS.products.getById(id));
  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }
  return response.json();
};

// Create products (bulk)
export const createProducts = async (products: Product[]): Promise<Product[]> => {
  const response = await fetch(API_ENDPOINTS.products.create, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(products),
  });

  if (!response.ok) {
    throw new Error('Failed to create products');
  }

  return response.json();
};

// Update product
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  const response = await fetch(API_ENDPOINTS.products.update(id), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update product');
  }

  return response.json();
};

// Archive (soft-delete) a product — hard deletion is intentionally not supported
export const deleteProduct = async (id: string): Promise<void> => {
  const response = await fetch(API_ENDPOINTS.products.archive(id), {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error('Failed to archive product');
  }
};

export const productService = {
  getAllProducts,
  getProductById,
  createProducts,
  updateProduct,
  deleteProduct,
};
