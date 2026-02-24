import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Package, MagnifyingGlass, Check, Plus, Minus, Storefront, CheckCircle, TrendUp, CaretDown, CaretUp } from '@phosphor-icons/react';
import type { Market } from '../../types/market-types';
import type { Product } from '../../types/product-types';
import { useAuth } from '../../contexts/AuthContext';
import { vorverkaufService } from '../../services/vorverkaufService';
import { marketService } from '../../services/marketService';
import { wellenService, type PendingDeliverySubmission } from '../../services/wellenService';
import { getAllProducts } from '../../data/productsData';
import styles from './VorverkaufModal.module.css';
import { MarketVisitChoiceModal } from './MarketVisitChoiceModal';
import { VorbestellerDeliveryPhotoModal } from './VorbestellerDeliveryPhotoModal';

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

// Check if a date is within 3 weeks (21 days) from now
const isWithinThreeWeeks = (lastVisitDate: string | null | undefined): boolean => {
  if (!lastVisitDate) return false;
  const lastVisit = new Date(lastVisitDate);
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
  return lastVisit >= threeWeeksAgo;
};

export const VorverkaufModal: React.FC<VorverkaufModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  
  // Data states
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // Selection states
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<ProductWithQuantity[]>([]);
  const [globalReason, setGlobalReason] = useState<ReasonType | null>(null);
  const [useIndividualReasons, setUseIndividualReasons] = useState(false);
  
  // View states - start directly at 'markets' (no wave selection)
  const [step, setStep] = useState<'markets' | 'products' | 'confirmation' | 'success'>('markets');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVisitChoiceModal, setShowVisitChoiceModal] = useState(false);
  
  // Delivery photo modal state
  const [showDeliveryPhotoModal, setShowDeliveryPhotoModal] = useState(false);
  const [pendingDeliverySubmissions, setPendingDeliverySubmissions] = useState<PendingDeliverySubmission[]>([]);
  const [isCheckingDeliveryPhotos, setIsCheckingDeliveryPhotos] = useState(false);
  
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

  // Load all markets when modal opens
  useEffect(() => {
    const loadMarkets = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoadingMarkets(true);
        const dbMarkets = await marketService.getAllMarkets();
        // Transform to Market type
        const markets: Market[] = dbMarkets.map(m => ({
          id: m.id,
          name: m.name,
          address: m.address,
          city: m.city,
          postalCode: m.postalCode,
          chain: m.chain,
          gebietsleiter: m.gebietsleiter,
          frequency: m.frequency || 0,
          currentVisits: m.currentVisits || 0,
          lastVisitDate: m.lastVisitDate,
          isCompleted: false
        }));
        setAllMarkets(markets);
      } catch (error) {
        console.error('Error loading markets:', error);
      } finally {
        setIsLoadingMarkets(false);
      }
    };
    
    loadMarkets();
  }, [isOpen]);

  // Load products when modal opens
  useEffect(() => {
    const loadProducts = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoadingProducts(true);
        const products = await getAllProducts();
        setAllProducts(products.filter(p => p.isActive !== false));
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    loadProducts();
  }, [isOpen]);

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

  const selectedMarket = allMarkets.find(m => m.id === selectedMarketId);
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
    if (!query) return allMarkets;
    
    return allMarkets.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query) ||
      m.chain.toLowerCase().includes(query)
    );
  }, [marketSearchQuery, allMarkets]);

  // Split markets into "Meine Märkte" and "Andere Märkte"
  // Use gebietsleiter_id (GL table ID) NOT user.id (Supabase Auth ID)
  const glId = user?.gebietsleiter_id;
  
  const myMarkets = useMemo(() => 
    filteredMarkets.filter(m => m.gebietsleiter === glId), 
    [filteredMarkets, glId]
  );
  
  const otherMarkets = useMemo(() => 
    filteredMarkets.filter(m => m.gebietsleiter !== glId), 
    [filteredMarkets, glId]
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

  const handleSelectMarket = (marketId: string) => {
    setSelectedMarketId(marketId);
  };

  const handleWeiterToProducts = async () => {
    if (!selectedMarketId) return;
    
    // Check for pending delivery photos before proceeding
    setIsCheckingDeliveryPhotos(true);
    try {
      const pending = await wellenService.getPendingDeliveryPhotos(selectedMarketId);
      if (pending && pending.length > 0) {
        setPendingDeliverySubmissions(pending);
        setShowDeliveryPhotoModal(true);
      } else {
        // No pending photos, proceed directly
        setStep('products');
      }
    } catch (error) {
      console.error('Error checking pending delivery photos:', error);
      // On error, proceed without photo modal
      setStep('products');
    } finally {
      setIsCheckingDeliveryPhotos(false);
    }
  };
  
  // Handler when user uploads delivery photos (one per palette/schütte)
  const handleDeliveryPhotosUpload = async (photos: { submissionId: string; photoBase64: string }[]) => {
    if (photos.length === 0) return;
    await wellenService.uploadDeliveryPhotosPerItem(photos);
  };
  
  // Handler when user skips or finishes delivery photo modal
  const handleDeliveryPhotoComplete = () => {
    setShowDeliveryPhotoModal(false);
    setPendingDeliverySubmissions([]);
    setStep('products');
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

  // Actual submission logic - can be called with or without creating a new visit
  const executeSubmission = async (createNewVisit: boolean) => {
    if (!selectedMarketId || !user?.id || selectedProducts.length === 0 || !allProductsHaveReasons) return;
    
    setIsSubmitting(true);
    try {
      // Prepare products with reasons
      const productsToSubmit = selectedProducts.map(p => ({
        productId: p.product.id,
        quantity: p.quantity,
        reason: (useIndividualReasons ? p.reason : globalReason) as ReasonType
      }));

      // Submit to backend (no longer wave-based)
      await vorverkaufService.submitVorverkauf({
        gebietsleiter_id: user.id,
        market_id: selectedMarketId,
        products: productsToSubmit
      });
      
      // Only record visit if user chose to create a new visit
      if (createNewVisit) {
        try {
          await marketService.recordVisit(selectedMarketId, user.id);
        } catch (visitError) {
          console.warn('Could not record market visit:', visitError);
          // Don't fail the whole submission if visit recording fails
        }
      }
      
      setStep('success');
    } catch (error) {
      console.error('Error submitting vorverkauf:', error);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler when user clicks submit - checks if we need to show visit choice modal
  const handleSubmit = async () => {
    // Find the selected market to check last visit date
    const selectedMarket = allMarkets.find(m => m.id === selectedMarketId);
    
    // Check if last visit was within 3 weeks
    if (selectedMarket && isWithinThreeWeeks(selectedMarket.lastVisitDate)) {
      // Show the choice modal
      setShowVisitChoiceModal(true);
    } else {
      // No recent visit, automatically create new visit
      await executeSubmission(true);
    }
  };

  // Handler when user chooses to create a new visit from the modal
  const handleCreateNewVisit = async () => {
    setShowVisitChoiceModal(false);
    await executeSubmission(true);
  };

  // Handler when user chooses to count to existing visit from the modal
  const handleCountToExisting = async () => {
    setShowVisitChoiceModal(false);
    await executeSubmission(false);
  };

  const handleBack = () => {
    if (step === 'products') {
      setStep('markets');
    } else if (step === 'confirmation') {
      setStep('products');
    }
  };

  const handleClose = () => {
    // Don't reset state - allow user to continue from where they left off
    // Only close dropdowns for cleaner re-entry
    setIsProductDropdownOpen(false);
    setIsMarketDropdownOpen(false);
    onClose();
  };

  // Full reset only on success completion
  const handleSuccessClose = () => {
    setSelectedMarketId(null);
    setSelectedProducts([]);
    setGlobalReason(null);
    setUseIndividualReasons(false);
    setStep('markets');
    setMarketSearchQuery('');
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    setIsMarketDropdownOpen(false);
    setShowVisitChoiceModal(false);
    // Reset delivery photo states
    setShowDeliveryPhotoModal(false);
    setPendingDeliverySubmissions([]);
    setIsCheckingDeliveryPhotos(false);
    onClose();
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  if (!isOpen) return null;

  // Get header info based on step
  const getHeaderInfo = () => {
    switch (step) {
      case 'markets':
        return { title: 'Vorverkauf', subtitle: 'Markt auswählen' };
      case 'products':
        return { title: selectedMarket?.name || 'Produkte', subtitle: 'Produkte und Grund auswählen' };
      case 'confirmation':
        return { title: 'Bestätigung', subtitle: 'Überprüfe deine Eingaben' };
      default:
        return { title: 'Vorverkauf', subtitle: 'Markt auswählen' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className={styles.modalOverlay} onClick={(e) => {
      if (e.target === e.currentTarget && step !== 'success') {
        handleClose();
      }
    }}>
      <div className={`${styles.modal} ${step === 'success' ? styles.successModal : ''}`} onClick={(e) => e.stopPropagation()}>
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
              ) : allMarkets.length === 0 ? (
                <div className={styles.emptyState}>
                  <Storefront size={48} weight="regular" />
                  <p>Keine Märkte verfügbar.</p>
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
          ) : null}
        </div>

        {/* Footer */}
        <div className={`${styles.footer} ${step === 'success' ? styles.successFooter : ''}`}>
          {step === 'success' ? (
            <button className={styles.primaryButton} onClick={handleSuccessClose}>
              Zurück zum Dashboard
            </button>
          ) : (
            <>
              {step !== 'markets' && (
                <button className={styles.btnSecondary} onClick={handleBack}>
                  Zurück
                </button>
              )}
              <div className={styles.footerSpacer} />
              {step === 'markets' && (
                <button
                  className={`${styles.btnPrimary} ${!selectedMarketId || isCheckingDeliveryPhotos ? styles.btnDisabled : ''}`}
                  onClick={handleWeiterToProducts}
                  disabled={!selectedMarketId || isCheckingDeliveryPhotos}
                >
                  {isCheckingDeliveryPhotos ? 'Lädt...' : 'Weiter'}
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

      {/* Market Visit Choice Modal */}
      <MarketVisitChoiceModal
        isOpen={showVisitChoiceModal}
        marketName={allMarkets.find(m => m.id === selectedMarketId)?.name || ''}
        lastVisitDate={allMarkets.find(m => m.id === selectedMarketId)?.lastVisitDate || ''}
        onCreateNewVisit={handleCreateNewVisit}
        onCountToExisting={handleCountToExisting}
        onClose={() => setShowVisitChoiceModal(false)}
      />
      
      {/* Delivery Photo Modal - shown when there are pending submissions from last visit */}
      <VorbestellerDeliveryPhotoModal
        isOpen={showDeliveryPhotoModal}
        marketName={allMarkets.find(m => m.id === selectedMarketId)?.name || ''}
        lastVisitDate={allMarkets.find(m => m.id === selectedMarketId)?.lastVisitDate || ''}
        pendingSubmissions={pendingDeliverySubmissions}
        onUploadPhotos={handleDeliveryPhotosUpload}
        onSkip={handleDeliveryPhotoComplete}
        onClose={() => {
          setShowDeliveryPhotoModal(false);
          setPendingDeliverySubmissions([]);
        }}
      />
    </div>
  );
};
