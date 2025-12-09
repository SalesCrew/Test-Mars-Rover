import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, CaretDown, MagnifyingGlass, Plus, Minus, Receipt, Check, Storefront, CheckCircle, Package } from '@phosphor-icons/react';
import type { Product } from '../../types/product-types';
import { allProducts } from '../../data/productsData';
import { allMarkets } from '../../data/marketsData';
import styles from './VorverkaufModal.module.css';

interface VorverkaufModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketName?: string;
}

interface ProductWithQuantity {
  product: Product;
  quantity: number;
}

type ReasonType = 'OOS' | 'Listungslücke' | 'Platzierung';

const reasons: { value: ReasonType; label: string }[] = [
  { value: 'OOS', label: 'OOS (Out of Stock)' },
  { value: 'Listungslücke', label: 'Listungslücke' },
  { value: 'Platzierung', label: 'Platzierung (Display)' },
];

export const VorverkaufModal: React.FC<VorverkaufModalProps> = ({ isOpen, onClose }) => {
  const [selectedProducts, setSelectedProducts] = useState<ProductWithQuantity[]>([]);
  const [selectedReason, setSelectedReason] = useState<ReasonType | null>(null);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [showMarketConfirmation, setShowMarketConfirmation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const marketDropdownRef = useRef<HTMLDivElement>(null);
  const marketSearchInputRef = useRef<HTMLInputElement>(null);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    const query = productSearchQuery.toLowerCase().trim();
    if (!query) return allProducts;
    
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.orderNumber?.toString().includes(query)
    );
  }, [productSearchQuery]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(product => {
      const key = `${product.category}-${product.subCategory}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    return groups;
  }, [filteredProducts]);

  const getCategoryLabel = (category: string, subCategory: string) => {
    return `${category} - ${subCategory}`;
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  // Filter markets
  const filteredMarkets = useMemo(() => {
    const query = marketSearchQuery.toLowerCase().trim();
    if (!query) return allMarkets;
    
    return allMarkets.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query)
    );
  }, [marketSearchQuery]);

  const uncompletedMarkets = filteredMarkets.filter(m => !m.isCompleted);
  const completedMarkets = filteredMarkets.filter(m => m.isCompleted);

  // Click outside handlers
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

  // Auto-focus search input
  useEffect(() => {
    if (isProductDropdownOpen && productSearchInputRef.current) {
      setTimeout(() => productSearchInputRef.current?.focus(), 100);
    }
  }, [isProductDropdownOpen]);

  // Animation for success modal
  useEffect(() => {
    if (showConfirmation) {
      setIsAnimating(true);
    }
  }, [showConfirmation]);

  const handleAddProduct = (product: Product) => {
    if (!selectedProducts.some(p => p.product.id === product.id)) {
      setSelectedProducts([...selectedProducts, { product, quantity: 0 }]);
    }
    // Don't close dropdown - allow multiple selections
    setProductSearchQuery('');
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, change: number) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.product.id === productId) {
        const newQuantity = Math.max(0, p.quantity + change);
        return { ...p, quantity: newQuantity };
      }
      return p;
    }));
  };

  const handleManualQuantityChange = (productId: string, value: string) => {
    if (value === '') {
      // Allow empty value
      setSelectedProducts(selectedProducts.map(p =>
        p.product.id === productId ? { ...p, quantity: 0 } : p
      ));
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setSelectedProducts(selectedProducts.map(p =>
          p.product.id === productId ? { ...p, quantity: numValue } : p
        ));
      }
    }
  };

  const getTotalValue = () => {
    return selectedProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);
  };

  const getTotalQuantity = () => {
    return selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  };

  const handleSubmit = () => {
    setShowMarketConfirmation(true);
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setSelectedProducts([]);
    setSelectedReason(null);
    onClose();
  };

  if (!isOpen) return null;

  if (showMarketConfirmation) {
    return (
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
                console.log('Vorverkauf submitted:', {
                  marketId: selectedMarketId,
                  products: selectedProducts,
                  reason: selectedReason,
                  totalValue: getTotalValue(),
                  totalQuantity: getTotalQuantity(),
                });
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
    );
  }

  if (showConfirmation) {
    const currentMarket = allMarkets.find(m => m.id === selectedMarketId);

    return (
      <div className={styles.modalOverlay} onClick={handleCloseConfirmation}>
        <div className={`${styles.successModal} ${isAnimating ? styles.modalAnimated : ''}`} onClick={(e) => e.stopPropagation()}>
          {/* Success Icon */}
          <div className={styles.successIconContainer}>
            <CheckCircle size={72} weight="fill" className={styles.successIcon} />
          </div>

          {/* Title */}
          <div className={styles.titleSection}>
            <h2 className={styles.successTitle}>
              Perfekt erfasst!
            </h2>
            <p className={styles.successSubtitle}>
              Dein Vorverkauf wurde erfolgreich dokumentiert
            </p>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Package size={20} weight="fill" />
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{getTotalQuantity()}</div>
                <div className={styles.statLabel}>Produkte</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Receipt size={20} weight="fill" />
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{selectedReason || 'N/A'}</div>
                <div className={styles.statLabel}>Grund</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <CheckCircle size={20} weight="fill" />
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{formatPrice(getTotalValue())}</div>
                <div className={styles.statLabel}>Warenwert</div>
              </div>
            </div>
          </div>

          {/* Market Info */}
          <div className={styles.marketSection}>
            <h3 className={styles.sectionTitle}>Markt</h3>
            <div className={styles.marketCard}>
              <div className={styles.marketName}>{currentMarket?.name || 'Unbekannt'}</div>
              <div className={styles.marketBadge}>Dokumentiert</div>
            </div>
          </div>

          {/* Products List */}
          <div className={styles.productsSection}>
            <h3 className={styles.sectionTitle}>Vorverkaufte Produkte</h3>
            <div className={styles.productsList}>
              {selectedProducts.map((p, index) => (
                <div key={p.product.id} className={styles.productItem}>
                  <div className={styles.productNumber}>{index + 1}</div>
                  <div className={styles.productDetails}>
                    <div className={styles.productItemName}>{p.product.name}</div>
                    <div className={styles.productItemMeta}>
                      {p.quantity}x · {p.product.brand} · {formatPrice(p.product.price * p.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivational Message */}
          <div className={styles.messageSection}>
            <p className={styles.message}>
              Der Vorverkauf wurde erfasst und ist sofort in deinem Dashboard sichtbar. Weiter so!
            </p>
          </div>

          {/* Close Button */}
          <button className={styles.successCloseButton} onClick={handleCloseConfirmation}>
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.iconWrapper}>
              <Receipt size={24} weight="duotone" />
            </div>
            <div>
              <h2 className={styles.title}>Vorverkauf erfassen</h2>
              <p className={styles.subtitle}>Produkte für Vorverkauf auswählen</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Schließen">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Market Selection */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Markt auswählen</h3>
            <p className={styles.sectionDescription}>Für welchen Markt ist dieser Vorverkauf?</p>

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

          {/* Product Selection */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Produkte auswählen</h3>
            <p className={styles.sectionDescription}>Welche Produkte werden vorverkauft?</p>

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

                  {Object.entries(groupedProducts).map(([key, products]) => {
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
                                {product.orderNumber && <span className={styles.orderNumber}>#{product.orderNumber}</span>}
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

            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <div className={styles.selectedProducts}>
                {selectedProducts.map(p => (
                  <div key={p.product.id} className={styles.productCard}>
                    <div className={styles.productCardInfo}>
                      <div className={styles.productCardName}>{p.product.name}</div>
                      <div className={styles.productCardMeta}>
                        {p.product.orderNumber && <span className={styles.orderNumberBadge}>#{p.product.orderNumber}</span>}
                        {p.product.brand} · {p.product.packageSize}
                      </div>
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
                        min="0"
                        placeholder=" "
                      />
                      <button
                        className={styles.quantityButton}
                        onClick={() => handleUpdateQuantity(p.product.id, 1)}
                      >
                        <Plus size={16} weight="bold" />
                      </button>
                    </div>
                    <div className={styles.productCardPrice}>
                      {p.quantity ? formatPrice(p.product.price * p.quantity) : formatPrice(0)}
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
                  <span className={styles.totalAmount}>{formatPrice(getTotalValue())}</span>
                </div>
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Grund auswählen</h3>
            <p className={styles.sectionDescription}>Warum wird vorverkauft?</p>

            <div className={styles.reasonPills}>
              {reasons.map(reason => (
                <button
                  key={reason.value}
                  className={`${styles.reasonPill} ${selectedReason === reason.value ? styles.selected : ''}`}
                  onClick={() => setSelectedReason(reason.value)}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleSubmit}
            disabled={selectedProducts.length === 0 || !selectedReason || !selectedMarketId}
          >
            <Receipt size={18} weight="bold" />
            Vorverkauf erfassen
          </button>
        </div>
      </div>
    </div>
  );
};

