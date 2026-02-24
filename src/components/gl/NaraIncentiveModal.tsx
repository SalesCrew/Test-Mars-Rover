import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, CaretLeft, MagnifyingGlass, Check, Minus, Plus,
  Gift, CheckCircle, Package, Storefront, Spinner
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { marketService } from '../../services/marketService';
import { getAllProducts } from '../../services/productService';
import { naraIncentiveService } from '../../services/naraIncentiveService';
import type { Market } from '../../types/market-types';
import type { Product, ProductWithQuantity } from '../../types/product-types';
import styles from './NaraIncentiveModal.module.css';

interface NaraIncentiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'market' | 'products' | 'success';

const getCategoryLabel = (dept: string, type: string): string => {
  const deptLabel = dept === 'pets' ? 'Tiernahrung' : 'Food';
  const typeLabels: Record<string, string> = {
    standard: 'Standard',
    display: 'Display',
    palette: 'Palette',
    schuette: 'Schütte'
  };
  return `${deptLabel} – ${typeLabels[type] || type}`;
};

const formatPrice = (price: number) => `€${price.toFixed(2)}`;

export const NaraIncentiveModal: React.FC<NaraIncentiveModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('market');

  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [marketSearch, setMarketSearch] = useState('');

  const [selectedProducts, setSelectedProducts] = useState<ProductWithQuantity[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('market');
      setSelectedMarketId(null);
      setMarketSearch('');
      setSelectedProducts([]);
      setProductSearch('');
      setSubmitting(false);
      setIsAnimating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const [markets, products] = await Promise.all([
          marketService.getAllMarkets(),
          getAllProducts()
        ]);
        setAllMarkets(markets as unknown as Market[]);
        setAllProducts(products.filter(p => p.isActive !== false));
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    load();
  }, [isOpen]);

  const glId = user?.id;

  const filteredMarkets = useMemo(() => {
    const q = marketSearch.toLowerCase().trim();
    if (!q) return allMarkets;
    return allMarkets.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.address || '').toLowerCase().includes(q) ||
      (m.city || '').toLowerCase().includes(q) ||
      (m.chain || '').toLowerCase().includes(q)
    );
  }, [allMarkets, marketSearch]);

  const myMarkets = useMemo(() => filteredMarkets.filter(m => m.gebietsleiter === glId), [filteredMarkets, glId]);
  const otherMarkets = useMemo(() => filteredMarkets.filter(m => m.gebietsleiter !== glId), [filteredMarkets, glId]);

  const selectedMarket = useMemo(() => allMarkets.find(m => m.id === selectedMarketId) || null, [allMarkets, selectedMarketId]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    let list = allProducts.filter(p => p.productType === 'standard');
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.weight || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allProducts, productSearch]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of filteredProducts) {
      const key = `${p.department}-${p.productType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return groups;
  }, [filteredProducts]);

  const handleUpdateQuantity = useCallback((productId: string, delta: number) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.product.id === productId) {
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    }));
  }, []);

  const handleManualQuantity = useCallback((productId: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setSelectedProducts(prev => prev.map(p => {
      if (p.product.id === productId) {
        return { ...p, quantity: Math.max(1, num) };
      }
      return p;
    }));
  }, []);

  const handleRemoveProduct = useCallback((productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== productId));
  }, []);

  const handleToggleProduct = useCallback((product: Product) => {
    setSelectedProducts(prev => {
      if (prev.some(p => p.product.id === product.id)) {
        return prev.filter(p => p.product.id !== product.id);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedMarketId || selectedProducts.length === 0 || !glId) return;
    setSubmitting(true);
    try {
      await naraIncentiveService.createSubmission({
        gebietsleiter_id: glId,
        market_id: selectedMarketId,
        items: selectedProducts.map(p => ({
          product_id: p.product.id,
          quantity: p.quantity
        }))
      });
      setStep('success');
      setTimeout(() => setIsAnimating(true), 50);
    } catch (err) {
      console.error('Error submitting NARA-Incentive:', err);
    } finally {
      setSubmitting(false);
    }
  }, [selectedMarketId, selectedProducts, glId]);

  const totalQuantity = useMemo(() => selectedProducts.reduce((sum, p) => sum + p.quantity, 0), [selectedProducts]);
  const totalValue = useMemo(() => selectedProducts.reduce((sum, p) => sum + p.product.price * p.quantity, 0), [selectedProducts]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {step === 'market' && (
          <>
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <div className={styles.headerIcon}>
                  <Gift size={22} weight="duotone" />
                </div>
                <div>
                  <h2 className={styles.title}>NARA-Incentive</h2>
                  <span className={styles.subtitle}>Markt auswählen</span>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.searchWrapper}>
                <MagnifyingGlass size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Markt suchen..."
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                />
              </div>

              <div className={styles.marketsList}>
                {myMarkets.length > 0 && (
                  <div className={styles.marketsGroup}>
                    <div className={styles.groupLabel}>Meine Märkte</div>
                    {myMarkets.map(market => (
                      <button
                        key={market.id}
                        className={`${styles.marketItem} ${selectedMarketId === market.id ? styles.marketSelected : ''}`}
                        onClick={() => setSelectedMarketId(market.id)}
                      >
                        <div className={styles.marketInfo}>
                          <div className={styles.marketName}>{market.name}</div>
                          <div className={styles.marketAddress}>{market.chain} · {market.city}</div>
                        </div>
                        {selectedMarketId === market.id && (
                          <div className={styles.marketCheck}>
                            <Check size={16} weight="bold" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {otherMarkets.length > 0 && (
                  <div className={styles.marketsGroup}>
                    <div className={styles.groupLabel}>Andere Märkte</div>
                    {otherMarkets.map(market => (
                      <button
                        key={market.id}
                        className={`${styles.marketItem} ${selectedMarketId === market.id ? styles.marketSelected : ''}`}
                        onClick={() => setSelectedMarketId(market.id)}
                      >
                        <div className={styles.marketInfo}>
                          <div className={styles.marketName}>{market.name}</div>
                          <div className={styles.marketAddress}>{market.chain} · {market.city}</div>
                        </div>
                        {selectedMarketId === market.id && (
                          <div className={styles.marketCheck}>
                            <Check size={16} weight="bold" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {filteredMarkets.length === 0 && (
                  <div className={styles.emptyState}>Keine Märkte gefunden</div>
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>Abbrechen</button>
              <button
                className={styles.primaryBtn}
                disabled={!selectedMarketId}
                onClick={() => setStep('products')}
              >
                Weiter
              </button>
            </div>
          </>
        )}

        {step === 'products' && (
          <>
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <button className={styles.backBtn} onClick={() => setStep('market')}>
                  <CaretLeft size={18} weight="bold" />
                </button>
                <div>
                  <h2 className={styles.title}>Produkte auswählen</h2>
                  <span className={styles.subtitle}>
                    {selectedMarket?.name} · {selectedMarket?.chain}
                  </span>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.bundleSection}>
                {selectedProducts.length === 0 ? (
                  <div className={styles.bundleEmpty}>
                    <Package size={28} weight="duotone" className={styles.bundleEmptyIcon} />
                    <div className={styles.bundleEmptyText}>Produkte aus der Liste unten auswählen</div>
                  </div>
                ) : (
                  <>
                    <div className={styles.bundleProducts}>
                      {selectedProducts.map(p => (
                        <div key={p.product.id} className={styles.bundleCard}>
                          <div className={styles.bundleProductInfo}>
                            <div className={styles.bundleProductName}>{p.product.name}</div>
                            <div className={styles.bundleProductMeta}>
                              {p.product.weight || p.product.content || '-'}
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
                              value={p.quantity}
                              onChange={(e) => handleManualQuantity(p.product.id, e.target.value)}
                              min="1"
                            />
                            <button
                              className={styles.quantityButton}
                              onClick={() => handleUpdateQuantity(p.product.id, 1)}
                            >
                              <Plus size={16} weight="bold" />
                            </button>
                          </div>
                          <div className={styles.bundleProductPrice}>
                            {formatPrice(p.product.price * p.quantity)}
                          </div>
                          <button
                            className={styles.removeBtn}
                            onClick={() => handleRemoveProduct(p.product.id)}
                          >
                            <X size={16} weight="bold" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.bundleTotal}>
                      <span className={styles.bundleTotalLabel}>Gesamtwert</span>
                      <span className={styles.bundleTotalValue}>{formatPrice(totalValue)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.catalogSection}>
                <div className={styles.catalogLabel}>Alle Produkte</div>
                <div className={styles.searchWrapper}>
                  <MagnifyingGlass size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Produkt suchen..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                {Object.entries(groupedProducts).map(([key, products]) => {
                  const [dept, type] = key.split('-');
                  return (
                    <div key={key}>
                      <div className={styles.categoryLabel}>{getCategoryLabel(dept, type)}</div>
                      {products.map(product => {
                        const isAdded = selectedProducts.some(p => p.product.id === product.id);
                        return (
                          <button
                            key={product.id}
                            className={`${styles.catalogItem} ${isAdded ? styles.catalogItemAdded : ''}`}
                            onClick={() => handleToggleProduct(product)}
                          >
                            <div className={styles.catalogItemInfo}>
                              <div className={styles.catalogItemName}>{product.name}</div>
                              <div className={styles.catalogItemMeta}>
                                {product.weight || product.content || '-'}
                                {product.palletSize ? ` · ${product.palletSize} Stk` : ''}
                              </div>
                            </div>
                            <div className={styles.catalogItemRight}>
                              <span className={styles.catalogItemPrice}>{formatPrice(product.price)}</span>
                              {isAdded && <Check size={16} weight="bold" className={styles.checkIcon} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>Abbrechen</button>
              <button
                className={styles.submitBtn}
                disabled={selectedProducts.length === 0 || submitting}
                onClick={handleSubmit}
              >
                {submitting ? <Spinner size={18} className={styles.spinner} /> : 'Einreichen'}
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className={`${styles.successContent} ${isAnimating ? styles.successAnimated : ''}`}>
            <div className={styles.successIcon}>
              <CheckCircle size={72} weight="fill" />
            </div>

            <div className={styles.successTitle}>
              Perfekt gemacht{user?.firstName ? `, ${user.firstName}` : ''}!
            </div>
            <div className={styles.successSubtitle}>
              NARA-Incentive erfolgreich dokumentiert
            </div>

            <div className={styles.successStats}>
              <div className={styles.successStat}>
                <div className={styles.successStatIcon}>
                  <Package size={20} weight="fill" />
                </div>
                <div className={styles.successStatValue}>{totalQuantity}</div>
                <div className={styles.successStatLabel}>Einheiten</div>
              </div>
              <div className={styles.successStat}>
                <div className={styles.successStatIcon}>
                  <Storefront size={20} weight="fill" />
                </div>
                <div className={styles.successStatValue}>{selectedProducts.length}</div>
                <div className={styles.successStatLabel}>Produkte</div>
              </div>
            </div>

            <div className={styles.successDetails}>
              <div className={styles.successSectionTitle}>Details</div>
              <div className={styles.successDetailRow}>
                <div className={styles.successDetailCheck}>
                  <Check size={14} weight="bold" />
                </div>
                <div className={styles.successDetailText}>
                  {selectedMarket?.name} · {selectedMarket?.chain}
                </div>
              </div>
              {selectedProducts.map(p => (
                <div key={p.product.id} className={styles.successDetailRow}>
                  <div className={styles.successDetailCheck}>
                    <Check size={14} weight="bold" />
                  </div>
                  <div className={styles.successDetailText}>
                    {p.quantity}x {p.product.name}
                  </div>
                </div>
              ))}
            </div>

            <button className={styles.successCloseBtn} onClick={onClose}>
              Zurück zum Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
