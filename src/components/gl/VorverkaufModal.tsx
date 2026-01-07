import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Package, MagnifyingGlass, Check, Plus, Minus, Storefront, CheckCircle, TrendUp, CaretDown, CaretUp, Clock, CalendarBlank } from '@phosphor-icons/react';
import type { Market } from '../../types/market-types';
import type { Product } from '../../types/product-types';
import { useAuth } from '../../contexts/AuthContext';
import { vorverkaufWellenService, type VorverkaufWelle } from '../../services/vorverkaufWellenService';
import { getAllProducts } from '../../data/productsData';
import styles from './VorverkaufModal.module.css';

interface VorverkaufModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReasonType = 'OOS' | 'Listungslücke' | 'Platzierung';

interface ProductWithQuantity {
  product: Product;
  quantity: number;
  reason?: ReasonType;
}

const reasonOptions: { value: ReasonType; label: string }[] = [
  { value: 'OOS', label: 'OOS' },
  { value: 'Listungslücke', label: 'Listungslücke' },
  { value: 'Platzierung', label: 'Platzierung' },
];

// Category display names
const getCategoryName = (department: string, productType: string): string => {
  if (department === 'pets' && productType === 'standard') return 'Tiernahrung';
  if (department === 'pets' && productType === 'display') return 'Tiernahrung Displays';
  if (department === 'food' && productType === 'standard') return 'Lebensmittel';
  if (department === 'food' && productType === 'display') return 'Lebensmittel Displays';
  return 'Sonstige';
};

// Format date range
const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const formatOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${start.toLocaleDateString('de-DE', formatOptions)} - ${end.toLocaleDateString('de-DE', formatOptions)}`;
};

export const VorverkaufModal: React.FC<VorverkaufModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  
  // Data states
  const [waves, setWaves] = useState<VorverkaufWelle[]>([]);
  const [waveMarkets, setWaveMarkets] = useState<Market[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingWaves, setIsLoadingWaves] = useState(false);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // Selection states
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<ProductWithQuantity[]>([]);
  const [globalReason, setGlobalReason] = useState<ReasonType | null>(null);
  const [useIndividualReasons, setUseIndividualReasons] = useState(false);
  
  // View states
  const [step, setStep] = useState<'waves' | 'markets' | 'products' | 'confirmation' | 'success'>('waves');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dropdown states
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  
  // Refs
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const marketDropdownRef = useRef<HTMLDivElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const marketSearchInputRef = useRef<HTMLInputElement>(null);

  // Load waves for GL
  useEffect(() => {
    const loadWaves = async () => {
      if (!isOpen || !user?.id) return;
      
      try {
        setIsLoadingWaves(true);
        const fetchedWaves = await vorverkaufWellenService.getWellenForGL(user.id);
        setWaves(fetchedWaves);
      } catch (error) {
        console.error('Error loading vorverkauf waves:', error);
      } finally {
        setIsLoadingWaves(false);
      }
    };
    
    loadWaves();
  }, [isOpen, user?.id]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoadingProducts(true);
        const products = await getAllProducts();
        setAllProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    loadProducts();
  }, [isOpen]);

  // Load markets when wave is selected
  useEffect(() => {
    const loadWaveMarkets = async () => {
      if (!selectedWaveId) return;
      
      try {
        setIsLoadingMarkets(true);
        // Fetch all markets assigned to this wave (no GL filter - admin selected these specifically)
        const markets = await vorverkaufWellenService.getWelleMarkets(selectedWaveId);
        console.log('Loaded wave markets:', markets.length);
        setWaveMarkets(markets);
      } catch (error) {
        console.error('Error loading wave markets:', error);
      } finally {
        setIsLoadingMarkets(false);
      }
    };
    
    loadWaveMarkets();
  }, [selectedWaveId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target as Node)) {
        setIsMarketDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isProductDropdownOpen && productSearchInputRef.current) {
      productSearchInputRef.current.focus();
    }
  }, [isProductDropdownOpen]);

  useEffect(() => {
    if (isMarketDropdownOpen && marketSearchInputRef.current) {
      marketSearchInputRef.current.focus();
    }
  }, [isMarketDropdownOpen]);

  const selectedWave = waves.find(w => w.id === selectedWaveId);
  const selectedMarket = waveMarkets.find(m => m.id === selectedMarketId);
  const totalQuantity = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = selectedProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);

  // Check if all products have reasons (either global or individual)
  const allProductsHaveReasons = useMemo(() => {
    if (!useIndividualReasons) {
      return globalReason !== null;
    }
    return selectedProducts.every(p => p.reason !== undefined);
  }, [selectedProducts, globalReason, useIndividualReasons]);

  // Filter markets based on search
  const filteredMarkets = useMemo(() => {
    const query = marketSearchQuery.toLowerCase().trim();
    if (!query) return waveMarkets;
    
    return waveMarkets.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query) ||
      m.chain.toLowerCase().includes(query)
    );
  }, [marketSearchQuery, waveMarkets]);

  // Split markets into "Meine Märkte" and "Andere Märkte"
  const myMarkets = useMemo(() => 
    filteredMarkets.filter(m => m.gebietsleiter === user?.id), 
    [filteredMarkets, user?.id]
  );
  
  const otherMarkets = useMemo(() => 
    filteredMarkets.filter(m => m.gebietsleiter !== user?.id), 
    [filteredMarkets, user?.id]
  );

  // Filter and group products by category
  const filteredProducts = useMemo(() => {
    const query = productSearchQuery.toLowerCase().trim();
    if (!query) return allProducts;
    
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query))
    );
  }, [productSearchQuery, allProducts]);

  // Group products by department + productType
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(product => {
      const categoryKey = getCategoryName(product.department, product.productType);
      if (!groups[categoryKey]) groups[categoryKey] = [];
      groups[categoryKey].push(product);
    });
    return groups;
  }, [filteredProducts]);

  const handleSelectWave = (waveId: string) => {
    setSelectedWaveId(waveId);
  };

  const handleWeiterToMarkets = () => {
    if (selectedWaveId) {
      setStep('markets');
    }
  };

  const handleSelectMarket = (marketId: string) => {
    setSelectedMarketId(marketId);
  };

  const handleWeiterToProducts = () => {
    if (selectedMarketId) {
      setStep('products');
    }
  };

  const handleAddProduct = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      // Remove if already selected
      setSelectedProducts(selectedProducts.filter(p => p.product.id !== product.id));
    } else {
      // Add with default quantity 1
      setSelectedProducts([...selectedProducts, { product, quantity: 1, reason: useIndividualReasons ? undefined : undefined }]);
    }
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.product.id === productId) {
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    }));
  };

  const handleManualQuantityChange = (productId: string, value: string) => {
    if (value === '') {
      setSelectedProducts(selectedProducts.map(p => 
        p.product.id === productId ? { ...p, quantity: 1 } : p
      ));
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 1) {
        setSelectedProducts(selectedProducts.map(p => 
          p.product.id === productId ? { ...p, quantity: numValue } : p
        ));
      }
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
  };

  const handleSetProductReason = (productId: string, reason: ReasonType) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.product.id === productId ? { ...p, reason } : p
    ));
  };

  const handleToggleIndividualReasons = () => {
    setUseIndividualReasons(!useIndividualReasons);
    if (!useIndividualReasons) {
      // Switching to individual - clear global reason
      setGlobalReason(null);
    } else {
      // Switching to global - clear individual reasons
      setSelectedProducts(selectedProducts.map(p => ({ ...p, reason: undefined })));
    }
  };

  const handleWeiterToConfirmation = () => {
    if (selectedProducts.length > 0 && allProductsHaveReasons) {
      setStep('confirmation');
    }
  };

  const handleSubmit = async () => {
    if (!selectedWaveId || !selectedMarketId || !user?.id || selectedProducts.length === 0 || !allProductsHaveReasons) return;
    
    setIsSubmitting(true);
    try {
      // Prepare products with reasons
      const productsToSubmit = selectedProducts.map(p => ({
        productId: p.product.id,
        quantity: p.quantity,
        reason: (useIndividualReasons ? p.reason : globalReason) as ReasonType
      }));

      // Submit to backend
      await vorverkaufWellenService.submitVorverkauf({
        welleId: selectedWaveId,
        gebietsleiter_id: user.id,
        market_id: selectedMarketId,
        products: productsToSubmit
      });
      
      setStep('success');
    } catch (error) {
      console.error('Error submitting vorverkauf:', error);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'markets') {
      setStep('waves');
      setSelectedMarketId(null);
    } else if (step === 'products') {
      setStep('markets');
    } else if (step === 'confirmation') {
      setStep('products');
    }
  };

  const handleClose = () => {
    // Reset all states
    setSelectedWaveId(null);
    setSelectedMarketId(null);
    setSelectedProducts([]);
    setGlobalReason(null);
    setUseIndividualReasons(false);
    setStep('waves');
    setMarketSearchQuery('');
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    setIsMarketDropdownOpen(false);
    setWaveMarkets([]);
    onClose();
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  if (!isOpen) return null;

  // Get header info based on step
  const getHeaderInfo = () => {
    switch (step) {
      case 'markets':
        return { title: selectedWave?.name || 'Vorverkauf', subtitle: 'Markt auswählen' };
      case 'products':
        return { title: selectedMarket?.name || 'Produkte', subtitle: 'Produkte und Grund auswählen' };
      case 'confirmation':
        return { title: 'Bestätigung', subtitle: 'Überprüfe deine Eingaben' };
      default:
        return { title: 'Vorverkauf', subtitle: 'Wähle eine Kampagne aus' };
    }
  };

  const headerInfo = getHeaderInfo();

  // Status config for pills
  const getStatusConfig = (status: string) => {
    if (status === 'active') {
      return { label: 'Aktiv', color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.1)' };
    }
    return { label: 'Bevorstehend', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' };
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => {
      if (e.target === e.currentTarget && step !== 'success') {
        handleClose();
      }
    }}>
      <div className={`${styles.modal} ${step === 'success' ? styles.successModal : ''} ${step === 'waves' ? styles.waveStep : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        {step !== 'success' && (
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.iconWrapper}>
                <TrendUp size={24} weight="duotone" />
              </div>
              <div>
                <h2 className={styles.title}>{headerInfo.title}</h2>
                <p className={styles.subtitle}>{headerInfo.subtitle}</p>
              </div>
            </div>
            <button className={styles.closeButton} onClick={handleClose} aria-label="Schließen">
              <X size={20} weight="bold" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {step === 'success' ? (
            /* Success Confirmation */
            <div className={styles.successContent}>
              {/* Success Icon */}
              <div className={styles.successIconWrapper}>
                <CheckCircle size={72} weight="fill" className={styles.successCheckIcon} />
              </div>

              {/* Title */}
              <div className={styles.successHeader}>
                <h2 className={styles.successTitle}>Hervorragende Leistung!</h2>
                <p className={styles.successSubtext}>Vorverkauf erfolgreich dokumentiert</p>
              </div>

              {/* Stats Grid - 2 columns */}
              <div className={styles.successStats}>
                <div className={styles.successStat}>
                  <div className={styles.successStatIcon}>
                    <Package size={20} weight="fill" />
                  </div>
                  <div className={styles.successStatInfo}>
                    <div className={styles.successStatValue}>{totalQuantity}</div>
                    <div className={styles.successStatLabel}>Einheiten</div>
                  </div>
                </div>

                <div className={styles.successStat}>
                  <div className={styles.successStatIcon}>
                    <TrendUp size={20} weight="fill" />
                  </div>
                  <div className={styles.successStatInfo}>
                    <div className={styles.successStatValue}>{formatPrice(totalValue)}</div>
                    <div className={styles.successStatLabel}>Gesamtwert</div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className={styles.successDetailsSection}>
                <h3 className={styles.successSectionTitle}>Details</h3>
                <div className={styles.successDetailsList}>
                  <div className={styles.successDetailCard}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>{selectedMarket?.name}</div>
                  </div>
                  <div className={styles.successDetailCard}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>{selectedWave?.name}</div>
                  </div>
                  {selectedProducts.slice(0, 2).map(p => (
                    <div key={p.product.id} className={styles.successDetailCard}>
                      <div className={styles.successDetailCheck}>
                        <Check size={14} weight="bold" />
                      </div>
                      <div className={styles.successDetailText}>
                        {p.product.name}: {p.quantity}x
                      </div>
                    </div>
                  ))}
                  {selectedProducts.length > 2 && (
                    <div className={styles.successDetailCard}>
                      <div className={styles.successDetailCheck}>
                        <Check size={14} weight="bold" />
                      </div>
                      <div className={styles.successDetailText}>
                        +{selectedProducts.length - 2} weitere Produkte
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : step === 'products' ? (
            /* Product Selection View */
            <div className={styles.productSection}>
              {/* Product Dropdown */}
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Produkte auswählen</h3>
              </div>

              {isLoadingProducts ? (
                <div className={styles.loadingState}>Produkte laden...</div>
              ) : (
                <div className={`${styles.dropdownContainer} ${isProductDropdownOpen ? styles.dropdownOpen : ''}`} ref={productDropdownRef}>
                  <button
                    className={`${styles.dropdownButton} ${isProductDropdownOpen ? styles.open : ''}`}
                    onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                  >
                    <span className={styles.dropdownPlaceholder}>
                      Produkt hinzufügen...
                    </span>
                    <CaretDown size={16} className={styles.dropdownChevron} />
                  </button>

                  {isProductDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.searchContainer}>
                        <MagnifyingGlass size={16} className={styles.searchIcon} />
                        <input
                          ref={productSearchInputRef}
                          type="text"
                          className={styles.searchInput}
                          placeholder="Produkt suchen..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className={styles.dropdownScrollArea}>
                        {Object.entries(groupedProducts).map(([category, products]) => (
                          <div key={category} className={styles.dropdownSection}>
                            <div className={styles.categoryLabel}>{category}</div>
                            {products.map(product => (
                              <button
                                key={product.id}
                                className={`${styles.dropdownItem} ${
                                  selectedProducts.some(p => p.product.id === product.id) ? styles.selected : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddProduct(product);
                                }}
                              >
                                <div className={styles.productInfo}>
                                  <div className={styles.productName}>{product.name}</div>
                                  <div className={styles.productDetails}>
                                    {product.weight}
                                  </div>
                                </div>
                                <div className={styles.productPriceInfo}>
                                  <span className={styles.productPrice}>{formatPrice(product.price)}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className={styles.selectedProducts}>
                  {selectedProducts.map(p => (
                    <div key={p.product.id} className={styles.productCard}>
                      <div className={styles.productCardInfo}>
                        <div className={styles.productCardName}>{p.product.name}</div>
                        <div className={styles.productCardMeta}>
                          {p.product.weight}
                        </div>
                        {/* Individual reason selector */}
                        {useIndividualReasons && (
                          <div className={styles.productReasonRow}>
                            {reasonOptions.map(reason => (
                              <button
                                key={reason.value}
                                className={`${styles.productReasonChip} ${p.reason === reason.value ? styles.active : ''}`}
                                onClick={() => handleSetProductReason(p.product.id, reason.value)}
                              >
                                {reason.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={styles.quantityControls}>
                        <button
                          className={styles.quantityButton}
                          onClick={() => handleUpdateQuantity(p.product.id, -1)}
                        >
                          <Minus size={16} weight="bold" />
                        </button>
                        <input
                          type="number"
                          className={styles.quantityInput}
                          value={p.quantity || ''}
                          onChange={(e) => handleManualQuantityChange(p.product.id, e.target.value)}
                          min="1"
                        />
                        <button
                          className={styles.quantityButton}
                          onClick={() => handleUpdateQuantity(p.product.id, 1)}
                        >
                          <Plus size={16} weight="bold" />
                        </button>
                      </div>
                      <div className={styles.productCardPrice}>
                        {formatPrice(p.product.price * p.quantity)}
                      </div>
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveProduct(p.product.id)}
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>
                  ))}
                  <div className={styles.totalValue}>
                    <span>Gesamtwert</span>
                    <span className={styles.totalAmount}>{formatPrice(totalValue)}</span>
                  </div>
                </div>
              )}

              {/* Reason Selection */}
              {selectedProducts.length > 0 && (
                <div className={styles.reasonSection}>
                  <div className={styles.reasonHeader}>
                    <h3 className={styles.sectionTitle}>Grund</h3>
                    <button 
                      className={styles.reasonModeToggle}
                      onClick={handleToggleIndividualReasons}
                    >
                      {useIndividualReasons ? (
                        <>
                          <CaretUp size={14} weight="bold" />
                          <span>Für alle gleich</span>
                        </>
                      ) : (
                        <>
                          <CaretDown size={14} weight="bold" />
                          <span>Pro Produkt</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {!useIndividualReasons && (
                    <div className={styles.reasonButtons}>
                      {reasonOptions.map(reason => (
                        <button
                          key={reason.value}
                          className={`${styles.reasonButton} ${globalReason === reason.value ? styles.reasonSelected : ''}`}
                          onClick={() => setGlobalReason(reason.value)}
                        >
                          {reason.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {useIndividualReasons && (
                    <p className={styles.reasonHint}>
                      Wähle für jedes Produkt oben einen Grund aus
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : step === 'markets' ? (
            /* Market Selection View */
            <div className={styles.marketSection}>
              {isLoadingMarkets ? (
                <div className={styles.loadingState}>Märkte laden...</div>
              ) : waveMarkets.length === 0 ? (
                <div className={styles.emptyState}>
                  <Storefront size={48} weight="regular" />
                  <p>Keine Märkte für diese Kampagne verfügbar.</p>
                </div>
              ) : (
                <>
                  <div className={styles.searchWrapper}>
                    <MagnifyingGlass size={18} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Markt suchen..."
                      value={marketSearchQuery}
                      onChange={(e) => setMarketSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className={styles.marketsList}>
                    {/* Meine Märkte (GL's assigned markets) */}
                    {myMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Meine Märkte</div>
                        {myMarkets.map(market => (
                          <button
                            key={market.id}
                            className={`${styles.marketItem} ${selectedMarketId === market.id ? styles.marketSelected : ''}`}
                            onClick={() => handleSelectMarket(market.id)}
                          >
                            <div className={styles.marketInfo}>
                              <div className={styles.marketName}>{market.name}</div>
                              <div className={styles.marketAddress}>{market.address}, {market.city}</div>
                            </div>
                            <div className={styles.marketChain}>{market.chain}</div>
                            {selectedMarketId === market.id && (
                              <div className={styles.marketCheck}>
                                <Check size={16} weight="bold" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Andere Märkte (other markets) */}
                    {otherMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Andere Märkte</div>
                        {otherMarkets.map(market => (
                          <button
                            key={market.id}
                            className={`${styles.marketItem} ${styles.marketOther} ${selectedMarketId === market.id ? styles.marketSelected : ''}`}
                            onClick={() => handleSelectMarket(market.id)}
                          >
                            <div className={styles.marketInfo}>
                              <div className={styles.marketName}>{market.name}</div>
                              <div className={styles.marketAddress}>{market.address}, {market.city}</div>
                            </div>
                            <div className={styles.marketChain}>{market.chain}</div>
                            {selectedMarketId === market.id && (
                              <div className={styles.marketCheck}>
                                <Check size={16} weight="bold" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : step === 'confirmation' ? (
            /* Confirmation View */
            <div className={styles.confirmationSection}>
              {/* Market Confirmation - ON TOP */}
              <div className={styles.marketConfirmSection}>
                <label className={styles.marketConfirmLabel}>Bist du in diesem Markt?</label>
                <div className={`${styles.dropdownContainer} ${isMarketDropdownOpen ? styles.dropdownOpen : ''}`} ref={marketDropdownRef}>
                  <button
                    className={`${styles.dropdownButton} ${isMarketDropdownOpen ? styles.open : ''}`}
                    onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                  >
                    <Storefront size={16} weight="bold" />
                    <span>{selectedMarket?.name}</span>
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

                      <div className={styles.dropdownScrollArea}>
                        {/* Meine Märkte */}
                        {myMarkets.length > 0 && (
                          <div className={styles.dropdownSection}>
                            <div className={styles.categoryLabel}>Meine Märkte</div>
                            {myMarkets.map(market => (
                              <button
                                key={market.id}
                                className={`${styles.dropdownItem} ${selectedMarketId === market.id ? styles.selected : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMarketId(market.id);
                                  setIsMarketDropdownOpen(false);
                                }}
                              >
                                <div className={styles.productInfo}>
                                  <div className={styles.productName}>{market.name}</div>
                                  <div className={styles.productDetails}>{market.address}, {market.city}</div>
                                </div>
                                {selectedMarketId === market.id && (
                                  <div className={styles.productCheck}>
                                    <Check size={16} weight="bold" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Andere Märkte */}
                        {otherMarkets.length > 0 && (
                          <div className={styles.dropdownSection}>
                            <div className={styles.categoryLabel}>Andere Märkte</div>
                            {otherMarkets.map(market => (
                              <button
                                key={market.id}
                                className={`${styles.dropdownItem} ${styles.dropdownItemOther} ${selectedMarketId === market.id ? styles.selected : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMarketId(market.id);
                                  setIsMarketDropdownOpen(false);
                                }}
                              >
                                <div className={styles.productInfo}>
                                  <div className={styles.productName}>{market.name}</div>
                                  <div className={styles.productDetails}>{market.address}, {market.city}</div>
                                </div>
                                {selectedMarketId === market.id && (
                                  <div className={styles.productCheck}>
                                    <Check size={16} weight="bold" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Box */}
              <div className={styles.confirmSummaryBox}>
                <div className={styles.confirmSummaryRow}>
                  <span className={styles.confirmSummaryLabel}>Kampagne</span>
                  <span className={styles.confirmSummaryValue}>{selectedWave?.name}</span>
                </div>
                <div className={styles.confirmSummaryRow}>
                  <span className={styles.confirmSummaryLabel}>Produkte</span>
                  <span className={styles.confirmSummaryValue}>{totalQuantity} Stück</span>
                </div>
                <div className={styles.confirmSummaryRow}>
                  <span className={styles.confirmSummaryLabel}>Gesamtwert</span>
                  <span className={`${styles.confirmSummaryValue} ${styles.confirmSummaryValueHighlight}`}>{formatPrice(totalValue)}</span>
                </div>
              </div>

              {/* Products List */}
              <div className={styles.confirmProductsSection}>
                <h3 className={styles.confirmProductsTitle}>Produkte</h3>
                <div className={styles.confirmProductsList}>
                  {selectedProducts.map(p => (
                    <div key={p.product.id} className={styles.confirmProductCard}>
                      <div className={styles.confirmProductLeft}>
                        <span className={styles.confirmProductQty}>{p.quantity}x</span>
                        <div className={styles.confirmProductDetails}>
                          <div className={styles.confirmProductName}>{p.product.name}</div>
                          <div className={styles.confirmProductMeta}>{p.product.weight}</div>
                        </div>
                      </div>
                      <div className={styles.confirmProductRight}>
                        <span className={styles.confirmProductReason}>{useIndividualReasons ? p.reason : globalReason}</span>
                        <span className={styles.confirmProductPrice}>{formatPrice(p.product.price * p.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Wave Selection View */
            <div className={styles.wavesSection}>
              {isLoadingWaves ? (
                <div className={styles.loadingState}>Kampagnen laden...</div>
              ) : waves.length === 0 ? (
                <div className={styles.emptyState}>
                  <TrendUp size={48} weight="regular" />
                  <p>Keine aktiven Vorverkauf-Kampagnen verfügbar.</p>
                </div>
              ) : (
                <div className={styles.wavesList}>
                  {waves.map(wave => {
                    const statusConfig = getStatusConfig(wave.status);
                    return (
                      <button
                        key={wave.id}
                        className={`${styles.waveCard} ${selectedWaveId === wave.id ? styles.waveSelected : ''}`}
                        onClick={() => handleSelectWave(wave.id)}
                      >
                        {wave.image && (
                          <div className={styles.waveImageContainer}>
                            <img src={wave.image} alt={wave.name} className={styles.waveImage} />
                          </div>
                        )}
                        <div className={styles.waveInfo}>
                          <div className={styles.waveHeader}>
                            <span className={styles.waveName}>{wave.name}</span>
                            <span 
                              className={styles.wavePill}
                              style={{ 
                                backgroundColor: statusConfig.bgColor,
                                color: statusConfig.color
                              }}
                            >
                              {wave.status === 'active' ? (
                                <TrendUp size={12} weight="bold" />
                              ) : (
                                <Clock size={12} weight="bold" />
                              )}
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className={styles.waveDateRange}>
                            <CalendarBlank size={14} weight="regular" />
                            <span>{formatDateRange(wave.startDate, wave.endDate)}</span>
                          </div>
                        </div>
                        {selectedWaveId === wave.id && (
                          <div className={styles.waveCheck}>
                            <Check size={18} weight="bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${styles.footer} ${step === 'success' ? styles.successFooter : ''}`}>
          {step === 'success' ? (
            <button className={styles.primaryButton} onClick={handleClose}>
              Zurück zum Dashboard
            </button>
          ) : (
            <>
              {step !== 'waves' && (
                <button className={styles.btnSecondary} onClick={handleBack}>
                  Zurück
                </button>
              )}
              <div className={styles.footerSpacer} />
              {step === 'waves' && (
                <button
                  className={`${styles.btnPrimary} ${!selectedWaveId ? styles.btnDisabled : ''}`}
                  onClick={handleWeiterToMarkets}
                  disabled={!selectedWaveId}
                >
                  Weiter
                </button>
              )}
              {step === 'markets' && (
                <button
                  className={`${styles.btnPrimary} ${!selectedMarketId ? styles.btnDisabled : ''}`}
                  onClick={handleWeiterToProducts}
                  disabled={!selectedMarketId}
                >
                  Weiter
                </button>
              )}
              {step === 'products' && (
                <button
                  className={`${styles.btnPrimary} ${selectedProducts.length === 0 || !allProductsHaveReasons ? styles.btnDisabled : ''}`}
                  onClick={handleWeiterToConfirmation}
                  disabled={selectedProducts.length === 0 || !allProductsHaveReasons}
                >
                  Weiter
                </button>
              )}
              {step === 'confirmation' && (
                <button
                  className={`${styles.btnSuccess} ${isSubmitting ? styles.btnDisabled : ''}`}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Speichern...' : 'Bestätigen'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
