import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, CaretDown, MagnifyingGlass, Plus, Minus, ArrowsClockwise, Package, Sparkle, Check, ArrowsLeftRight } from '@phosphor-icons/react';
import type { Product, ProductWithQuantity, ReplacementSuggestion } from '../../types/product-types';
import { allProducts } from '../../data/productsData';
import { allMarkets } from '../../data/marketsData';
import { RingLoader } from 'react-spinners';
import { ExchangeSuccessModal } from './ExchangeSuccessModal';
import styles from './ProductCalculator.module.css';

interface ProductCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const ProductCalculator: React.FC<ProductCalculatorProps> = ({ isOpen, onClose, userName = 'Thomas' }) => {
  const [removedProducts, setRemovedProducts] = useState<ProductWithQuantity[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductWithQuantity[]>([]);
  const [suggestions, setSuggestions] = useState<ReplacementSuggestion[]>([]);
  const [showCalculation, setShowCalculation] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCalculationCompleted, setIsCalculationCompleted] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReplacementSuggestion | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const marketDropdownRef = useRef<HTMLDivElement>(null);
  const marketSearchInputRef = useRef<HTMLInputElement>(null);
  
  // Dropdown states for removed products
  const [isRemovedDropdownOpen, setIsRemovedDropdownOpen] = useState(false);
  const [removedSearchQuery, setRemovedSearchQuery] = useState('');
  const removedDropdownRef = useRef<HTMLDivElement>(null);
  const removedSearchInputRef = useRef<HTMLInputElement>(null);
  
  // Dropdown states for available products
  const [isAvailableDropdownOpen, setIsAvailableDropdownOpen] = useState(false);
  const [availableSearchQuery, setAvailableSearchQuery] = useState('');
  const availableDropdownRef = useRef<HTMLDivElement>(null);
  const availableSearchInputRef = useRef<HTMLInputElement>(null);

  // Filter products based on search query
  const filteredRemovedProducts = useMemo(() => {
    const query = removedSearchQuery.toLowerCase().trim();
    if (!query) return allProducts;
    
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    );
  }, [removedSearchQuery]);

  const filteredAvailableProducts = useMemo(() => {
    const query = availableSearchQuery.toLowerCase().trim();
    if (!query) return allProducts;
    
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    );
  }, [availableSearchQuery]);

  // Group products by category
  const groupedRemovedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredRemovedProducts.forEach(product => {
      const key = `${product.category}-${product.subCategory}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    return groups;
  }, [filteredRemovedProducts]);

  const groupedAvailableProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredAvailableProducts.forEach(product => {
      const key = `${product.category}-${product.subCategory}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    return groups;
  }, [filteredAvailableProducts]);

  // Filter markets based on search query
  const filteredMarkets = useMemo(() => {
    const query = marketSearchQuery.toLowerCase().trim();
    if (!query) return allMarkets;
    
    return allMarkets.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query) ||
      m.postalCode.includes(query)
    );
  }, [marketSearchQuery]);

  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return a.name.localeCompare(b.name);
  });

  const uncompletedMarkets = sortedMarkets.filter(m => !m.isCompleted);
  const completedMarkets = sortedMarkets.filter(m => m.isCompleted);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (removedDropdownRef.current && !removedDropdownRef.current.contains(event.target as Node)) {
        setIsRemovedDropdownOpen(false);
      }
      if (availableDropdownRef.current && !availableDropdownRef.current.contains(event.target as Node)) {
        setIsAvailableDropdownOpen(false);
      }
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target as Node)) {
        setIsMarketDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddRemovedProduct = (product: Product) => {
    const existing = removedProducts.find(p => p.product.id === product.id);
    if (existing) {
      // If already selected, remove it (uncheck)
      setRemovedProducts(removedProducts.filter(p => p.product.id !== product.id));
    } else {
      // If not selected, add it with empty quantity
      setRemovedProducts([...removedProducts, { product, quantity: 0 }]);
    }
  };

  const handleAddAvailableProduct = (product: Product) => {
    const existing = availableProducts.find(p => p.product.id === product.id);
    if (existing) {
      // If already selected, remove it (uncheck)
      setAvailableProducts(availableProducts.filter(p => p.product.id !== product.id));
    } else {
      // If not selected, add it with empty quantity
      setAvailableProducts([...availableProducts, { product, quantity: 0 }]);
    }
  };

  const handleUpdateQuantity = (
    productId: string, 
    delta: number, 
    type: 'removed' | 'available'
  ) => {
    const list = type === 'removed' ? removedProducts : availableProducts;
    const setList = type === 'removed' ? setRemovedProducts : setAvailableProducts;
    
    setList(list.map(p => {
      if (p.product.id === productId) {
        const currentQuantity = p.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity + delta);
        return { ...p, quantity: newQuantity };
      }
      return p;
    }));
  };

  const handleRemoveProduct = (productId: string, type: 'removed' | 'available') => {
    if (type === 'removed') {
      setRemovedProducts(removedProducts.filter(p => p.product.id !== productId));
    } else {
      setAvailableProducts(availableProducts.filter(p => p.product.id !== productId));
    }
  };

  const handleManualQuantityChange = (
    productId: string,
    value: string,
    type: 'removed' | 'available'
  ) => {
    const list = type === 'removed' ? removedProducts : availableProducts;
    const setList = type === 'removed' ? setRemovedProducts : setAvailableProducts;
    
    if (value === '') {
      // Allow empty value
      setList(list.map(p => 
        p.product.id === productId ? { ...p, quantity: 0 } : p
      ));
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setList(list.map(p => 
          p.product.id === productId ? { ...p, quantity: numValue } : p
        ));
      }
    }
  };

  const calculateReplacements = () => {
    if (removedProducts.length === 0) return;
    
    setIsCalculating(true);
    setIsCalculationCompleted(false);
    setShowCalculation(true);

    // Simulate calculation delay
    setTimeout(() => {
      const totalRemovedValue = removedProducts.reduce(
        (sum, p) => sum + p.product.price * p.quantity,
        0
      );

      const newSuggestions: ReplacementSuggestion[] = [];

      // If available products are specified, calculate combinations
      if (availableProducts.length > 0) {
        // Generate all possible combinations
        const combinations = generateCombinations(availableProducts, totalRemovedValue);
        newSuggestions.push(...combinations.slice(0, 5)); // Top 5 suggestions
      } else {
        // Generate suggestions from all products
        const allCombinations = generateCombinations(
          allProducts.map(p => ({ product: p, quantity: 1 })),
          totalRemovedValue
        );
        newSuggestions.push(...allCombinations.slice(0, 5));
      }

      setSuggestions(newSuggestions);
      setIsCalculating(false);
      setIsCalculationCompleted(true);
      
      // Show completed state for 1 second, then show results
      setTimeout(() => {
        setIsCalculationCompleted(false);
      }, 1000);
    }, 1500);
  };

  const generateCombinations = (
    products: ProductWithQuantity[],
    targetValue: number
  ): ReplacementSuggestion[] => {
    const singleProductSuggestions: ReplacementSuggestion[] = [];
    const multiProductSuggestions: ReplacementSuggestion[] = [];
    const removedCategory = removedProducts[0]?.product.category;
    const removedBrand = removedProducts[0]?.product.brand;

    // Strategy 1: Single product match
    products.forEach(p => {
      const quantity = Math.ceil(targetValue / p.product.price);
      const totalValue = p.product.price * quantity;
      const valueDiff = Math.abs(totalValue - targetValue);
      
      if (valueDiff <= targetValue * 0.2) { // Within 20%
        singleProductSuggestions.push({
          id: `single-${p.product.id}`,
          products: [{ product: p.product, quantity }],
          totalValue,
          valueDifference: valueDiff,
          matchScore: calculateMatchScore(p.product, removedCategory, removedBrand, valueDiff, targetValue),
          categoryMatch: p.product.category === removedCategory,
          brandMatch: p.product.brand === removedBrand,
        });
      }
    });

    // Strategy 2: Two-product combinations
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const p1 = products[i];
        const p2 = products[j];
        
        // Try different quantity combinations
        for (let q1 = 1; q1 <= 8; q1++) {
          for (let q2 = 1; q2 <= 8; q2++) {
            const totalValue = p1.product.price * q1 + p2.product.price * q2;
            const valueDiff = Math.abs(totalValue - targetValue);
            
            if (valueDiff <= targetValue * 0.2) { // Within 20%
              const avgScore = (
                calculateMatchScore(p1.product, removedCategory, removedBrand, 0, targetValue) +
                calculateMatchScore(p2.product, removedCategory, removedBrand, 0, targetValue)
              ) / 2;
              
              multiProductSuggestions.push({
                id: `combo-${p1.product.id}-${p2.product.id}-${q1}-${q2}`,
                products: [
                  { product: p1.product, quantity: q1 },
                  { product: p2.product, quantity: q2 }
                ],
                totalValue,
                valueDifference: valueDiff,
                matchScore: avgScore - (valueDiff / targetValue) * 15,
                categoryMatch: p1.product.category === removedCategory || p2.product.category === removedCategory,
                brandMatch: p1.product.brand === removedBrand || p2.product.brand === removedBrand,
              });
            }
          }
        }
      }
    }

    // Sort each category by match score
    singleProductSuggestions.sort((a, b) => b.matchScore - a.matchScore);
    multiProductSuggestions.sort((a, b) => b.matchScore - a.matchScore);

    // Ensure fair mix: take top 2-3 from each category
    const mixedSuggestions: ReplacementSuggestion[] = [];
    const maxResults = 5;
    
    // Take 2 best single products
    mixedSuggestions.push(...singleProductSuggestions.slice(0, 2));
    
    // Take 3 best multi-product combinations
    mixedSuggestions.push(...multiProductSuggestions.slice(0, 3));
    
    // If we don't have enough multi-product suggestions, fill with more single products
    if (mixedSuggestions.length < maxResults) {
      const needed = maxResults - mixedSuggestions.length;
      mixedSuggestions.push(...singleProductSuggestions.slice(2, 2 + needed));
    }
    
    // Sort by match score for final ranking
    return mixedSuggestions
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);
  };

  const calculateMatchScore = (
    product: Product,
    targetCategory: string | undefined,
    targetBrand: string | undefined,
    valueDiff: number,
    targetValue: number
  ): number => {
    let score = 100;
    
    // Category match is most important
    if (product.category === targetCategory) {
      score += 30;
    } else {
      score -= 20;
    }
    
    // Brand match is valuable
    if (product.brand === targetBrand) {
      score += 20;
    }
    
    // Value accuracy
    const valueAccuracy = 1 - (valueDiff / targetValue);
    score += valueAccuracy * 30;
    
    return Math.max(0, Math.min(100, score));
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  const getTotalRemovedValue = () => {
    return removedProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);
  };

  const getCategoryLabel = (category: string, subCategory: string) => {
    const labels: Record<string, string> = {
      'food-chocolate': 'Schokolade',
      'food-candy': 'Süßigkeiten',
      'pets-cat food': 'Katzenfutter',
      'pets-dog food': 'Hundefutter',
      'pets-cat treats': 'Katzensnacks',
      'pets-dog treats': 'Hundesnacks',
    };
    return labels[`${category}-${subCategory}`] || subCategory;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.iconWrapper}>
              {showCalculation && !isCalculating ? (
                <Sparkle size={24} weight="duotone" />
              ) : (
                <Package size={24} weight="duotone" />
              )}
            </div>
            <div>
              {showCalculation && !isCalculating ? (
                <>
                  <h2 className={styles.title}>Ersatzvorschläge</h2>
                  <p className={styles.subtitle}>
                    Basierend auf {formatPrice(getTotalRemovedValue())} Warenwert
                  </p>
                </>
              ) : (
                <>
                  <h2 className={styles.title}>Produktrechner</h2>
                  <p className={styles.subtitle}>Ersatzprodukte berechnen</p>
                </>
              )}
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Schließen">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {!showCalculation ? (
            <>
              {/* Removed Products Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Entnommene Produkte</h3>
                <p className={styles.sectionDescription}>
                  Welche Produkte wurden aus dem Regal entfernt?
                </p>

                <div className={`${styles.dropdownContainer} ${isRemovedDropdownOpen ? styles.dropdownOpen : ''}`} ref={removedDropdownRef}>
                  <button
                    className={`${styles.dropdownButton} ${isRemovedDropdownOpen ? styles.open : ''}`}
                    onClick={() => setIsRemovedDropdownOpen(!isRemovedDropdownOpen)}
                  >
                    <span className={styles.dropdownPlaceholder}>
                      Produkt hinzufügen...
                    </span>
                    <CaretDown size={16} className={styles.dropdownChevron} />
                  </button>

                  {isRemovedDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.searchContainer}>
                        <MagnifyingGlass size={16} className={styles.searchIcon} />
                        <input
                          ref={removedSearchInputRef}
                          type="text"
                          className={styles.searchInput}
                          placeholder="Produkt suchen..."
                          value={removedSearchQuery}
                          onChange={(e) => setRemovedSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {Object.entries(groupedRemovedProducts).map(([key, products]) => {
                        const [category, subCategory] = key.split('-');
                        return (
                          <div key={key} className={styles.dropdownSection}>
                            <div className={styles.categoryLabel}>
                              {getCategoryLabel(category, subCategory)}
                            </div>
                            {products.map(product => (
                              <button
                                key={product.id}
                                className={`${styles.dropdownItem} ${
                                  removedProducts.some(p => p.product.id === product.id) ? styles.selected : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddRemovedProduct(product);
                                }}
                              >
                                <div className={styles.productInfo}>
                                  <div className={styles.productName}>{product.name}</div>
                                  <div className={styles.productDetails}>
                                    {product.brand} · {product.packageSize} · {formatPrice(product.price)}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Removed Products */}
                {removedProducts.length > 0 && (
                  <div className={styles.selectedProducts}>
                    {removedProducts.map(p => (
                      <div key={p.product.id} className={styles.productCard}>
                        <div className={styles.productCardInfo}>
                          <div className={styles.productCardName}>{p.product.name}</div>
                          <div className={styles.productCardMeta}>
                            {p.product.brand} · {p.product.packageSize}
                          </div>
                        </div>
                        <div className={styles.quantityControls}>
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateQuantity(p.product.id, -1, 'removed')}
                          >
                            <Minus size={16} weight="bold" />
                        </button>
                        <input
                          type="number"
                          className={styles.quantityInput}
                          value={p.quantity || ''}
                          onChange={(e) => handleManualQuantityChange(p.product.id, e.target.value, 'removed')}
                          min="0"
                          placeholder=" "
                        />
                        <button
                          className={styles.quantityButton}
                          onClick={() => handleUpdateQuantity(p.product.id, 1, 'removed')}
                        >
                          <Plus size={16} weight="bold" />
                        </button>
                      </div>
                      <div className={styles.productCardPrice}>
                        {p.quantity ? formatPrice(p.product.price * p.quantity) : formatPrice(0)}
                      </div>
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveProduct(p.product.id, 'removed')}
                        >
                          <X size={16} weight="bold" />
                        </button>
                      </div>
                    ))}
                    <div className={styles.totalValue}>
                      <span>Gesamtwert</span>
                      <span className={styles.totalAmount}>{formatPrice(getTotalRemovedValue())}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Available Products Section (Optional) */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Verfügbare Produkte <span className={styles.optional}>(Optional)</span>
                </h3>
                <p className={styles.sectionDescription}>
                  Welche Produkte haben Sie als Ersatz dabei?
                </p>

                <div className={`${styles.dropdownContainer} ${isAvailableDropdownOpen ? styles.dropdownOpen : ''}`} ref={availableDropdownRef}>
                  <button
                    className={`${styles.dropdownButton} ${isAvailableDropdownOpen ? styles.open : ''}`}
                    onClick={() => setIsAvailableDropdownOpen(!isAvailableDropdownOpen)}
                  >
                    <span className={styles.dropdownPlaceholder}>
                      Produkt hinzufügen...
                    </span>
                    <CaretDown size={16} className={styles.dropdownChevron} />
                  </button>

                  {isAvailableDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.searchContainer}>
                        <MagnifyingGlass size={16} className={styles.searchIcon} />
                        <input
                          ref={availableSearchInputRef}
                          type="text"
                          className={styles.searchInput}
                          placeholder="Produkt suchen..."
                          value={availableSearchQuery}
                          onChange={(e) => setAvailableSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {Object.entries(groupedAvailableProducts).map(([key, products]) => {
                        const [category, subCategory] = key.split('-');
                        return (
                          <div key={key} className={styles.dropdownSection}>
                            <div className={styles.categoryLabel}>
                              {getCategoryLabel(category, subCategory)}
                            </div>
                            {products.map(product => (
                              <button
                                key={product.id}
                                className={`${styles.dropdownItem} ${
                                  availableProducts.some(p => p.product.id === product.id) ? styles.selected : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddAvailableProduct(product);
                                }}
                              >
                                <div className={styles.productInfo}>
                                  <div className={styles.productName}>{product.name}</div>
                                  <div className={styles.productDetails}>
                                    {product.brand} · {product.packageSize} · {formatPrice(product.price)}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Available Products */}
                {availableProducts.length > 0 && (
                  <div className={styles.selectedProducts}>
                    {availableProducts.map(p => (
                      <div key={p.product.id} className={styles.productCard}>
                        <div className={styles.productCardInfo}>
                          <div className={styles.productCardName}>{p.product.name}</div>
                          <div className={styles.productCardMeta}>
                            {p.product.brand} · {p.product.packageSize}
                          </div>
                        </div>
                        <div className={styles.quantityControls}>
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateQuantity(p.product.id, -1, 'available')}
                          >
                            <Minus size={16} weight="bold" />
                        </button>
                        <input
                          type="number"
                          className={styles.quantityInput}
                          value={p.quantity || ''}
                          onChange={(e) => handleManualQuantityChange(p.product.id, e.target.value, 'available')}
                          min="0"
                          placeholder=" "
                        />
                        <button
                          className={styles.quantityButton}
                          onClick={() => handleUpdateQuantity(p.product.id, 1, 'available')}
                        >
                          <Plus size={16} weight="bold" />
                        </button>
                      </div>
                      <div className={styles.productCardPrice}>
                        {p.quantity ? formatPrice(p.product.price * p.quantity) : '∞'}
                      </div>
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveProduct(p.product.id, 'available')}
                        >
                          <X size={16} weight="bold" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Calculation Results */
            <div className={styles.resultsSection}>
              {isCalculating ? (
                <div className={styles.calculatingState}>
                  <RingLoader color="#3B82F6" size={80} />
                  <h3 className={styles.calculatingTitle}>Berechne Ersatzoptionen...</h3>
                  <p className={styles.calculatingText}>
                    Finde die perfekte Kombination für Sie
                  </p>
                </div>
              ) : isCalculationCompleted ? (
                <div className={styles.calculatingState}>
                  <div className={styles.completedAnimation}>
                    <div className={styles.completedPulse}></div>
                    <div className={styles.completedCircle}>
                      <Check size={40} weight="bold" />
                    </div>
                  </div>
                  <h3 className={styles.calculatingTitle}>Berechnung abgeschlossen!</h3>
                  <p className={styles.calculatingText}>
                    Ihre Ersatzoptionen sind bereit
                  </p>
                </div>
              ) : (
                <>
                  <div className={styles.suggestions}>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.id}
                        className={`${styles.suggestionCard} ${selectedSuggestion?.id === suggestion.id ? styles.selected : ''}`}
                        onClick={() => setSelectedSuggestion(suggestion)}
                      >
                        <div className={styles.suggestionHeader}>
                          <div className={styles.suggestionRank}>{index + 1}</div>
                          <div className={styles.matchScore}>
                            {Math.round(suggestion.matchScore)}% Match
                          </div>
                          <div className={styles.suggestionMeta}>
                            {suggestion.categoryMatch && (
                              <div className={styles.badge}>Gleiche Kategorie</div>
                            )}
                            {suggestion.brandMatch && (
                              <div className={styles.badge}>Gleiche Marke</div>
                            )}
                          </div>
                        </div>

                        <div className={styles.suggestionProducts}>
                          {suggestion.products.map(p => (
                            <div key={p.product.id} className={styles.suggestionProduct}>
                              <div className={styles.suggestionProductInfo}>
                                <div className={styles.suggestionProductName}>
                                  {p.quantity}x {p.product.name}
                                </div>
                                <div className={styles.suggestionProductMeta}>
                                  {p.product.brand} · {p.product.packageSize}
                                </div>
                              </div>
                              <div className={styles.suggestionProductPrice}>
                                {formatPrice(p.product.price * p.quantity)}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className={styles.suggestionFooter}>
                          <div className={styles.suggestionTotal}>
                            <span>Gesamtwert</span>
                            <span className={styles.suggestionTotalValue}>
                              {formatPrice(suggestion.totalValue)}
                            </span>
                          </div>
                          {suggestion.valueDifference <= 0.01 ? (
                            <div className={styles.valueDifference}>
                              Perfekter Match
                            </div>
                          ) : (
                            <div className={styles.valueDifference}>
                              {suggestion.valueDifference > 0 ? '+' : ''}
                              {formatPrice(suggestion.valueDifference)} Differenz
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {showCalculation && !isCalculating && !isCalculationCompleted ? (
            <>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => {
                  setShowCalculation(false);
                  setSuggestions([]);
                  setSelectedSuggestion(null);
                }}
              >
                Zurück
              </button>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => setShowConfirmation(true)}
                disabled={!selectedSuggestion}
              >
                Fertig
              </button>
            </>
          ) : !showCalculation && !isCalculating && !isCalculationCompleted ? (
            <>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={onClose}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={calculateReplacements}
                disabled={removedProducts.length === 0}
              >
                <ArrowsClockwise size={18} weight="bold" />
                Ersatz berechnen
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedSuggestion && (
        <div className={styles.confirmationOverlay} onClick={() => setShowConfirmation(false)}>
          <div className={styles.confirmationModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmationHeader}>
              <div className={styles.confirmationIconWrapper}>
                <ArrowsLeftRight size={32} weight="duotone" />
              </div>
              <div>
                <h2 className={styles.confirmationTitle}>Produkttausch bestätigen</h2>
                <p className={styles.confirmationSubtitle}>
                  Überprüfen Sie den Austausch
                </p>
              </div>
            </div>

            <div className={styles.confirmationContent}>
              {/* Market Selection */}
              <div className={styles.confirmationSection}>
                <label className={styles.confirmationLabel}>Markt auswählen</label>
                <div className={`${styles.dropdownContainer} ${isMarketDropdownOpen ? styles.dropdownOpen : ''}`} ref={marketDropdownRef}>
                  <button
                    className={`${styles.dropdownButton} ${isMarketDropdownOpen ? styles.open : ''}`}
                    onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                  >
                    <span className={selectedMarketId ? styles.dropdownText : styles.dropdownPlaceholder}>
                      {selectedMarketId 
                        ? allMarkets.find(m => m.id === selectedMarketId)?.name 
                        : 'Markt wählen...'}
                    </span>
                    <CaretDown size={16} className={styles.dropdownChevron} />
                  </button>

                  {isMarketDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.searchContainer}>
                        <MagnifyingGlass size={16} className={styles.searchIcon} />
                        <input
                          ref={marketSearchInputRef}
                          type="text"
                          className={styles.searchInput}
                          placeholder="Markt suchen..."
                          value={marketSearchQuery}
                          onChange={(e) => setMarketSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {uncompletedMarkets.length > 0 && (
                        <div className={styles.dropdownSection}>
                          <div className={styles.categoryLabel}>Verfügbare Märkte</div>
                          {uncompletedMarkets.map((market) => (
                            <button
                              key={market.id}
                              className={styles.dropdownItem}
                              onClick={() => {
                                setSelectedMarketId(market.id);
                                setIsMarketDropdownOpen(false);
                                setMarketSearchQuery('');
                              }}
                            >
                              <div className={styles.productInfo}>
                                <div className={styles.productName}>{market.name}</div>
                                <div className={styles.productDetails}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {completedMarkets.length > 0 && (
                        <div className={styles.dropdownSection}>
                          <div className={styles.categoryLabel}>Heute bereits besucht</div>
                          {completedMarkets.map((market) => (
                            <button
                              key={market.id}
                              className={`${styles.dropdownItem} ${styles.completed}`}
                              onClick={() => {
                                setSelectedMarketId(market.id);
                                setIsMarketDropdownOpen(false);
                                setMarketSearchQuery('');
                              }}
                            >
                              <div className={styles.completedCheck}>
                                <Check size={14} weight="bold" color="white" />
                              </div>
                              <div className={styles.productInfo}>
                                <div className={styles.productName}>{market.name}</div>
                                <div className={styles.productDetails}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Exchange Summary */}
              <div className={styles.exchangeSummary}>
                <div className={styles.exchangeBox}>
                  <div className={styles.exchangeLabel}>Entnommen</div>
                  <div className={styles.exchangeProducts}>
                    {removedProducts.map(p => (
                      <div key={p.product.id} className={styles.exchangeProductItem}>
                        <span className={styles.exchangeQuantity}>{p.quantity}x</span>
                        <span className={styles.exchangeProductName}>{p.product.name}</span>
                        <span className={styles.exchangePrice}>{formatPrice(p.product.price * p.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.exchangeTotal}>
                    Gesamt: {formatPrice(getTotalRemovedValue())}
                  </div>
                </div>

                <div className={styles.exchangeArrow}>
                  <ArrowsLeftRight size={24} weight="bold" />
                </div>

                <div className={styles.exchangeBox}>
                  <div className={styles.exchangeLabel}>Ersetzt durch</div>
                  <div className={styles.exchangeProducts}>
                    {selectedSuggestion.products.map(p => (
                      <div key={p.product.id} className={styles.exchangeProductItem}>
                        <span className={styles.exchangeQuantity}>{p.quantity}x</span>
                        <span className={styles.exchangeProductName}>{p.product.name}</span>
                        <span className={styles.exchangePrice}>{formatPrice(p.product.price * p.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.exchangeTotal}>
                    Gesamt: {formatPrice(selectedSuggestion.totalValue)}
                  </div>
                </div>
              </div>

              {selectedSuggestion.valueDifference > 0.01 && (
                <div className={styles.confirmationNote}>
                  <div className={styles.valueDifference}>
                    {selectedSuggestion.valueDifference > 0 ? '+' : ''}
                    {formatPrice(selectedSuggestion.valueDifference)} Differenz
                  </div>
                </div>
              )}
            </div>

            <div className={styles.confirmationFooter}>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => setShowConfirmation(false)}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.button} ${styles.buttonSuccess}`}
                onClick={() => {
                  // Log the exchange (in real app would send to backend)
                  console.log('Exchange confirmed:', {
                    marketId: selectedMarketId,
                    removed: removedProducts,
                    replacement: selectedSuggestion,
                  });
                  // Close confirmation modal and show success modal
                  setShowConfirmation(false);
                  setShowSuccessModal(true);
                }}
                disabled={!selectedMarketId}
              >
                <Check size={18} weight="bold" />
                Tausch bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Success Modal */}
      <ExchangeSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          // Reset everything and close
          setShowSuccessModal(false);
          setShowCalculation(false);
          setRemovedProducts([]);
          setAvailableProducts([]);
          setSuggestions([]);
          setSelectedSuggestion(null);
          setSelectedMarketId(null);
          onClose(); // Close the main ProductCalculator modal
        }}
        marketName={selectedMarketId ? (allMarkets.find(m => m.id === selectedMarketId)?.name || '') : ''}
        removedProductsCount={removedProducts.length}
        replacementProductsCount={selectedSuggestion?.products.length || 0}
        totalValue={selectedSuggestion?.totalValue || 0}
        userName={userName}
      />
    </div>
  );
};

