import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, CaretDown, MagnifyingGlass, Plus, Minus, Receipt, Check, Storefront, CheckCircle, Package, Lightbulb, ArrowRight, Lightning } from '@phosphor-icons/react';
import type { Product } from '../../types/product-types';
import type { Market } from '../../types/market-types';
import { getAllProducts } from '../../data/productsData';
import { marketService } from '../../services/marketService';
import { vorverkaufService } from '../../services/vorverkaufService';
import { useAuth } from '../../contexts/AuthContext';
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

interface SuggestionBundle {
  type: 'single' | 'bundle';
  title: string;
  description: string;
  products: Product[];
  totalValue: number;
}

type ReasonType = 'OOS' | 'Listungslücke' | 'Platzierung';

const reasons: { value: ReasonType; label: string }[] = [
  { value: 'OOS', label: 'OOS' },
  { value: 'Listungslücke', label: 'Listungslücke' },
  { value: 'Platzierung', label: 'Platzierung' },
];

export const VorverkaufModal: React.FC<VorverkaufModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  
  const [takeOutProducts, setTakeOutProducts] = useState<ProductWithQuantity[]>([]);
  const [replaceWithProducts, setReplaceWithProducts] = useState<ProductWithQuantity[]>([]);
  
  const [selectedReason, setSelectedReason] = useState<ReasonType | null>(null);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  
  const [isTakeOutDropdownOpen, setIsTakeOutDropdownOpen] = useState(false);
  const [isReplaceDropdownOpen, setIsReplaceDropdownOpen] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  
  const [takeOutSearchQuery, setTakeOutSearchQuery] = useState('');
  const [replaceSearchQuery, setReplaceSearchQuery] = useState('');
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMarketConfirmation, setShowMarketConfirmation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedBundles, setExpandedBundles] = useState<Set<number>>(new Set());
  
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const takeOutDropdownRef = useRef<HTMLDivElement>(null);
  const replaceDropdownRef = useRef<HTMLDivElement>(null);
  const marketDropdownRef = useRef<HTMLDivElement>(null);
  const takeOutSearchRef = useRef<HTMLInputElement>(null);
  const replaceSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [markets, products] = await Promise.all([
          marketService.getAllMarkets(),
          getAllProducts()
        ]);
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
        })));
        setAllProducts(products);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [isOpen]);

  const filteredTakeOutProducts = useMemo(() => {
    const query = takeOutSearchQuery.toLowerCase().trim();
    if (!query) return allProducts.slice(0, 30);
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.department?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    ).slice(0, 30);
  }, [takeOutSearchQuery, allProducts]);

  const filteredReplaceProducts = useMemo(() => {
    const query = replaceSearchQuery.toLowerCase().trim();
    if (!query) return allProducts.slice(0, 30);
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.department?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    ).slice(0, 30);
  }, [replaceSearchQuery, allProducts]);

  const filteredMarkets = useMemo(() => {
    const query = marketSearchQuery.toLowerCase().trim();
    if (!query) return allMarkets;
    return allMarkets.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.chain.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query)
    );
  }, [marketSearchQuery, allMarkets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (takeOutDropdownRef.current && !takeOutDropdownRef.current.contains(event.target as Node)) {
        setIsTakeOutDropdownOpen(false);
      }
      if (replaceDropdownRef.current && !replaceDropdownRef.current.contains(event.target as Node)) {
        setIsReplaceDropdownOpen(false);
      }
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target as Node)) {
        setIsMarketDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isTakeOutDropdownOpen && takeOutSearchRef.current) {
      setTimeout(() => takeOutSearchRef.current?.focus(), 100);
    }
  }, [isTakeOutDropdownOpen]);

  useEffect(() => {
    if (isReplaceDropdownOpen && replaceSearchRef.current) {
      setTimeout(() => replaceSearchRef.current?.focus(), 100);
    }
  }, [isReplaceDropdownOpen]);

  useEffect(() => {
    if (showConfirmation) setIsAnimating(true);
  }, [showConfirmation]);

  const handleAddTakeOut = (product: Product) => {
    if (!takeOutProducts.some(p => p.product.id === product.id)) {
      setTakeOutProducts([...takeOutProducts, { product, quantity: 1 }]);
    }
    setTakeOutSearchQuery('');
    setIsTakeOutDropdownOpen(false);
  };

  const handleRemoveTakeOut = (productId: string) => {
    setTakeOutProducts(takeOutProducts.filter(p => p.product.id !== productId));
  };

  const handleUpdateTakeOutQty = (productId: string, change: number) => {
    setTakeOutProducts(takeOutProducts.map(p => 
      p.product.id === productId 
        ? { ...p, quantity: Math.max(1, p.quantity + change) } 
        : p
    ));
  };

  const handleAddReplace = (product: Product) => {
    if (!replaceWithProducts.some(p => p.product.id === product.id)) {
      setReplaceWithProducts([...replaceWithProducts, { product, quantity: 1 }]);
    }
    setReplaceSearchQuery('');
    setIsReplaceDropdownOpen(false);
  };

  const handleRemoveReplace = (productId: string) => {
    setReplaceWithProducts(replaceWithProducts.filter(p => p.product.id !== productId));
  };

  const handleUpdateReplaceQty = (productId: string, change: number) => {
    setReplaceWithProducts(replaceWithProducts.map(p => 
      p.product.id === productId 
        ? { ...p, quantity: Math.max(1, p.quantity + change) } 
        : p
    ));
  };

  // Get smart suggestions - single products and bundles (category-aware)
  const getSuggestions = (): SuggestionBundle[] => {
    if (takeOutProducts.length === 0) return [];
    
    const takeOutDepts = takeOutProducts.map(p => p.product.department).filter(Boolean);
    const mainDept = takeOutDepts.length > 0 ? takeOutDepts[0] : null;
    const takeOutTotal = takeOutProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);
    const avgPrice = takeOutTotal / takeOutProducts.reduce((sum, p) => sum + p.quantity, 0);
    
    const suggestions: SuggestionBundle[] = [];
    const usedProductIds = new Set<string>();
    
    // Get available products (excluding already selected)
    const availableProducts = allProducts
      .filter(p => !takeOutProducts.some(t => t.product.id === p.id))
      .filter(p => !replaceWithProducts.some(r => r.product.id === p.id));
    
    // Priority 1: Same department, similar price (best matches)
    const sameDeptSimilarPrice = availableProducts
      .filter(p => p.department === mainDept)
      .filter(p => Math.abs(p.price - avgPrice) < avgPrice * 0.5)
      .sort((a, b) => Math.abs(a.price - avgPrice) - Math.abs(b.price - avgPrice))
      .slice(0, 3);
    
    sameDeptSimilarPrice.forEach(product => {
      if (usedProductIds.has(product.id)) return;
      usedProductIds.add(product.id);
      suggestions.push({
        type: 'single',
        title: product.name,
        description: `${product.weight || product.content || ''} · €${product.price.toFixed(2)}`,
        products: [product],
        totalValue: product.price
      });
    });
    
    // Priority 2: Same department, any price
    const sameDeptAnyPrice = availableProducts
      .filter(p => p.department === mainDept && !usedProductIds.has(p.id))
      .sort((a, b) => Math.abs(a.price - avgPrice) - Math.abs(b.price - avgPrice))
      .slice(0, 3);
    
    sameDeptAnyPrice.forEach(product => {
      if (usedProductIds.has(product.id)) return;
      usedProductIds.add(product.id);
      suggestions.push({
        type: 'single',
        title: product.name,
        description: `${product.weight || product.content || ''} · €${product.price.toFixed(2)}`,
        products: [product],
        totalValue: product.price
      });
    });
    
    // Priority 3: Bundles (2 products from same department that match total value)
    if (takeOutTotal > 5) {
      const bundleCandidates = availableProducts
        .filter(p => p.department === mainDept && !usedProductIds.has(p.id))
        .filter(p => p.price < takeOutTotal * 0.8)
        .slice(0, 15);
      
      const bundlesFound: SuggestionBundle[] = [];
      
      for (let i = 0; i < bundleCandidates.length && bundlesFound.length < 3; i++) {
        for (let j = i + 1; j < bundleCandidates.length; j++) {
          const bundleTotal = bundleCandidates[i].price + bundleCandidates[j].price;
          const diff = Math.abs(bundleTotal - takeOutTotal);
          
          if (diff < takeOutTotal * 0.3) {
            bundlesFound.push({
              type: 'bundle',
              title: `${bundleCandidates[i].name.slice(0, 25)}...`,
              description: `+ ${bundleCandidates[j].name.slice(0, 20)}... · €${bundleTotal.toFixed(2)}`,
              products: [bundleCandidates[i], bundleCandidates[j]],
              totalValue: bundleTotal
            });
            break;
          }
        }
      }
      
      bundlesFound.forEach(b => suggestions.push(b));
    }
    
    // Priority 4: Similar price from any department (fill up to 8-10)
    if (suggestions.length < 8) {
      const similarPriceAnyDept = availableProducts
        .filter(p => !usedProductIds.has(p.id))
        .sort((a, b) => Math.abs(a.price - avgPrice) - Math.abs(b.price - avgPrice))
        .slice(0, 8 - suggestions.length);
      
      similarPriceAnyDept.forEach(product => {
        suggestions.push({
          type: 'single',
          title: product.name,
          description: `${product.weight || product.content || ''} · €${product.price.toFixed(2)}`,
          products: [product],
          totalValue: product.price
        });
      });
    }
    
    return suggestions.slice(0, 10);
  };

  const handleAddSuggestion = (suggestion: SuggestionBundle) => {
    suggestion.products.forEach(product => {
      if (!replaceWithProducts.some(p => p.product.id === product.id)) {
        setReplaceWithProducts(prev => [...prev, { product, quantity: 1 }]);
      }
    });
  };

  const getTakeOutTotal = () => takeOutProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);
  const getReplaceTotal = () => replaceWithProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);
  const getTotalQuantity = () => takeOutProducts.reduce((sum, p) => sum + p.quantity, 0) + replaceWithProducts.reduce((sum, p) => sum + p.quantity, 0);

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  const handleSubmit = () => {
    if (replaceWithProducts.length === 0 && takeOutProducts.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowMarketConfirmation(true);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!selectedMarketId || !selectedReason || !user?.id) return;
    
    setIsSubmitting(true);
    try {
      const allItems = [
        ...takeOutProducts.map(p => ({ product_id: p.product.id, quantity: p.quantity })),
        ...replaceWithProducts.map(p => ({ product_id: p.product.id, quantity: p.quantity }))
      ];
      
      await vorverkaufService.createEntry({
        gebietsleiter_id: user.id,
        market_id: selectedMarketId,
        reason: selectedReason,
        items: allItems
      });
      
      setShowMarketConfirmation(false);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error submitting vorverkauf:', error);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setTakeOutProducts([]);
    setReplaceWithProducts([]);
    setSelectedReason(null);
    setSelectedMarketId(null);
    onClose();
  };

  if (!isOpen) return null;

  // Suggestions Modal - Clean professional design
  if (showSuggestions) {
    const suggestions = getSuggestions();
    const mainDept = takeOutProducts[0]?.product.department;
    const deptLabel = mainDept === 'pets' ? 'Tiernahrung' : mainDept === 'food' ? 'Lebensmittel' : 'Produkte';
    
    return (
      <div className={styles.modalOverlay} onClick={() => setShowSuggestions(false)}>
        <div className={styles.suggestionsModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.suggestionsHeader}>
            <div className={styles.suggestionsHeaderTop}>
              <div className={styles.suggestionsHeaderLeft}>
                <Lightbulb size={22} weight="duotone" className={styles.suggestionsHeaderIcon} />
                <div className={styles.suggestionsHeaderText}>
                  <h2>Ersatzvorschläge</h2>
                  <p>Passende {deptLabel} für €{getTakeOutTotal().toFixed(2)} Warenwert</p>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowSuggestions(false)}>
                <X size={18} />
              </button>
            </div>
            
            {/* Progress indicator */}
            <div className={styles.valueProgress}>
              <div className={styles.valueProgressInfo}>
                <span>Ersetzt: €{getReplaceTotal().toFixed(2)}</span>
                <span className={styles.valueProgressTarget}>Ziel: €{getTakeOutTotal().toFixed(2)}</span>
              </div>
              <div className={styles.valueProgressBar}>
                <div 
                  className={styles.valueProgressFill}
                  style={{ 
                    width: `${Math.min(100, (getReplaceTotal() / getTakeOutTotal()) * 100)}%`,
                    background: getReplaceTotal() >= getTakeOutTotal() ? '#10B981' : '#3B82F6'
                  }}
                />
              </div>
            </div>
          </div>

          {/* What's being replaced summary */}
          <div className={styles.replaceSummary}>
            <div className={styles.replaceSummaryLabel}>
              <span>Entnommen:</span>
              <strong>{takeOutProducts.length} {takeOutProducts.length === 1 ? 'Produkt' : 'Produkte'}</strong>
            </div>
            <div className={styles.replaceSummaryItems}>
              {takeOutProducts.slice(0, 3).map(p => (
                <span key={p.product.id} className={styles.replaceSummaryChip}>
                  {p.product.name.slice(0, 20)}{p.product.name.length > 20 ? '...' : ''} ×{p.quantity}
                </span>
              ))}
              {takeOutProducts.length > 3 && (
                <span className={styles.replaceSummaryMore}>+{takeOutProducts.length - 3} weitere</span>
              )}
            </div>
          </div>

          <div className={styles.suggestionsBody}>
            <div className={styles.suggestionsSectionTitle}>Vorgeschlagene Ersatzprodukte</div>
            
            {suggestions.length > 0 ? (
              <div className={styles.suggestionsList}>
                {suggestions.map((suggestion, idx) => {
                  const isBundle = suggestion.type === 'bundle';
                  const isExpanded = expandedBundles.has(idx);
                  
                  return (
                    <div
                      key={idx}
                      className={`${styles.suggestionItem} ${isBundle ? styles.bundleItem : ''} ${isExpanded ? styles.bundleExpanded : ''}`}
                    >
                      <div 
                        className={styles.suggestionItemMain}
                        onClick={() => {
                          if (isBundle) {
                            setExpandedBundles(prev => {
                              const next = new Set(prev);
                              if (next.has(idx)) next.delete(idx);
                              else next.add(idx);
                              return next;
                            });
                          }
                        }}
                        style={{ cursor: isBundle ? 'pointer' : 'default' }}
                      >
                        <div className={styles.suggestionItemLeft}>
                          <div className={styles.suggestionItemIcon}>
                            {isBundle ? <Lightning size={18} weight="fill" /> : <Package size={18} />}
                          </div>
                          <div className={styles.suggestionItemInfo}>
                            <span className={styles.suggestionItemTitle}>
                              {isBundle ? `Bundle: ${suggestion.products.length} Produkte` : suggestion.title}
                            </span>
                            <span className={styles.suggestionItemMeta}>
                              {isBundle && !isExpanded ? 'Klicken zum Anzeigen' : suggestion.description}
                            </span>
                          </div>
                        </div>
                        <div className={styles.suggestionItemRight}>
                          <span className={styles.suggestionItemPrice}>€{suggestion.totalValue.toFixed(2)}</span>
                          <button 
                            className={styles.suggestionAddBtn}
                            onClick={(e) => { e.stopPropagation(); handleAddSuggestion(suggestion); }}
                          >
                            <Plus size={16} weight="bold" />
                          </button>
                        </div>
                      </div>
                      
                      {isBundle && isExpanded && (
                        <div className={styles.bundleProducts}>
                          {suggestion.products.map((product, pIdx) => (
                            <div key={pIdx} className={styles.bundleProductItem}>
                              <span className={styles.bundleProductName}>{product.name}</span>
                              <span className={styles.bundleProductPrice}>€{product.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.noSuggestions}>
                <Package size={40} weight="thin" />
                <span>Keine passenden Vorschläge gefunden</span>
              </div>
            )}

            {replaceWithProducts.length > 0 && (
              <div className={styles.selectedSection}>
                <div className={styles.selectedSectionTitle}>
                  <Check size={16} weight="bold" />
                  <span>Ausgewählt ({replaceWithProducts.length})</span>
                  <span className={styles.selectedTotal}>€{getReplaceTotal().toFixed(2)}</span>
                </div>
                <div className={styles.selectedList}>
                  {replaceWithProducts.map(p => (
                    <div key={p.product.id} className={styles.selectedItem}>
                      <span className={styles.selectedItemName}>{p.product.name}</span>
                      <span className={styles.selectedItemPrice}>€{(p.product.price * p.quantity).toFixed(2)}</span>
                      <button 
                        className={styles.selectedItemRemove}
                        onClick={(e) => { e.stopPropagation(); handleRemoveReplace(p.product.id); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.suggestionsFooter}>
            <button 
              className={styles.btnSecondary}
              onClick={() => { setShowSuggestions(false); setShowMarketConfirmation(true); }}
            >
              Überspringen
            </button>
            <button 
              className={styles.btnPrimary}
              onClick={() => { setShowSuggestions(false); setShowMarketConfirmation(true); }}
              disabled={replaceWithProducts.length === 0}
            >
              Weiter <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Market Confirmation Modal - Matching ProductCalculator style
  if (showMarketConfirmation) {
    const selectedMarket = allMarkets.find(m => m.id === selectedMarketId);
    
    return (
      <div className={styles.confirmOverlay} onClick={() => setShowMarketConfirmation(false)}>
        <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.confirmHeader}>
            <div className={styles.confirmIconWrapper}>
              <Storefront size={36} weight="duotone" />
            </div>
            <div className={styles.confirmTitleGroup}>
              <h2 className={styles.confirmTitle}>Markt bestätigen</h2>
              <p className={styles.confirmSubtitle}>Ist dies der richtige Markt für diesen Vorverkauf?</p>
            </div>
          </div>
          
          {/* Content */}
          <div className={styles.confirmContent}>
            {/* Market Selection */}
            <div className={styles.confirmSection}>
              <label className={styles.confirmLabel}>Ausgewählter Markt</label>
              <div className={styles.marketDropdownContainer} ref={marketDropdownRef}>
                <button
                  className={`${styles.marketDropdownBtn} ${isMarketDropdownOpen ? styles.open : ''}`}
                  onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                >
                  <span className={styles.marketDropdownText}>
                    {selectedMarket ? (
                      <>
                        <strong>{selectedMarket.chain}</strong>
                        <span>{selectedMarket.address}, {selectedMarket.postalCode} {selectedMarket.city}</span>
                      </>
                    ) : 'Markt wählen...'}
                  </span>
                  <CaretDown size={16} className={styles.marketDropdownChevron} />
                </button>
                
                {isMarketDropdownOpen && (
                  <div className={styles.marketDropdownMenu}>
                    <div className={styles.marketDropdownSearch}>
                      <MagnifyingGlass size={16} />
                      <input
                        type="text"
                        placeholder="Markt suchen..."
                        value={marketSearchQuery}
                        onChange={(e) => setMarketSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className={styles.marketDropdownList}>
                      {filteredMarkets.map((market) => (
                        <button
                          key={market.id}
                          className={`${styles.marketDropdownItem} ${market.id === selectedMarketId ? styles.active : ''}`}
                          onClick={() => {
                            setSelectedMarketId(market.id);
                            setIsMarketDropdownOpen(false);
                            setMarketSearchQuery('');
                          }}
                        >
                          <div className={styles.marketDropdownItemInfo}>
                            <div className={styles.marketDropdownItemName}>{market.chain}</div>
                            <div className={styles.marketDropdownItemAddress}>{market.address}, {market.postalCode} {market.city}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Exchange Summary */}
            <div className={styles.exchangeSummary}>
              <div className={styles.exchangeRow}>
                <div className={styles.exchangeLabel}>Entnommen</div>
                <div className={styles.exchangeValue}>
                  <span className={styles.exchangeCount}>{takeOutProducts.reduce((sum, p) => sum + p.quantity, 0)}×</span>
                  <strong>{formatPrice(getTakeOutTotal())}</strong>
                </div>
              </div>
              <div className={styles.exchangeRow}>
                <div className={styles.exchangeLabel}>Ersetzt</div>
                <div className={styles.exchangeValue}>
                  <span className={styles.exchangeCount}>{replaceWithProducts.reduce((sum, p) => sum + p.quantity, 0)}×</span>
                  <strong>{formatPrice(getReplaceTotal())}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.confirmFooter}>
            <button className={styles.confirmBtnSecondary} onClick={() => setShowMarketConfirmation(false)}>
              Abbrechen
            </button>
            <button 
              className={styles.confirmBtnSuccess} 
              onClick={handleConfirmSubmit}
              disabled={isSubmitting || !selectedMarketId}
            >
              <Check size={18} weight="bold" />
              {isSubmitting ? 'Speichern...' : 'Markt bestätigen'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success Modal - Matching VorbestellerModal style
  if (showConfirmation) {
    return (
      <div className={styles.successOverlay} onClick={handleCloseConfirmation}>
        <div className={`${styles.successModal} ${isAnimating ? styles.successAnimated : ''}`} onClick={(e) => e.stopPropagation()}>
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

            {/* Stats Grid */}
            <div className={styles.successStats}>
              <div className={styles.successStat}>
                <div className={styles.successStatIcon}>
                  <Package size={20} weight="fill" />
                </div>
                <div className={styles.successStatInfo}>
                  <div className={styles.successStatValue}>{getTotalQuantity()}</div>
                  <div className={styles.successStatLabel}>Produkte</div>
                </div>
              </div>

              <div className={styles.successStat}>
                <div className={styles.successStatIcon}>
                  <Receipt size={20} weight="fill" />
                </div>
                <div className={styles.successStatInfo}>
                  <div className={styles.successStatValue}>€{(getTakeOutTotal() + getReplaceTotal()).toFixed(0)}</div>
                  <div className={styles.successStatLabel}>Warenwert</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.successFooter}>
            <button className={styles.successBtn} onClick={handleCloseConfirmation}>
              Zurück zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Modal
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Receipt size={22} weight="duotone" className={styles.headerIcon} />
            <div>
              <h2>Vorverkauf</h2>
              <p>Produkte tauschen</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Market Selection */}
          <div className={styles.field}>
            <label>Markt</label>
            <div className={styles.dropdown} ref={marketDropdownRef}>
              <button
                className={`${styles.dropdownTrigger} ${selectedMarketId ? styles.hasValue : ''}`}
                onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
              >
                <span>
                  {selectedMarketId ? (() => {
                    const m = allMarkets.find(m => m.id === selectedMarketId);
                    return m ? `${m.chain} · ${m.address}` : 'Wählen...';
                  })() : 'Markt wählen...'}
                </span>
                <CaretDown size={14} className={isMarketDropdownOpen ? styles.caretOpen : ''} />
              </button>

              {isMarketDropdownOpen && (
                <div className={styles.dropdownPanel}>
                  <div className={styles.dropdownSearch}>
                    <MagnifyingGlass size={14} />
                    <input
                      type="text"
                      placeholder="Suchen..."
                      value={marketSearchQuery}
                      onChange={(e) => setMarketSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className={styles.dropdownList}>
                    {filteredMarkets.map((market) => (
                      <button
                        key={market.id}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setSelectedMarketId(market.id);
                          setIsMarketDropdownOpen(false);
                          setMarketSearchQuery('');
                        }}
                      >
                        <strong>{market.chain}</strong>
                        <span>{market.address}, {market.city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Take Out Products */}
          <div className={styles.field}>
            <label>Entnehmen <span className={styles.labelHint}>(Was raus?)</span></label>
            <div className={styles.dropdown} ref={takeOutDropdownRef}>
              <button
                className={styles.dropdownTrigger}
                onClick={() => setIsTakeOutDropdownOpen(!isTakeOutDropdownOpen)}
              >
                <Plus size={14} />
                <span>Produkt hinzufügen</span>
                <CaretDown size={14} className={isTakeOutDropdownOpen ? styles.caretOpen : ''} />
              </button>

              {isTakeOutDropdownOpen && (
                <div className={styles.dropdownPanel}>
                  <div className={styles.dropdownSearch}>
                    <MagnifyingGlass size={14} />
                    <input
                      ref={takeOutSearchRef}
                      type="text"
                      placeholder="Produkt suchen..."
                      value={takeOutSearchQuery}
                      onChange={(e) => setTakeOutSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className={styles.dropdownList}>
                    {filteredTakeOutProducts.map((product) => (
                      <button
                        key={product.id}
                        className={styles.dropdownOption}
                        onClick={() => handleAddTakeOut(product)}
                      >
                        <strong>{product.name}</strong>
                        <span>{product.weight || product.content} · {formatPrice(product.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {takeOutProducts.length > 0 && (
              <div className={styles.productsList}>
                {takeOutProducts.map(p => (
                  <div key={p.product.id} className={styles.productRow}>
                    <button className={styles.removeBtn} onClick={() => handleRemoveTakeOut(p.product.id)}>
                      <X size={12} />
                    </button>
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{p.product.name}</span>
                      <span className={styles.productMeta}>{p.product.weight || p.product.content}</span>
                    </div>
                    <span className={styles.productPrice}>{formatPrice(p.product.price * p.quantity)}</span>
                    <div className={styles.quantityControls}>
                      <button className={styles.quantityBtn} onClick={() => handleUpdateTakeOutQty(p.product.id, -1)}>
                        <Minus size={14} weight="bold" />
                      </button>
                      <span className={styles.quantityValue}>{p.quantity}</span>
                      <button className={styles.quantityBtn} onClick={() => handleUpdateTakeOutQty(p.product.id, 1)}>
                        <Plus size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className={styles.productsTotal}>
                  <span>Summe</span>
                  <strong>{formatPrice(getTakeOutTotal())}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Replace With Products */}
          <div className={styles.field}>
            <label>Ersetzen <span className={styles.labelHint}>(Was rein? Optional)</span></label>
            <div className={styles.dropdown} ref={replaceDropdownRef}>
              <button
                className={styles.dropdownTrigger}
                onClick={() => setIsReplaceDropdownOpen(!isReplaceDropdownOpen)}
              >
                <Plus size={14} />
                <span>Ersatzprodukt hinzufügen</span>
                <CaretDown size={14} className={isReplaceDropdownOpen ? styles.caretOpen : ''} />
              </button>

              {isReplaceDropdownOpen && (
                <div className={styles.dropdownPanel}>
                  <div className={styles.dropdownSearch}>
                    <MagnifyingGlass size={14} />
                    <input
                      ref={replaceSearchRef}
                      type="text"
                      placeholder="Produkt suchen..."
                      value={replaceSearchQuery}
                      onChange={(e) => setReplaceSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className={styles.dropdownList}>
                    {filteredReplaceProducts.map((product) => (
                      <button
                        key={product.id}
                        className={styles.dropdownOption}
                        onClick={() => handleAddReplace(product)}
                      >
                        <strong>{product.name}</strong>
                        <span>{product.weight || product.content} · {formatPrice(product.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {replaceWithProducts.length > 0 && (
              <div className={`${styles.productsList} ${styles.replaceList}`}>
                {replaceWithProducts.map(p => (
                  <div key={p.product.id} className={styles.productRow}>
                    <button className={styles.removeBtn} onClick={() => handleRemoveReplace(p.product.id)}>
                      <X size={12} />
                    </button>
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{p.product.name}</span>
                      <span className={styles.productMeta}>{p.product.weight || p.product.content}</span>
                    </div>
                    <span className={styles.productPrice}>{formatPrice(p.product.price * p.quantity)}</span>
                    <div className={styles.quantityControls}>
                      <button className={styles.quantityBtn} onClick={() => handleUpdateReplaceQty(p.product.id, -1)}>
                        <Minus size={14} weight="bold" />
                      </button>
                      <span className={styles.quantityValue}>{p.quantity}</span>
                      <button className={styles.quantityBtn} onClick={() => handleUpdateReplaceQty(p.product.id, 1)}>
                        <Plus size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className={styles.productsTotal}>
                  <span>Summe</span>
                  <strong>{formatPrice(getReplaceTotal())}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div className={styles.field}>
            <label>Grund</label>
            <div className={styles.reasonButtons}>
              {reasons.map(r => (
                <button
                  key={r.value}
                  className={`${styles.reasonBtn} ${selectedReason === r.value ? styles.reasonActive : ''}`}
                  onClick={() => setSelectedReason(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Abbrechen
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={takeOutProducts.length === 0 || !selectedReason || !selectedMarketId || isLoading}
          >
            Erfassen
          </button>
        </div>
      </div>
    </div>
  );
};
