import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, CaretDown, MagnifyingGlass, Plus, Minus, ArrowsClockwise, Package, Sparkle, Check, ArrowsLeftRight, Storefront, Clock } from '@phosphor-icons/react';
import type { Product, ProductWithQuantity, ReplacementSuggestion } from '../../types/product-types';
import type { Market } from '../../types/market-types';
import { getAllProducts } from '../../data/productsData';
import { marketService } from '../../services/marketService';
import { produktersatzService } from '../../services/produktersatzService';
import { useAuth } from '../../contexts/AuthContext';
import { RingLoader } from 'react-spinners';
import { ExchangeSuccessModal } from './ExchangeSuccessModal';
import styles from './ProductCalculator.module.css';

interface ProductCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const ProductCalculator: React.FC<ProductCalculatorProps> = ({ isOpen, onClose, userName = 'Thomas' }) => {
  const { user } = useAuth();
  const [removedProducts, setRemovedProducts] = useState<ProductWithQuantity[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductWithQuantity[]>([]);
  const [suggestions, setSuggestions] = useState<ReplacementSuggestion[]>([]);
  const [showMarketSelection, setShowMarketSelection] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCalculationCompleted, setIsCalculationCompleted] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReplacementSuggestion | null>(null);
  const [showMarketConfirmation, setShowMarketConfirmation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const marketDropdownRef = useRef<HTMLDivElement>(null);
  const marketSearchInputRef = useRef<HTMLInputElement>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [_isLoadingProducts, setIsLoadingProducts] = useState(true);
  void _isLoadingProducts; // Reserved for loading state display
  
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

  // Custom "Personalisiert" card states
  const [isCustomCardEditing, setIsCustomCardEditing] = useState(false);
  const [customProducts, setCustomProducts] = useState<ProductWithQuantity[]>([]);
  const [isCustomDropdownOpen, setIsCustomDropdownOpen] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const customDropdownRef = useRef<HTMLDivElement>(null);
  const customSearchInputRef = useRef<HTMLInputElement>(null);
  const [customSuggestion, setCustomSuggestion] = useState<ReplacementSuggestion | null>(null);

  // Fetch real products and markets from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingProducts(true);
        const [products, markets] = await Promise.all([
          getAllProducts(),
          marketService.getAllMarkets()
        ]);
        setAllProducts(products);
        setAllMarkets(markets.map(m => ({
          id: m.id,
          name: m.name,
          address: m.address,
          city: m.city,
          postalCode: m.postalCode,
          chain: m.chain || '',
          frequency: m.frequency || 12,
          currentVisits: 0,
          lastVisitDate: '',
          isCompleted: false,
          gebietsleiter: m.gebietsleiter,
        })));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Filter products based on search query
  const filteredRemovedProducts = useMemo(() => {
    const query = removedSearchQuery.toLowerCase().trim();
    if (!query) return allProducts;
    
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.department.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query))
    );
  }, [removedSearchQuery, allProducts]);

  const filteredAvailableProducts = useMemo(() => {
    const query = availableSearchQuery.toLowerCase().trim();
    if (!query) return allProducts;
    
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.department.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query))
    );
  }, [availableSearchQuery, allProducts]);

  // Group products by category
  const groupedRemovedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredRemovedProducts.forEach(product => {
      const key = `${product.department}-${product.productType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    return groups;
  }, [filteredRemovedProducts]);

  const groupedAvailableProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredAvailableProducts.forEach(product => {
      const key = `${product.department}-${product.productType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    return groups;
  }, [filteredAvailableProducts]);

  // Filter products for custom card dropdown
  const filteredCustomProducts = useMemo(() => {
    const query = customSearchQuery.toLowerCase().trim();
    if (!query) return allProducts;
    
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.department.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query))
    );
  }, [customSearchQuery, allProducts]);

  const groupedCustomProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredCustomProducts.forEach(product => {
      const key = `${product.department}-${product.productType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    return groups;
  }, [filteredCustomProducts]);

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
  }, [marketSearchQuery, allMarkets]);

  // Split markets into GL's markets and other markets
  // Use gebietsleiter_id (GL table ID) NOT user.id (Supabase Auth ID)
  const glId = user?.gebietsleiter_id;
  
  const glMarkets = useMemo(() => {
    if (!glId) return [];
    return filteredMarkets.filter(m => m.gebietsleiter === glId);
  }, [filteredMarkets, glId]);

  const otherMarkets = useMemo(() => {
    if (!glId) return filteredMarkets;
    return filteredMarkets.filter(m => m.gebietsleiter !== glId);
  }, [filteredMarkets, glId]);

  const sortedGLMarkets = [...glMarkets].sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return a.name.localeCompare(b.name);
  });

  const sortedOtherMarkets = [...otherMarkets].sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return a.name.localeCompare(b.name);
  });

  const uncompletedGLMarkets = sortedGLMarkets.filter(m => !m.isCompleted);
  const completedGLMarkets = sortedGLMarkets.filter(m => m.isCompleted);
  const uncompletedOtherMarkets = sortedOtherMarkets.filter(m => !m.isCompleted);
  const completedOtherMarkets = sortedOtherMarkets.filter(m => m.isCompleted);

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
      if (customDropdownRef.current && !customDropdownRef.current.contains(event.target as Node)) {
        setIsCustomDropdownOpen(false);
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

  // Custom card handlers
  const handleAddCustomProduct = (product: Product) => {
    const existing = customProducts.find(p => p.product.id === product.id);
    if (existing) {
      setCustomProducts(customProducts.filter(p => p.product.id !== product.id));
    } else {
      setCustomProducts([...customProducts, { product, quantity: 1 }]);
    }
    setCustomSearchQuery('');
    setIsCustomDropdownOpen(false);
  };

  const handleUpdateCustomQuantity = (productId: string, delta: number) => {
    setCustomProducts(customProducts.map(p => {
      if (p.product.id === productId) {
        const newQuantity = Math.max(0, (p.quantity || 0) + delta);
        return { ...p, quantity: newQuantity };
      }
      return p;
    }).filter(p => p.quantity > 0));
  };

  const handleManualCustomQuantityChange = (productId: string, value: string) => {
    if (value === '') {
      setCustomProducts(customProducts.map(p => 
        p.product.id === productId ? { ...p, quantity: 0 } : p
      ));
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setCustomProducts(customProducts.map(p => 
          p.product.id === productId ? { ...p, quantity: numValue } : p
        ));
      }
    }
  };

  const handleRemoveCustomProduct = (productId: string) => {
    setCustomProducts(customProducts.filter(p => p.product.id !== productId));
  };

  const handleFinalizeCustomCard = () => {
    if (customProducts.length === 0) return;
    
    const totalValue = customProducts.reduce((sum, p) => sum + (p.product.price * p.quantity), 0);
    const targetValue = getCustomCardTargetValue(); // 10% of removed value
    
    const newCustomSuggestion: ReplacementSuggestion = {
      id: 'custom',
      products: customProducts,
      totalValue,
      valueDifference: totalValue - targetValue, // Difference from 10% target
      matchScore: 100,
      categoryMatch: false,
      brandMatch: false
    };
    
    setCustomSuggestion(newCustomSuggestion);
    setIsCustomCardEditing(false);
  };

  const handleEditCustomCard = () => {
    if (customSuggestion) {
      setCustomProducts(customSuggestion.products);
    }
    setIsCustomCardEditing(true);
    if (selectedSuggestion?.id === 'custom') {
      setSelectedSuggestion(null);
    }
  };

  const calculateReplacements = () => {
    if (removedProducts.length === 0) return;
    
    setIsCalculating(true);
    setIsCalculationCompleted(false);
    setShowCalculation(true);
    setShowMarketSelection(false); // Hide market selection

    // Simulate calculation delay
    setTimeout(() => {
      const totalRemovedValue = removedProducts.reduce(
        (sum, p) => sum + p.product.price * p.quantity,
        0
      );

      // Target is only 10% of removed value
      const targetReplacementValue = totalRemovedValue * 0.1;

      // Get the department(s) of removed products - only replace with same department
      const removedDepartments = new Set(removedProducts.map(p => p.product.department));

      const newSuggestions: ReplacementSuggestion[] = [];

      // Filter products to only include same department (Tiernahrung->Tiernahrung, Lebensmittel->Lebensmittel)
      const eligibleProducts = (availableProducts.length > 0 ? availableProducts : allProducts.map(p => ({ product: p, quantity: 1 })))
        .filter(p => removedDepartments.has(p.product.department));

      if (eligibleProducts.length > 0) {
        const combinations = generateCombinations(eligibleProducts, targetReplacementValue);
        newSuggestions.push(...combinations.slice(0, 5)); // Top 5 suggestions
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
    const removedDepartment = removedProducts[0]?.product.department;
    const removedProductType = removedProducts[0]?.product.productType; // standard vs display
    const removedProductName = removedProducts[0]?.product.name;

    // Strategy 1: Single product match (prioritize same productType for similarity)
    products.forEach(p => {
      const quantity = Math.max(1, Math.ceil(targetValue / p.product.price));
      const totalValue = p.product.price * quantity;
      const valueDiff = Math.abs(totalValue - targetValue);
      
      // Allow wider tolerance (50%) since we're only replacing 10% of value
      if (valueDiff <= targetValue * 0.5 || totalValue >= targetValue * 0.8) {
        singleProductSuggestions.push({
          id: `single-${p.product.id}`,
          products: [{ product: p.product, quantity }],
          totalValue,
          valueDifference: valueDiff,
          matchScore: calculateMatchScore(p.product, removedDepartment, removedProductType, removedProductName, valueDiff, targetValue),
          categoryMatch: p.product.department === removedDepartment,
          brandMatch: p.product.productType === removedProductType,
        });
      }
    });

    // Strategy 2: Two-product combinations (bundle)
    for (let i = 0; i < Math.min(products.length, 20); i++) { // Limit for performance
      for (let j = i + 1; j < Math.min(products.length, 20); j++) {
        const p1 = products[i];
        const p2 = products[j];
        
        // Try different quantity combinations (smaller quantities since 10% target)
        for (let q1 = 1; q1 <= 3; q1++) {
          for (let q2 = 1; q2 <= 3; q2++) {
            const totalValue = p1.product.price * q1 + p2.product.price * q2;
            const valueDiff = Math.abs(totalValue - targetValue);
            
            if (valueDiff <= targetValue * 0.5 || totalValue >= targetValue * 0.8) {
              const avgScore = (
                calculateMatchScore(p1.product, removedDepartment, removedProductType, removedProductName, 0, targetValue) +
                calculateMatchScore(p2.product, removedDepartment, removedProductType, removedProductName, 0, targetValue)
              ) / 2;
              
              multiProductSuggestions.push({
                id: `combo-${p1.product.id}-${p2.product.id}-${q1}-${q2}`,
                products: [
                  { product: p1.product, quantity: q1 },
                  { product: p2.product, quantity: q2 }
                ],
                totalValue,
                valueDifference: valueDiff,
                matchScore: avgScore - (valueDiff / targetValue) * 10,
                categoryMatch: p1.product.department === removedDepartment && p2.product.department === removedDepartment,
                brandMatch: p1.product.productType === removedProductType || p2.product.productType === removedProductType,
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
    
    // Take 3 best multi-product combinations (bundles)
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
    targetDepartment: string | undefined,
    targetProductType: string | undefined,
    targetProductName: string | undefined,
    valueDiff: number,
    targetValue: number
  ): number => {
    let score = 50;
    
    // Department match is mandatory (already filtered, but boost score)
    if (product.department === targetDepartment) {
      score += 25;
    }
    
    // Product type match (standard vs display) - similar products
    if (product.productType === targetProductType) {
      score += 20;
    }
    
    // Similar product name (partial match)
    if (targetProductName && product.name.toLowerCase().includes(targetProductName.toLowerCase().split(' ')[0])) {
      score += 15;
    }
    
    // Value accuracy (how close to 10% target)
    if (targetValue > 0) {
      const valueAccuracy = Math.max(0, 1 - (valueDiff / targetValue));
      score += valueAccuracy * 20;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  const getTotalRemovedValue = () => {
    return removedProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);
  };

  const getCustomCardTotalValue = () => {
    return customProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);
  };

  const getCustomCardTargetValue = () => {
    return getTotalRemovedValue() * 0.1; // 10% of removed value
  };

  const getCustomCardProgress = () => {
    const target = getCustomCardTargetValue();
    if (target === 0) return 0;
    return Math.min((getCustomCardTotalValue() / target) * 100, 100);
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
              ) : showMarketSelection ? (
                <Storefront size={24} weight="duotone" />
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
              ) : showMarketSelection ? (
                <>
                  <h2 className={styles.title}>Markt auswählen</h2>
                  <p className={styles.subtitle}>Zielmarkt festlegen</p>
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
          {showMarketSelection ? (
            /* Market Selection Step */
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Markt auswählen</h3>
              <p className={styles.sectionDescription}>
                Für welchen Markt ist dieser Tausch?
              </p>

              <div className={`${styles.dropdownContainer} ${isMarketDropdownOpen ? styles.dropdownOpen : ''}`} ref={marketDropdownRef}>
                <button
                  className={`${styles.dropdownButton} ${isMarketDropdownOpen ? styles.open : ''}`}
                  onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                >
                  <span className={selectedMarketId ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {selectedMarketId 
                      ? (() => {
                          const market = allMarkets.find(m => m.id === selectedMarketId);
                          return market ? (
                            <>
                              <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{market.chain}</span>
                              <span style={{ opacity: 0.5, marginLeft: '8px' }}>
                                {market.address}, {market.postalCode} {market.city}
                              </span>
                            </>
                          ) : 'Markt wählen...';
                        })()
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

                    {/* GL's Markets */}
                    {(uncompletedGLMarkets.length > 0 || completedGLMarkets.length > 0) && (
                      <>
                        <div className={styles.dropdownSection}>
                          <div className={styles.categoryLabel}>Meine Märkte</div>
                          {uncompletedGLMarkets.map((market) => (
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
                          {completedGLMarkets.map((market) => (
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
                      </>
                    )}

                    {/* Other Markets */}
                    {(uncompletedOtherMarkets.length > 0 || completedOtherMarkets.length > 0) && (
                      <div className={styles.dropdownSection}>
                        <div className={styles.categoryLabel}>Andere Märkte</div>
                        {uncompletedOtherMarkets.map((market) => (
                          <button
                            key={market.id}
                            className={`${styles.dropdownItem} ${styles.otherMarket}`}
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
                        {completedOtherMarkets.map((market) => (
                          <button
                            key={market.id}
                            className={`${styles.dropdownItem} ${styles.completed} ${styles.otherMarket}`}
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
          ) : !showCalculation && !showMarketSelection ? (
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
                                    {product.weight || product.content || '-'}
                                  </div>
                                </div>
                                <div className={styles.productPriceInfo}>
                                  {product.palletSize && (
                                    <span className={styles.palletSize}>{product.palletSize} Stk</span>
                                  )}
                                  <span className={styles.productPrice}>{formatPrice(product.price)}</span>
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
                            {p.product.weight || p.product.content || '-'}
                            {p.product.palletSize && ` · ${p.product.palletSize} Stk`}
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
                                    {product.weight || product.content || '-'}
                                  </div>
                                </div>
                                <div className={styles.productPriceInfo}>
                                  {product.palletSize && (
                                    <span className={styles.palletSize}>{product.palletSize} Stk</span>
                                  )}
                                  <span className={styles.productPrice}>{formatPrice(product.price)}</span>
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
                            {p.product.weight || p.product.content || '-'}
                            {p.product.palletSize && ` · ${p.product.palletSize} Stk`}
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
                    {/* Custom "Personalisiert" Card */}
                    {isCustomCardEditing ? (
                      <div className={`${styles.customCard} ${styles.customCardEditing}`}>
                        <div className={styles.customCardHeader}>
                          <Sparkle size={20} weight="bold" className={styles.customCardIcon} />
                          <span className={styles.customCardTitle}>Personalisiert</span>
                        </div>

                        {/* Progress Bar */}
                        <div className={styles.customProgressSection}>
                          <div className={styles.customProgressLabel}>
                            <span>Fortschritt</span>
                            <span className={styles.customProgressValue}>
                              {formatPrice(getCustomCardTotalValue())} / {formatPrice(getCustomCardTargetValue())}
                            </span>
                          </div>
                          <div className={styles.customProgressBar}>
                            <div 
                              className={styles.customProgressFill}
                              style={{ width: `${getCustomCardProgress()}%` }}
                            />
                          </div>
                        </div>

                        {/* Product Dropdown */}
                        <div className={`${styles.customDropdownContainer} ${isCustomDropdownOpen ? styles.dropdownOpen : ''}`} ref={customDropdownRef}>
                          <button
                            className={`${styles.customDropdownButton} ${isCustomDropdownOpen ? styles.open : ''}`}
                            onClick={() => setIsCustomDropdownOpen(!isCustomDropdownOpen)}
                          >
                            <span className={styles.dropdownPlaceholder}>
                              Produkt hinzufügen...
                            </span>
                            <CaretDown size={16} className={styles.dropdownChevron} />
                          </button>

                          {isCustomDropdownOpen && (
                            <div className={styles.customDropdownMenu}>
                              <div className={styles.searchContainer}>
                                <MagnifyingGlass size={16} className={styles.searchIcon} />
                                <input
                                  ref={customSearchInputRef}
                                  type="text"
                                  className={styles.searchInput}
                                  placeholder="Produkt suchen..."
                                  value={customSearchQuery}
                                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className={styles.dropdownScrollArea}>
                                {Object.entries(groupedCustomProducts).map(([key, products]) => {
                                  const [dept, type] = key.split('-');
                                  const categoryName = getCategoryLabel(dept, type);
                                  
                                  return (
                                    <div key={key} className={styles.dropdownSection}>
                                      <div className={styles.categoryLabel}>{categoryName}</div>
                                      {products.map(product => (
                                        <button
                                          key={product.id}
                                          className={`${styles.dropdownItem} ${
                                            customProducts.some(p => p.product.id === product.id) ? styles.selected : ''
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddCustomProduct(product);
                                          }}
                                        >
                                          <div className={styles.productInfo}>
                                            <div className={styles.productName}>{product.name}</div>
                                            <div className={styles.productDetails}>
                                              {product.weight || product.content || '-'}
                                              {product.palletSize && ` · ${product.palletSize} Stk`}
                                            </div>
                                          </div>
                                          <div className={styles.productPriceInfo}>
                                            <span className={styles.productPrice}>{formatPrice(product.price)}</span>
                                            {customProducts.some(p => p.product.id === product.id) && (
                                              <Check size={16} weight="bold" className={styles.checkIcon} />
                                            )}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Selected Products */}
                        {customProducts.length > 0 && (
                          <div className={styles.customSelectedProducts}>
                            {customProducts.map(p => (
                              <div key={p.product.id} className={styles.customProductCard}>
                                <div className={styles.customProductInfo}>
                                  <div className={styles.customProductName}>{p.product.name}</div>
                                  <div className={styles.customProductMeta}>
                                    {p.product.weight || p.product.content || '-'}
                                  </div>
                                </div>
                                <div className={styles.quantityControls}>
                                  <button
                                    className={styles.quantityButton}
                                    onClick={() => handleUpdateCustomQuantity(p.product.id, -1)}
                                  >
                                    <Minus size={16} weight="bold" />
                                  </button>
                                  <input
                                    type="number"
                                    className={styles.quantityInput}
                                    value={p.quantity || ''}
                                    onChange={(e) => handleManualCustomQuantityChange(p.product.id, e.target.value)}
                                    min="1"
                                  />
                                  <button
                                    className={styles.quantityButton}
                                    onClick={() => handleUpdateCustomQuantity(p.product.id, 1)}
                                  >
                                    <Plus size={16} weight="bold" />
                                  </button>
                                </div>
                                <div className={styles.customProductPrice}>
                                  {formatPrice(p.product.price * p.quantity)}
                                </div>
                                <button
                                  className={styles.removeButton}
                                  onClick={() => handleRemoveCustomProduct(p.product.id)}
                                >
                                  <X size={16} weight="bold" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Fertig Button */}
                        <button
                          className={`${styles.customFinishButton} ${customProducts.length === 0 ? styles.disabled : ''}`}
                          onClick={handleFinalizeCustomCard}
                          disabled={customProducts.length === 0}
                        >
                          <Check size={18} weight="bold" />
                          Fertig
                        </button>
                      </div>
                    ) : customSuggestion ? (
                      <button
                        className={`${styles.customCard} ${styles.customCardFinished} ${selectedSuggestion?.id === 'custom' ? styles.selected : ''}`}
                        onClick={() => setSelectedSuggestion(customSuggestion)}
                      >
                        <div className={styles.customCardHeader}>
                          <Sparkle size={20} weight="bold" className={styles.customCardIcon} />
                          <span className={styles.customCardTitle}>Personalisiert</span>
                          <button
                            className={styles.customEditButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCustomCard();
                            }}
                          >
                            Bearbeiten
                          </button>
                        </div>

                        <div className={styles.suggestionProducts}>
                          {customSuggestion.products.map(p => (
                            <div key={p.product.id} className={styles.suggestionProduct}>
                              <div className={styles.suggestionProductInfo}>
                                <div className={styles.suggestionProductName}>
                                  {p.quantity}x {p.product.name}
                                </div>
                                <div className={styles.suggestionProductMeta}>
                                  {p.product.weight || p.product.content || '-'}
                                  {p.product.palletSize && ` · ${p.product.palletSize} Stk`}
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
                              {formatPrice(customSuggestion.totalValue)}
                            </span>
                          </div>
                          <div className={styles.valueDifference}>
                            {customSuggestion.valueDifference > 0 ? '+' : ''}
                            {formatPrice(customSuggestion.valueDifference)} Differenz
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button
                        className={`${styles.customCard} ${styles.customCardEmpty}`}
                        onClick={() => setIsCustomCardEditing(true)}
                      >
                        <Sparkle size={24} weight="bold" className={styles.customCardIcon} />
                        <span className={styles.customCardTitle}>Personalisiert</span>
                        <span className={styles.customCardSubtitle}>Eigene Kombination erstellen</span>
                      </button>
                    )}

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
                                  {p.product.weight || p.product.content || '-'}
                                  {p.product.palletSize && ` · ${p.product.palletSize} Stk`}
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
                  setShowMarketSelection(true); // Go back to market selection
                  setSuggestions([]);
                  setSelectedSuggestion(null);
                }}
              >
                Zurück
              </button>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => setShowMarketConfirmation(true)}
                disabled={!selectedSuggestion}
              >
                Fertig
              </button>
            </>
          ) : !showCalculation && !isCalculating && !isCalculationCompleted && !showMarketSelection ? (
            <>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={onClose}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => setShowMarketSelection(true)}
                disabled={removedProducts.length === 0}
              >
                <ArrowsClockwise size={18} weight="bold" />
                Weiter
              </button>
            </>
          ) : showMarketSelection && !showCalculation ? (
            <>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => setShowMarketSelection(false)}
              >
                Zurück
              </button>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={calculateReplacements}
                disabled={!selectedMarketId}
              >
                <ArrowsClockwise size={18} weight="bold" />
                Ersatz berechnen
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Market Confirmation Modal */}
      {showMarketConfirmation && selectedSuggestion && (
        <div className={`${styles.confirmationOverlay} ${styles.marketConfirmation}`} onClick={() => setShowMarketConfirmation(false)}>
          <div className={`${styles.confirmationModal} ${styles.marketConfirmation}`} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.confirmationHeader} ${styles.marketConfirmation}`}>
              <div className={`${styles.confirmationIconWrapper} ${styles.marketConfirmation}`}>
                <Storefront size={40} weight="duotone" />
              </div>
              <div>
                <h2 className={`${styles.confirmationTitle} ${styles.marketConfirmation}`}>Markt bestätigen</h2>
                <p className={`${styles.confirmationSubtitle} ${styles.marketConfirmation}`}>
                  Ist dies der richtige Markt für diesen Tausch?
                </p>
              </div>
            </div>

            <div className={styles.confirmationContent}>
              {/* Warning Banner */}
              <div className={styles.warningBanner}>
                <div className={styles.warningIcon}>⚠</div>
                <div className={styles.warningText}>
                  <strong>Achtung:</strong> Bitte überprüfen Sie den ausgewählten Markt sorgfältig, bevor Sie fortfahren.
                </div>
              </div>

              {/* Market Selection */}
              <div className={styles.confirmationSection}>
                <label className={`${styles.confirmationLabel} ${styles.marketConfirmation}`}>Ausgewählter Markt</label>
                <div className={`${styles.dropdownContainer} ${isMarketDropdownOpen ? styles.dropdownOpen : ''}`} ref={marketDropdownRef}>
                  <button
                    className={`${styles.dropdownButton} ${isMarketDropdownOpen ? styles.open : ''}`}
                    onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                  >
                    <span className={selectedMarketId ? styles.dropdownText : styles.dropdownPlaceholder}>
                      {selectedMarketId 
                        ? (() => {
                            const market = allMarkets.find(m => m.id === selectedMarketId);
                            return market ? (
                              <>
                                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{market.chain}</span>
                                <span style={{ opacity: 0.5, marginLeft: '8px' }}>
                                  {market.address}, {market.postalCode} {market.city}
                                </span>
                              </>
                            ) : 'Markt wählen...';
                          })()
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

                      {/* GL's Markets */}
                      {(uncompletedGLMarkets.length > 0 || completedGLMarkets.length > 0) && (
                        <div className={styles.dropdownSection}>
                          <div className={styles.categoryLabel}>Meine Märkte</div>
                          {uncompletedGLMarkets.map((market) => (
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
                          {completedGLMarkets.map((market) => (
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

                      {/* Other Markets */}
                      {(uncompletedOtherMarkets.length > 0 || completedOtherMarkets.length > 0) && (
                        <div className={styles.dropdownSection}>
                          <div className={styles.categoryLabel}>Andere Märkte</div>
                          {uncompletedOtherMarkets.map((market) => (
                            <button
                              key={market.id}
                              className={`${styles.dropdownItem} ${styles.otherMarket}`}
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
                          {completedOtherMarkets.map((market) => (
                            <button
                              key={market.id}
                              className={`${styles.dropdownItem} ${styles.completed} ${styles.otherMarket}`}
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
              </div>

            <div className={styles.confirmationFooter}>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => setShowMarketConfirmation(false)}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.button} ${styles.buttonSuccess}`}
                onClick={() => {
                  setShowMarketConfirmation(false);
                  setShowConfirmation(true);
                }}
                disabled={!selectedMarketId}
              >
                <Check size={18} weight="bold" />
                Markt bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

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
                className={`${styles.button} ${styles.buttonWarning}`}
                disabled={isSubmitting}
                onClick={async () => {
                  if (!selectedMarketId || !selectedSuggestion || !user?.id) return;
                  
                  setIsSubmitting(true);
                  try {
                    // Prepare data for backend with pending status
                    const takeOutItems = removedProducts.map(p => ({
                      product_id: p.product.id,
                      quantity: p.quantity
                    }));
                    
                    const replaceItems = selectedSuggestion.products.map(p => ({
                      product_id: p.product.id,
                      quantity: p.quantity
                    }));
                    
                    await produktersatzService.createEntry({
                      gebietsleiter_id: user.id,
                      market_id: selectedMarketId,
                      reason: 'Produkttausch',
                      notes: `Warenwert: €${getTotalRemovedValue().toFixed(2)} → €${selectedSuggestion.totalValue.toFixed(2)}`,
                      total_value: selectedSuggestion.totalValue,
                      status: 'pending',
                      take_out_items: takeOutItems,
                      replace_items: replaceItems
                    });
                    
                    // Record visit to update market frequency (same day rule)
                    try {
                      await marketService.recordVisit(selectedMarketId, user.id);
                    } catch (visitError) {
                      console.warn('Could not record market visit:', visitError);
                    }
                    
                    // Reset and close with pending-specific message
                    setShowConfirmation(false);
                    setShowCalculation(false);
                    setRemovedProducts([]);
                    setAvailableProducts([]);
                    setSuggestions([]);
                    setSelectedSuggestion(null);
                    setSelectedMarketId(null);
                    alert('Produkttausch wurde vorgemerkt! Sie können ihn später erfüllen.');
                    onClose();
                  } catch (error) {
                    console.error('Error saving pending produktersatz:', error);
                    alert('Fehler beim Vormerken. Bitte versuche es erneut.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                <Clock size={18} weight="bold" />
                Vormerken
              </button>
              <button
                className={`${styles.button} ${styles.buttonSuccess}`}
                disabled={isSubmitting}
                onClick={async () => {
                  if (!selectedMarketId || !selectedSuggestion || !user?.id) return;
                  
                  setIsSubmitting(true);
                  try {
                    // Prepare data for backend
                    const takeOutItems = removedProducts.map(p => ({
                      product_id: p.product.id,
                      quantity: p.quantity
                    }));
                    
                    const replaceItems = selectedSuggestion.products.map(p => ({
                      product_id: p.product.id,
                      quantity: p.quantity
                    }));
                    
                    await produktersatzService.createEntry({
                      gebietsleiter_id: user.id,
                      market_id: selectedMarketId,
                      reason: 'Produkttausch',
                      notes: `Warenwert: €${getTotalRemovedValue().toFixed(2)} → €${selectedSuggestion.totalValue.toFixed(2)}`,
                      total_value: selectedSuggestion.totalValue,
                      take_out_items: takeOutItems,
                      replace_items: replaceItems
                    });
                    
                    // Record visit to update market frequency
                    try {
                      await marketService.recordVisit(selectedMarketId, user.id);
                    } catch (visitError) {
                      console.warn('Could not record market visit:', visitError);
                    }
                    
                    // Close confirmation modal and show success modal
                    setShowConfirmation(false);
                    setShowSuccessModal(true);
                  } catch (error) {
                    console.error('Error submitting produktersatz:', error);
                    alert('Fehler beim Speichern. Bitte versuche es erneut.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                <Check size={18} weight="bold" />
                {isSubmitting ? 'Speichern...' : 'Tausch bestätigen'}
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

