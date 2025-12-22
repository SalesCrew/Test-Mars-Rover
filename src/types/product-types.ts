export interface Product {
  id: string;
  name: string;
  category: 'pets' | 'food';
  subCategory: string; // e.g., 'cat food', 'dog treats', 'chocolate', 'snacks'
  price: number; // in EUR
  weight?: number; // in grams
  volume?: number; // in ml
  packageSize: string; // e.g., '400g', '1.5kg', '200ml'
  palletSize?: number; // units per pallet
  brand: string; // e.g., 'Whiskas', 'Pedigree', 'Mars', 'Snickers'
  sku: string; // Stock Keeping Unit
  orderNumber?: number; // 5-digit order number
}

export interface ProductCalculation {
  removedProducts: ProductWithQuantity[];
  availableProducts: ProductWithQuantity[];
  suggestions: ReplacementSuggestion[];
  totalRemovedValue: number;
}

export interface ProductWithQuantity {
  product: Product;
  quantity: number;
}

export interface ReplacementSuggestion {
  id: string;
  products: ProductWithQuantity[];
  totalValue: number;
  valueDifference: number; // difference from removed value
  matchScore: number; // 0-100, how well it matches (category, brand, etc.)
  categoryMatch: boolean;
  brandMatch: boolean;
}

