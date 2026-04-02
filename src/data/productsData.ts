import type { Product } from '../types/product-types';
import { productService } from '../services/productService';

export type { Product };

// In-memory cache — active products only
let productsCache: Product[] = [];
let isLoaded = false;

// Separate cache for archived-inclusive list (Produkttausch / Entnommen)
let allProductsCache: Product[] = [];
let allProductsLoaded = false;

// Load active products from API
const loadProducts = async (): Promise<Product[]> => {
  try {
    const products = await productService.getAllProducts();
    productsCache = products;
    isLoaded = true;
    return products;
  } catch (error) {
    console.error('Failed to load products from API:', error);
    return [];
  }
};

// Load all products including archived from API
const loadAllProducts = async (): Promise<Product[]> => {
  try {
    const products = await productService.getAllProducts({ includeArchived: true });
    allProductsCache = products;
    allProductsLoaded = true;
    return products;
  } catch (error) {
    console.error('Failed to load all products from API:', error);
    return [];
  }
};

// Get active products (async - loads from API if needed). Used by all screens except Entnommen dropdown.
export const getAllProducts = async (): Promise<Product[]> => {
  if (!isLoaded) {
    await loadProducts();
  }
  return productsCache;
};

// Get all products including archived (async). Used only for the Entnommen dropdown in Produkttausch.
export const getAllProductsIncludingArchived = async (): Promise<Product[]> => {
  if (!allProductsLoaded) {
    await loadAllProducts();
  }
  return allProductsCache;
};

// Get products synchronously (returns cached data)
export const getProductsSync = (): Product[] => {
  return productsCache;
};

// Add products (saves to API and updates cache)
export const addProducts = async (products: Product[]): Promise<void> => {
  try {
    const savedProducts = await productService.createProducts(products);
    productsCache = [...productsCache, ...savedProducts];
    console.log('Products saved to API:', savedProducts.length, 'Total:', productsCache.length);
  } catch (error) {
    console.error('Failed to save products to API:', error);
    throw error;
  }
};

// Update a product (saves to API and updates cache)
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  try {
    const updatedProduct = await productService.updateProduct(id, updates);
    productsCache = productsCache.map(p => p.id === id ? updatedProduct : p);
  } catch (error) {
    console.error('Failed to update product:', error);
    throw error;
  }
};

// Delete a product (deletes from API and updates cache)
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await productService.deleteProduct(id);
    productsCache = productsCache.filter(p => p.id !== id);
  } catch (error) {
    console.error('Failed to delete product:', error);
    throw error;
  }
};

// Refresh products from API
export const refreshProducts = async (): Promise<void> => {
  await loadProducts();
};

// For backwards compatibility
export const allProducts = getProductsSync;
