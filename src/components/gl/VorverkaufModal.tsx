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
      p.brand?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    ).slice(0, 30);
  }, [takeOutSearchQuery, allProducts]);

  const filteredReplaceProducts = useMemo(() => {
    const query = replaceSearchQuery.toLowerCase().trim();
    if (!query) return allProducts.slice(0, 30);
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query) ||
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

  // Get smart suggestions - single products and bundles
  const getSuggestions = (): SuggestionBundle[] => {
    if (takeOutProducts.length === 0) return [];
    
    const takeOutBrands = new Set(takeOutProducts.map(p => p.product.brand).filter(Boolean));
    const takeOutTotal = takeOutProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0);
    const avgPrice = takeOutTotal / takeOutProducts.length;
    
    const suggestions: SuggestionBundle[] = [];
    
    // Single product suggestions (same brand or similar price)
    const singleMatches = allProducts
      .filter(p => !takeOutProducts.some(t => t.product.id === p.id))
      .filter(p => !replaceWithProducts.some(r => r.product.id === p.id))
      .filter(p => takeOutBrands.has(p.brand) || Math.abs(p.price - avgPrice) < avgPrice * 0.4)
      .slice(0, 4);
    
    singleMatches.forEach(product => {
      suggestions.push({
        type: 'single',
        title: product.name,
        description: `${product.brand || ''} · ${product.weight || product.content || ''} · €${product.price.toFixed(2)}`,
        products: [product],
        totalValue: product.price
      });
    });
    
    // Bundle suggestions (2-3 products that match total value)
    if (takeOutTotal > 10) {
      const potentialBundleProducts = allProducts
        .filter(p => !takeOutProducts.some(t => t.product.id === p.id))
        .filter(p => !replaceWithProducts.some(r => r.product.id === p.id))
        .filter(p => p.price < takeOutTotal * 0.8)
        .slice(0, 20);
      
      // Try to find a 2-product bundle close to total value
      for (let i = 0; i < Math.min(potentialBundleProducts.length, 10); i++) {
        for (let j = i + 1; j < Math.min(potentialBundleProducts.length, 15); j++) {
          const bundleTotal = potentialBundleProducts[i].price + potentialBundleProducts[j].price;
          if (Math.abs(bundleTotal - takeOutTotal) < takeOutTotal * 0.25) {
            suggestions.push({
              type: 'bundle',
              title: `Bundle: ${potentialBundleProducts[i].name.slice(0, 20)}... + 1`,
              description: `2 Produkte · Wert: €${bundleTotal.toFixed(2)}`,
              products: [potentialBundleProducts[i], potentialBundleProducts[j]],
              totalValue: bundleTotal
            });
            break;
          }
        }
        if (suggestions.filter(s => s.type === 'bundle').length >= 2) break;
      }
    }
    
    return suggestions.slice(0, 6);
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

  // Suggestions Modal - Clean compact design
  if (showSuggestions) {
    const suggestions = getSuggestions();
    
    return (
      <div className={styles.modalOverlay} onClick={() => setShowSuggestions(false)}>
        <div className={styles.suggestionsModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.suggestionsHeader}>
            <Lightbulb size={24} weight="duotone" className={styles.suggestionsHeaderIcon} />
            <div className={styles.suggestionsHeaderText}>
              <h2>Ersatzvorschläge</h2>
              <p>Basierend auf Warenwert €{getTakeOutTotal().toFixed(2)}</p>
            </div>
            <button className={styles.closeBtn} onClick={() => setShowSuggestions(false)}>
              <X size={18} />
            </button>
          </div>

          <div className={styles.suggestionsBody}>
            {suggestions.length > 0 ? (
              <div className={styles.suggestionGrid}>
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className={`${styles.suggestionCard} ${suggestion.type === 'bundle' ? styles.bundleCard : ''}`}
                    onClick={() => handleAddSuggestion(suggestion)}
                  >
                    <div className={styles.suggestionCardIcon}>
                      {suggestion.type === 'bundle' ? <Lightning size={16} weight="fill" /> : <Package size={16} />}
                    </div>
                    <div className={styles.suggestionCardContent}>
                      <span className={styles.suggestionCardTitle}>{suggestion.title}</span>
                      <span className={styles.suggestionCardMeta}>{suggestion.description}</span>
                    </div>
                    <Plus size={16} className={styles.suggestionCardAdd} />
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.noSuggestionsCompact}>
                <Package size={32} weight="thin" />
                <span>Keine Vorschläge</span>
              </div>
            )}

            {replaceWithProducts.length > 0 && (
              <div className={styles.selectedSection}>
                <div className={styles.selectedHeader}>
                  <span>Ausgewählt ({replaceWithProducts.length})</span>
                  <span className={styles.selectedTotal}>{formatPrice(getReplaceTotal())}</span>
                </div>
                <div className={styles.selectedChips}>
                  {replaceWithProducts.map(p => (
                    <div key={p.product.id} className={styles.selectedChip}>
                      <span>{p.product.name.slice(0, 25)}{p.product.name.length > 25 ? '...' : ''}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveReplace(p.product.id); }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.suggestionsActions}>
            <button 
              className={styles.btnSecondary}
              onClick={() => { setShowSuggestions(false); setShowMarketConfirmation(true); }}
            >
              Überspringen
            </button>
            <button 
              className={styles.btnPrimary}
              onClick={() => { setShowSuggestions(false); setShowMarketConfirmation(true); }}
            >
              Weiter <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Market Confirmation Modal - Compact
  if (showMarketConfirmation) {
    const selectedMarket = allMarkets.find(m => m.id === selectedMarketId);
    
    return (
      <div className={styles.modalOverlay} onClick={() => setShowMarketConfirmation(false)}>
        <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.confirmHeader}>
            <Storefront size={20} weight="duotone" />
            <span>Markt bestätigen</span>
          </div>
          
          <div className={styles.confirmBody}>
            <div className={styles.confirmMarket}>
              <strong>{selectedMarket?.chain}</strong>
              <span>{selectedMarket?.address}, {selectedMarket?.city}</span>
            </div>
            
            <div className={styles.confirmStats}>
              <div className={styles.confirmStat}>
                <span>Entnommen</span>
                <strong>{takeOutProducts.length} · {formatPrice(getTakeOutTotal())}</strong>
              </div>
              <div className={styles.confirmStat}>
                <span>Ersetzt</span>
                <strong>{replaceWithProducts.length} · {formatPrice(getReplaceTotal())}</strong>
              </div>
            </div>
          </div>

          <div className={styles.confirmActions}>
            <button className={styles.btnSecondary} onClick={() => setShowMarketConfirmation(false)}>
              Zurück
            </button>
            <button 
              className={styles.btnSuccess} 
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? '...' : <><Check size={16} /> Bestätigen</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success Modal
  if (showConfirmation) {
    return (
      <div className={styles.modalOverlay} onClick={handleCloseConfirmation}>
        <div className={`${styles.successModal} ${isAnimating ? styles.successAnimated : ''}`} onClick={(e) => e.stopPropagation()}>
          <CheckCircle size={56} weight="fill" className={styles.successIcon} />
          <h2>Erfasst!</h2>
          <p>{getTotalQuantity()} Produkte dokumentiert</p>
          <button className={styles.btnPrimary} onClick={handleCloseConfirmation}>
            Fertig
          </button>
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
                    {filteredMarkets.slice(0, 20).map((market) => (
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
                        <span>{product.brand} · {formatPrice(product.price)}</span>
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
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{p.product.name}</span>
                      <span className={styles.productMeta}>{formatPrice(p.product.price)}</span>
                    </div>
                    <div className={styles.qtyControls}>
                      <button onClick={() => handleUpdateTakeOutQty(p.product.id, -1)}><Minus size={12} /></button>
                      <span>{p.quantity}</span>
                      <button onClick={() => handleUpdateTakeOutQty(p.product.id, 1)}><Plus size={12} /></button>
                    </div>
                    <button className={styles.removeBtn} onClick={() => handleRemoveTakeOut(p.product.id)}>
                      <X size={14} />
                    </button>
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
                        <span>{product.brand} · {formatPrice(product.price)}</span>
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
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{p.product.name}</span>
                      <span className={styles.productMeta}>{formatPrice(p.product.price)}</span>
                    </div>
                    <div className={styles.qtyControls}>
                      <button onClick={() => handleUpdateReplaceQty(p.product.id, -1)}><Minus size={12} /></button>
                      <span>{p.quantity}</span>
                      <button onClick={() => handleUpdateReplaceQty(p.product.id, 1)}><Plus size={12} /></button>
                    </div>
                    <button className={styles.removeBtn} onClick={() => handleRemoveReplace(p.product.id)}>
                      <X size={14} />
                    </button>
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
