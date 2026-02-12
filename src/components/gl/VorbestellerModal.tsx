import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X, CalendarBlank, Package, Info, MagnifyingGlass, Check, Plus, Minus, CheckCircle, TrendUp, CaretDown, CaretRight, Cube, Camera } from '@phosphor-icons/react';
import { RingLoader } from 'react-spinners';
import styles from './VorbestellerModal.module.css';
import type { Market } from '../../types/market-types';
import { wellenService, type Welle, type PendingDeliverySubmission } from '../../services/wellenService';
import { useAuth } from '../../contexts/AuthContext';
import { marketService } from '../../services/marketService';
import { MarketVisitChoiceModal } from './MarketVisitChoiceModal';
import { VorbestellerDeliveryPhotoModal } from './VorbestellerDeliveryPhotoModal';
import { getAllProducts } from '../../data/productsData';
import type { Product } from '../../types/product-types';

interface VorbestellerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock data removed - using real data from database

// Reserved for future use
// interface MarketWithQuantity {
//   market: Market;
//   quantity: number;
// }

// Format date from "2026-01-05" to "5.1"
const formatCompactDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  return `${day}.${month}`;
};

// Check if a date is within 3 weeks (21 days) from now
const isWithinThreeWeeks = (lastVisitDate: string | null | undefined): boolean => {
  if (!lastVisitDate) return false;
  const lastVisit = new Date(lastVisitDate);
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
  return lastVisit >= threeWeeksAgo;
};

export const VorbestellerModal: React.FC<VorbestellerModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [wellen, setWellen] = useState<Welle[]>([]);
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [isLoadingWellen, setIsLoadingWellen] = useState(true);
  const [_isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  void _isLoadingMarkets; // Reserved for loading state display
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showMarketSelection, setShowMarketSelection] = useState(false);
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [_showPhotoCapture, _setShowPhotoCapture] = useState(false); void _showPhotoCapture; void _setShowPhotoCapture;
  const [showFotoWelle, setShowFotoWelle] = useState(false);
  const [fotoWellePhotos, setFotoWellePhotos] = useState<Array<{ image: string; tags: string[] }>>([]);
  const [fotoTagsAllMode, setFotoTagsAllMode] = useState(true);
  const [fotoSelectedTags, setFotoSelectedTags] = useState<Set<string>>(new Set());
  const [fotoTaggingIndex, setFotoTaggingIndex] = useState<number | null>(null); // which photo is being tagged
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitCompleted, setIsSubmitCompleted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSuccessAnimating, setIsSuccessAnimating] = useState(false);
  const [showVisitChoiceModal, setShowVisitChoiceModal] = useState(false);
  const [, setPendingCreateNewVisit] = useState<boolean | null>(null);
  // Delivery photo modal state
  const [showDeliveryPhotoModal, setShowDeliveryPhotoModal] = useState(false);
  const [pendingDeliverySubmissions, setPendingDeliverySubmissions] = useState<PendingDeliverySubmission[]>([]);
  const [isCheckingDeliveryPhotos, setIsCheckingDeliveryPhotos] = useState(false);
  // Master products state for Einzelprodukte
  const [masterProducts, setMasterProducts] = useState<Product[]>([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch wellen on mount
  useEffect(() => {
    const loadWellen = async () => {
      try {
        setIsLoadingWellen(true);
        const fetchedWellen = await wellenService.getAllWellen();
        setWellen(fetchedWellen);
      } catch (error) {
        console.error('Error loading wellen:', error);
      } finally {
        setIsLoadingWellen(false);
      }
    };
    if (isOpen) {
      loadWellen();
    }
  }, [isOpen]);

  // Fetch markets on mount
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setIsLoadingMarkets(true);
        const dbMarkets = await marketService.getAllMarkets();
        // Transform AdminMarket to Market type (include gebietsleiter for clustering)
        const markets: Market[] = dbMarkets.map(m => ({
          id: m.id,
          name: m.name,
          address: m.address,
          city: m.city,
          postalCode: m.postalCode,
          chain: m.chain || '',
          frequency: m.frequency || 12,
          currentVisits: m.currentVisits || 0,
          lastVisitDate: m.lastVisitDate || '',
          isCompleted: false,
          gebietsleiter: m.gebietsleiter, // Include GL assignment
        }));
        setAllMarkets(markets);
      } catch (error) {
        console.error('Error loading markets:', error);
      } finally {
        setIsLoadingMarkets(false);
      }
    };
    if (isOpen) {
      loadMarkets();
    }
  }, [isOpen]);

  const selectedVorbesteller = wellen.find(v => v.id === selectedCardId);

  // Fetch master products when wave has einzelprodukt type
  useEffect(() => {
    const loadMasterProducts = async () => {
      if (selectedVorbesteller?.types?.includes('einzelprodukt')) {
        try {
          const products = await getAllProducts();
          setMasterProducts(products);
        } catch (error) {
          console.error('Error loading master products:', error);
        }
      }
    };
    if (selectedVorbesteller) {
      loadMasterProducts();
    }
  }, [selectedVorbesteller]);

  const totalQuantity = Object.values(itemQuantities).reduce((sum, qty) => sum + qty, 0);

  // Calculate total value for palettes and schütten (towards €600 goal)
  const paletteSchutteValue = useMemo(() => {
    let total = 0;
    // Sum palette product values
    selectedVorbesteller?.paletteItems?.forEach(palette => {
      palette.products.forEach(product => {
        const qty = itemQuantities[`palette-${palette.id}-${product.id}`] || 0;
        total += qty * (product.valuePerVE || 0);
      });
    });
    // Sum schütte product values
    selectedVorbesteller?.schutteItems?.forEach(schuette => {
      schuette.products.forEach(product => {
        const qty = itemQuantities[`schutte-${schuette.id}-${product.id}`] || 0;
        total += qty * (product.valuePerVE || 0);
      });
    });
    return total;
  }, [selectedVorbesteller, itemQuantities]);

  const hasPalettenOrSchuetten = (selectedVorbesteller?.paletteItems?.length || 0) > 0 || 
                                  (selectedVorbesteller?.schutteItems?.length || 0) > 0;

  useEffect(() => {
    if (showSuccess) {
      setIsSuccessAnimating(true);
    }
  }, [showSuccess]);

  // Filter markets based on search and assigned markets for the selected welle
  const filteredMarkets = useMemo(() => {
    // First, filter to only show markets assigned to this welle
    const assignedMarkets = selectedVorbesteller?.assignedMarketIds 
      ? allMarkets.filter(m => selectedVorbesteller.assignedMarketIds?.includes(m.id))
      : allMarkets;
    
    // Then apply search filter
    const query = searchQuery.toLowerCase().trim();
    if (!query) return assignedMarkets;
    
    return assignedMarkets.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.city.toLowerCase().includes(query) ||
      m.postalCode.includes(query)
    );
  }, [searchQuery, selectedVorbesteller, allMarkets]);

  // Split markets into "Meine Märkte" and "Andere Märkte"
  // Use gebietsleiter_id (GL table ID) NOT user.id (Supabase Auth ID)
  const glId = user?.gebietsleiter_id;

  const myMarkets = useMemo(() => 
    filteredMarkets
      .filter(m => m.gebietsleiter === glId)
      .sort((a, b) => {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        return a.name.localeCompare(b.name);
      }), 
    [filteredMarkets, glId]
  );
  
  const otherMarkets = useMemo(() => 
    filteredMarkets
      .filter(m => m.gebietsleiter !== glId)
      .sort((a, b) => {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        return a.name.localeCompare(b.name);
      }), 
    [filteredMarkets, glId]
  );

  // Keep for compatibility
  const uncompletedMarkets = myMarkets.filter(m => !m.isCompleted);
  const completedMarkets = myMarkets.filter(m => m.isCompleted);
  const otherUncompletedMarkets = otherMarkets.filter(m => !m.isCompleted);
  const otherCompletedMarkets = otherMarkets.filter(m => m.isCompleted);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
  };

  const handleUpdateItemQuantity = (itemId: string, delta: number) => {
    setItemQuantities(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      return { ...prev, [itemId]: newQty };
    });
  };

  const handleManualItemQuantityChange = (itemId: string, value: string) => {
    if (value === '') {
      setItemQuantities(prev => ({ ...prev, [itemId]: 0 }));
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setItemQuantities(prev => ({ ...prev, [itemId]: numValue }));
      }
    }
  };

  const handleWeiterClick = () => {
    if (selectedCardId) {
      setShowMarketSelection(true);
    }
  };

  const handleMarketWeiterClick = async () => {
    if (!selectedMarket) return;
    
    // Check for pending delivery photos before proceeding
    setIsCheckingDeliveryPhotos(true);
    try {
      const pending = await wellenService.getPendingDeliveryPhotos(selectedMarket.id);
      if (pending && pending.length > 0) {
        setPendingDeliverySubmissions(pending);
        setShowDeliveryPhotoModal(true);
      } else {
        // No pending photos, proceed directly
        setShowItemSelection(true);
      }
    } catch (error) {
      console.error('Error checking pending delivery photos:', error);
      // On error, proceed without photo modal
      setShowItemSelection(true);
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
    setShowItemSelection(true);
  };

  const handleFertigClick = () => {
    if (totalQuantity > 0 || selectedVorbesteller?.fotoEnabled) {
      if (selectedVorbesteller?.fotoEnabled) {
        setShowFotoWelle(true);
      } else {
        // Skip Mengenerhebung photo - go directly to submit
        handleSubmitPhoto();
      }
    }
  };

  const handleFotoWelleWeiter = () => {
    setShowFotoWelle(false);
    // Skip Mengenerhebung - go directly to submit
    handleSubmitPhoto();
  };

  const handleFotoWelleAddPhoto = (imageData: string) => {
    const fixedTags = (selectedVorbesteller?.fotoTags || []).filter(t => t.type === 'fixed').map(t => t.name);
    const selectedOptional = fotoTagsAllMode ? Array.from(fotoSelectedTags) : [];
    setFotoWellePhotos(prev => {
      const newPhotos = [...prev, { image: imageData, tags: [...fixedTags, ...selectedOptional] }];
      // Enter tagging mode for new photo if optional tags exist and in per-photo mode
      if (!fotoTagsAllMode && (selectedVorbesteller?.fotoTags || []).some(t => t.type === 'optional')) {
        setTimeout(() => setFotoTaggingIndex(newPhotos.length - 1), 100);
      }
      return newPhotos;
    });
  };

  const handleFotoWelleAddMultiple = (files: FileList) => {
    const fileArr = Array.from(files);
    fileArr.forEach((file, i) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleFotoWelleAddPhoto(reader.result as string);
        // Show tagging for last file in per-photo mode
        if (!fotoTagsAllMode && i === fileArr.length - 1) {
          // tagging auto-triggered in handleFotoWelleAddPhoto
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFotoWelleRemovePhoto = (index: number) => {
    setFotoWellePhotos(prev => prev.filter((_, i) => i !== index));
    if (fotoTaggingIndex === index) setFotoTaggingIndex(null);
    else if (fotoTaggingIndex !== null && fotoTaggingIndex > index) setFotoTaggingIndex(fotoTaggingIndex - 1);
  };

  const toggleFotoTag = (tag: string, photoIndex?: number) => {
    if (fotoTagsAllMode || photoIndex === undefined) {
      // Toggle for all photos
      setFotoSelectedTags(prev => {
        const next = new Set(prev);
        if (next.has(tag)) next.delete(tag); else next.add(tag);
        return next;
      });
      // Apply to all photos
      setFotoWellePhotos(prev => prev.map(p => {
        const fixedTags = (selectedVorbesteller?.fotoTags || []).filter(t => t.type === 'fixed').map(t => t.name);
        const newSelectedTags = new Set(fotoSelectedTags);
        if (newSelectedTags.has(tag)) newSelectedTags.delete(tag); else newSelectedTags.add(tag);
        return { ...p, tags: [...fixedTags, ...Array.from(newSelectedTags)] };
      }));
    } else {
      // Toggle for specific photo
      setFotoWellePhotos(prev => prev.map((p, i) => {
        if (i !== photoIndex) return p;
        const has = p.tags.includes(tag);
        return { ...p, tags: has ? p.tags.filter(t => t !== tag) : [...p.tags, tag] };
      }));
    }
  };

  // Legacy Mengenerhebung handlers (kept for potential future use)
  const _handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setCapturedPhoto(reader.result as string); };
      reader.readAsDataURL(file);
    }
  }; void _handleFileSelect;

  const _handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation();
  }; void _handleDragOver;

  const _handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => { setCapturedPhoto(reader.result as string); };
      reader.readAsDataURL(file);
    }
  }; void _handleDrop;

  const _handleBrowseClick = () => { fileInputRef.current?.click(); }; void _handleBrowseClick;

  // Actual submission logic - can be called with or without creating a new visit
  const executeSubmission = async (createNewVisit: boolean) => {
    setIsSubmitting(true);
    
    try {
      // Prepare items array with only items that have quantities > 0
      const items: Array<{
        item_type: 'display' | 'kartonware' | 'palette' | 'schuette' | 'einzelprodukt';
        item_id: string;
        current_number: number;
        value_per_unit?: number; // For palette/schuette to track value
      }> = [];

      // Add displays with quantities
      selectedVorbesteller?.displays?.forEach(display => {
        const qty = itemQuantities[display.id] || 0;
        if (qty > 0) {
          items.push({
            item_type: 'display',
            item_id: display.id,
            current_number: qty
          });
        }
      });

      // Add kartonware with quantities
      selectedVorbesteller?.kartonwareItems?.forEach(item => {
        const qty = itemQuantities[item.id] || 0;
        if (qty > 0) {
          items.push({
            item_type: 'kartonware',
            item_id: item.id,
            current_number: qty
          });
        }
      });

      // Add einzelprodukte with quantities (wave-specific)
      selectedVorbesteller?.einzelproduktItems?.forEach(item => {
        const qty = itemQuantities[item.id] || 0;
        if (qty > 0) {
          items.push({
            item_type: 'einzelprodukt',
            item_id: item.id,
            current_number: qty
          });
        }
      });

      // Add master products with quantities (from Alle Produkte section)
      masterProducts.forEach(product => {
        const productKey = `master-${product.id}`;
        const qty = itemQuantities[productKey] || 0;
        if (qty > 0) {
          items.push({
            item_type: 'einzelprodukt',
            item_id: product.id,
            current_number: qty,
            value_per_unit: product.price > 0 ? product.price : undefined
          });
        }
      });

      // Add palette products with quantities (store product ID and value)
      selectedVorbesteller?.paletteItems?.forEach(palette => {
        palette.products.forEach(product => {
          const productKey = `palette-${palette.id}-${product.id}`;
          const qty = itemQuantities[productKey] || 0;
          if (qty > 0) {
            items.push({
              item_type: 'palette',
              item_id: product.id,
              current_number: qty,
              value_per_unit: product.valuePerVE
            });
          }
        });
      });

      // Add schuette products with quantities (store product ID and value)
      selectedVorbesteller?.schutteItems?.forEach(schuette => {
        schuette.products.forEach(product => {
          const productKey = `schutte-${schuette.id}-${product.id}`;
          const qty = itemQuantities[productKey] || 0;
          if (qty > 0) {
            items.push({
              item_type: 'schuette',
              item_id: product.id,
              current_number: qty,
              value_per_unit: product.valuePerVE
            });
          }
        });
      });

      // Save to database
      if (selectedVorbesteller && selectedMarket && user?.id) {
        await wellenService.updateProgressBatch(selectedVorbesteller.id, {
          gebietsleiter_id: user.id,
          market_id: selectedMarket.id,
          items,
          photo_url: capturedPhoto || undefined
        });

        // Upload foto welle photos if any
        if (fotoWellePhotos.length > 0) {
          try {
            await wellenService.uploadPhotos({
              welle_id: selectedVorbesteller.id,
              gebietsleiter_id: user.id,
              market_id: selectedMarket.id,
              photos: fotoWellePhotos,
            });
          } catch (photoError) {
            console.warn('Could not upload foto welle photos:', photoError);
          }
        }
        
        // Only record visit if user chose to create a new visit
        if (createNewVisit) {
          try {
            await marketService.recordVisit(selectedMarket.id, user.id);
          } catch (visitError) {
            console.warn('Could not record market visit:', visitError);
            // Don't fail the whole submission if visit recording fails
          }
        }
      }

      setIsSubmitting(false);
      setIsSubmitCompleted(true);
      setPendingCreateNewVisit(null);
      
      // Show success modal after completion animation
      setTimeout(() => {
        setIsSubmitCompleted(false);
        setShowPhotoCapture(false);
        setShowSuccess(true);
      }, 1500);
    } catch (error) {
      console.error('Error submitting progress:', error);
      setIsSubmitting(false);
      setPendingCreateNewVisit(null);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
    }
  };

  // Handler when user clicks submit - checks if we need to show visit choice modal
  const handleSubmitPhoto = async () => {
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

  const handleClose = () => {
    // Don't reset state - allow user to continue from where they left off
    // Only close for re-entry
    onClose();
  };

  // Full reset only on success completion
  const handleSuccessClose = () => {
    setFlippedCardId(null);
    setSelectedCardId(null);
    setShowMarketSelection(false);
    setShowItemSelection(false);
    setShowPhotoCapture(false);
    setSelectedMarket(null);
    setItemQuantities({});
    setSearchQuery('');
    setCapturedPhoto(null);
    setIsSubmitting(false);
    setIsSubmitCompleted(false);
    setShowSuccess(false);
    setIsSuccessAnimating(false);
    setShowVisitChoiceModal(false);
    setPendingCreateNewVisit(null);
    // Reset foto welle states
    setShowFotoWelle(false);
    setFotoWellePhotos([]);
    setFotoTagsAllMode(true);
    setFotoSelectedTags(new Set());
    setFotoTaggingIndex(null);
    // Reset delivery photo states
    setShowDeliveryPhotoModal(false);
    setPendingDeliverySubmissions([]);
    setIsCheckingDeliveryPhotos(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => {
      if (e.target === e.currentTarget && !showSuccess) {
        handleClose();
      }
    }}>
      <div className={`${styles.modal} ${showSuccess ? styles.successModal : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        {!showSuccess && (
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.iconWrapper}>
                <CalendarBlank size={24} weight="duotone" />
              </div>
              <div>
                <h2 className={styles.title}>
                  {showMarketSelection && selectedVorbesteller 
                    ? selectedVorbesteller.name
                    : 'Vorbesteller'}
                </h2>
                <p className={styles.subtitle}>
                  {showMarketSelection && selectedVorbesteller
                    ? `${selectedVorbesteller.kwDays?.[0]?.days.join(' & ')} ${selectedVorbesteller.kwDays?.[0]?.kw}`
                    : 'Wähle einen Vorbesteller aus'}
                </p>
              </div>
            </div>
            <button className={styles.closeButton} onClick={handleClose} aria-label="Schließen">
              <X size={20} weight="bold" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {showSuccess ? (
            /* Success Confirmation */
            <div className={`${styles.successContent} ${isSuccessAnimating ? styles.successContentAnimated : ''}`}>
              {/* Success Icon */}
              <div className={styles.successIconWrapper}>
                <CheckCircle size={72} weight="fill" className={styles.successCheckIcon} />
              </div>

              {/* Title */}
              <div className={styles.successHeader}>
                <h2 className={styles.successTitle}>
                  Hervorragende Leistung!
                </h2>
                <p className={styles.successSubtext}>
                  Vorverkauf erfolgreich dokumentiert
                </p>
              </div>

              {/* Stats Grid - 2 columns only */}
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
                    <div className={styles.successStatValue}>
                      €{(() => {
                        let totalValue = 0;
                        if (selectedVorbesteller) {
                          selectedVorbesteller.displays?.forEach(d => {
                            const qty = itemQuantities[d.id] || 0;
                            totalValue += qty * (d.itemValue || 0);
                          });
                          selectedVorbesteller.kartonwareItems?.forEach(k => {
                            const qty = itemQuantities[k.id] || 0;
                            totalValue += qty * (k.itemValue || 0);
                          });
                          selectedVorbesteller.einzelproduktItems?.forEach(e => {
                            const qty = itemQuantities[e.id] || 0;
                            totalValue += qty * (e.itemValue || 0);
                          });
                        }
                        // Add palette/schütte value
                        totalValue += paletteSchutteValue;
                        return totalValue.toFixed(2);
                      })()}
                    </div>
                    <div className={styles.successStatLabel}>Gesamtwert</div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className={styles.successDetailsSection}>
                <h3 className={styles.successSectionTitle}>Details</h3>
                <div className={styles.successDetailsList}>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>{selectedMarket?.name}</div>
                  </div>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>{selectedVorbesteller?.name} · {selectedVorbesteller?.kwDays?.[0]?.kw}</div>
                  </div>
                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>Lieferung {selectedVorbesteller?.startDate} - {selectedVorbesteller?.endDate}</div>
                  </div>
                  
                  {/* List sold products */}
                  {selectedVorbesteller?.displays?.map(display => {
                    const qty = itemQuantities[display.id] || 0;
                    if (qty > 0) {
                      return (
                        <div key={display.id} className={styles.successDetailRow}>
                          <div className={styles.successDetailCheck}>
                            <Check size={14} weight="bold" />
                          </div>
                          <div className={styles.successDetailText}>
                            {display.name}: {qty} Stück
                            {display.itemValue && ` (€${(qty * display.itemValue).toFixed(2)})`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                  
                  {selectedVorbesteller?.kartonwareItems?.map(item => {
                    const qty = itemQuantities[item.id] || 0;
                    if (qty > 0) {
                      return (
                        <div key={item.id} className={styles.successDetailRow}>
                          <div className={styles.successDetailCheck}>
                            <Check size={14} weight="bold" />
                          </div>
                          <div className={styles.successDetailText}>
                            {item.name}: {qty} Stück
                            {item.itemValue && ` (€${(qty * item.itemValue).toFixed(2)})`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {selectedVorbesteller?.einzelproduktItems?.map(item => {
                    const qty = itemQuantities[item.id] || 0;
                    if (qty > 0) {
                      return (
                        <div key={item.id} className={styles.successDetailRow}>
                          <div className={styles.successDetailCheck}>
                            <Check size={14} weight="bold" />
                          </div>
                          <div className={styles.successDetailText}>
                            {item.name}: {qty} Stück
                            {item.itemValue && ` (€${(qty * item.itemValue).toFixed(2)})`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* Palette products in success view */}
                  {selectedVorbesteller?.paletteItems?.map(palette => {
                    const paletteProducts = palette.products.filter(product => {
                      const qty = itemQuantities[`palette-${palette.id}-${product.id}`] || 0;
                      return qty > 0;
                    });
                    if (paletteProducts.length === 0) return null;
                    return (
                      <div key={palette.id}>
                        <div className={styles.successDetailRow}>
                          <div className={styles.successDetailCheck}>
                            <Check size={14} weight="bold" />
                          </div>
                          <div className={styles.successDetailText}>
                            <strong>Palette: {palette.name}</strong>
                          </div>
                        </div>
                        {paletteProducts.map(product => {
                          const qty = itemQuantities[`palette-${palette.id}-${product.id}`] || 0;
                          const value = qty * (product.valuePerVE || 0);
                          return (
                            <div key={product.id} className={styles.successDetailRow} style={{ paddingLeft: '36px' }}>
                              <div className={styles.successDetailCheck}>
                                <Check size={14} weight="bold" />
                              </div>
                              <div className={styles.successDetailText}>
                                {product.name}: {qty} VE (€{value.toFixed(2)})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Schütte products in success view */}
                  {selectedVorbesteller?.schutteItems?.map(schuette => {
                    const schutteProducts = schuette.products.filter(product => {
                      const qty = itemQuantities[`schutte-${schuette.id}-${product.id}`] || 0;
                      return qty > 0;
                    });
                    if (schutteProducts.length === 0) return null;
                    return (
                      <div key={schuette.id}>
                        <div className={styles.successDetailRow}>
                          <div className={styles.successDetailCheck}>
                            <Check size={14} weight="bold" />
                          </div>
                          <div className={styles.successDetailText}>
                            <strong>Schütte: {schuette.name}</strong>
                          </div>
                        </div>
                        {schutteProducts.map(product => {
                          const qty = itemQuantities[`schutte-${schuette.id}-${product.id}`] || 0;
                          const value = qty * (product.valuePerVE || 0);
                          return (
                            <div key={product.id} className={styles.successDetailRow} style={{ paddingLeft: '36px' }}>
                              <div className={styles.successDetailCheck}>
                                <Check size={14} weight="bold" />
                              </div>
                              <div className={styles.successDetailText}>
                                {product.name}: {qty} VE (€{value.toFixed(2)})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Show palette/schütte total value if applicable */}
                  {paletteSchutteValue > 0 && (
                    <div className={styles.successDetailRow}>
                      <div className={styles.successDetailCheck}>
                        <Check size={14} weight="bold" />
                      </div>
                      <div className={styles.successDetailText}>
                        Paletten & Schütten Gesamtwert: €{paletteSchutteValue.toFixed(2)}
                        {paletteSchutteValue >= 600 ? ' ✓' : ` (Minimum €600)`}
                      </div>
                    </div>
                  )}

                  <div className={styles.successDetailRow}>
                    <div className={styles.successDetailCheck}>
                      <Check size={14} weight="bold" />
                    </div>
                    <div className={styles.successDetailText}>Foto dokumentiert</div>
                  </div>
                </div>
              </div>
            </div>
          ) : !showMarketSelection && !showItemSelection && !showFotoWelle ? (
            /* Card Selection View */
            <div className={styles.cardsSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Anstehende Vorbestellungen</h3>
                <div className={styles.badge}>{wellen.length}</div>
              </div>
              
              <div className={styles.scrollContainer} ref={scrollContainerRef}>
                {isLoadingWellen ? (
                  <div className={styles.loadingState}>
                    <RingLoader color="#3B82F6" size={60} />
                  </div>
                ) : (
                  <div className={styles.cardsWrapper}>
                    {wellen.map((welle) => (
                      <div 
                        key={welle.id} 
                        className={`${styles.cardContainer} ${flippedCardId === welle.id ? styles.flipped : ''} ${selectedCardId === welle.id ? styles.selected : ''}`}
                        onClick={() => setSelectedCardId(welle.id)}
                      >
                        {/* Card Front */}
                        <div className={styles.cardFront}>
                          <div key={welle.id} className={styles.card}>
                            <div className={styles.cardImageContainer}>
                              {welle.image ? (
                                <img src={welle.image} alt="Vorbesteller" className={styles.cardImage} />
                              ) : (
                                <div className={styles.cardImagePlaceholder}>
                                  <CalendarBlank size={48} weight="duotone" />
                                </div>
                              )}
                              <button 
                                className={styles.infoIcon}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFlippedCardId(welle.id);
                                }}
                                aria-label="Info"
                              >
                                <Info size={20} weight="regular" />
                              </button>
                              <div className={styles.cardOverlay}>
                                <div className={styles.itemsBadge}>
                                  <Package size={16} weight="fill" />
                                  <span>{(welle.displays?.length || 0) + (welle.kartonwareItems?.length || 0) + (welle.einzelproduktItems?.length || 0)}</span>
                                </div>
                              </div>
                            </div>
                            <div className={styles.cardContent}>
                              <div className={styles.marktName}>{welle.name}</div>
                              <div className={styles.cardSubheader}>
                                <div className={styles.timeSlot}>
                                  {welle.kwDays && welle.kwDays.length > 0 
                                    ? `${welle.kwDays[0].days.join('&')} ${welle.kwDays[0].kw}`
                                    : 'Keine Verkaufstage'}
                                </div>
                                <div className={styles.dateRange}>
                                  {formatCompactDate(welle.startDate)}-{formatCompactDate(welle.endDate)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card Back */}
                        <div className={styles.cardBack}>
                          <div className={styles.card}>
                            <div className={styles.cardBackTop}>
                              <button 
                                className={styles.closeBackButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFlippedCardId(null);
                                }}
                                aria-label="Zurück"
                              >
                                <X size={14} weight="bold" />
                              </button>
                              
                              <div className={styles.backTopInfo}>
                                {/* Order Times */}
                                <div className={styles.backTopItem}>
                                  <div className={styles.backTopLabel}>Bestellzeiten</div>
                                  <div className={styles.backTopValue}>
                                    {welle.kwDays?.map(kw => `${kw.days.join('&')} ${kw.kw}`).join(', ') || 'N/A'}
                                  </div>
                                </div>

                                {/* Delivery Period */}
                                <div className={styles.backTopItem}>
                                  <div className={styles.backTopLabel}>Lieferung</div>
                                  <div className={styles.backTopValue}>
                                    {welle.startDate} - {welle.endDate}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className={styles.cardContent}>
                              {/* Coverage Progress */}
                              <div className={styles.backInfoItem}>
                                <div className={styles.coverageHeader}>
                                  <div className={styles.backInfoLabel}>
                                    {welle.goalType === 'percentage' ? 'Abdeckung' : 'Verkaufswert'}
                                  </div>
                                  <div className={styles.marketsCount}>
                                    {welle.goalType === 'percentage' ? (
                                      `${welle.participatingGLs || 0}/${welle.totalGLs || 0}`
                                    ) : (
                                      `€${((welle.displays || []).reduce((sum, d) => sum + (d.currentNumber || 0) * (d.itemValue || 0), 0) + 
                                        (welle.kartonwareItems || []).reduce((sum, k) => sum + (k.currentNumber || 0) * (k.itemValue || 0), 0) +
                                        (welle.einzelproduktItems || []).reduce((sum, e) => sum + (e.currentNumber || 0) * (e.itemValue || 0), 0)).toLocaleString('de-DE')}`
                                    )}
                                  </div>
                                </div>
                                <div className={styles.coverageContainer}>
                                  <div className={styles.coverageBar}>
                                    <div 
                                      className={`${styles.coverageProgress} ${
                                        welle.goalType === 'percentage' 
                                          ? ((welle.participatingGLs || 0) / (welle.totalGLs || 1) * 100) >= (welle.goalPercentage || 100)
                                          : ((welle.displays || []).reduce((sum, d) => sum + (d.currentNumber || 0) * (d.itemValue || 0), 0) + 
                                            (welle.kartonwareItems || []).reduce((sum, k) => sum + (k.currentNumber || 0) * (k.itemValue || 0), 0) +
                                            (welle.einzelproduktItems || []).reduce((sum, e) => sum + (e.currentNumber || 0) * (e.itemValue || 0), 0)) >= (welle.goalValue || Infinity)
                                          ? styles.coverageComplete 
                                          : ''
                                      }`}
                                      style={{ 
                                        width: welle.goalType === 'percentage'
                                          ? `${Math.min(100, (welle.participatingGLs || 0) / (welle.totalGLs || 1) * 100)}%`
                                          : `${Math.min(100, ((welle.displays || []).reduce((sum, d) => sum + (d.currentNumber || 0) * (d.itemValue || 0), 0) + 
                                              (welle.kartonwareItems || []).reduce((sum, k) => sum + (k.currentNumber || 0) * (k.itemValue || 0), 0) +
                                              (welle.einzelproduktItems || []).reduce((sum, e) => sum + (e.currentNumber || 0) * (e.itemValue || 0), 0)) / (welle.goalValue || 1) * 100)}%`
                                      }}
                                    />
                                  </div>
                                  <div className={styles.coverageStats}>
                                    <span className={styles.coverageCurrent}>
                                      {welle.goalType === 'percentage' 
                                        ? `${Math.round((welle.participatingGLs || 0) / (welle.totalGLs || 1) * 100)}%`
                                        : `€${((welle.displays || []).reduce((sum, d) => sum + (d.currentNumber || 0) * (d.itemValue || 0), 0) + 
                                            (welle.kartonwareItems || []).reduce((sum, k) => sum + (k.currentNumber || 0) * (k.itemValue || 0), 0) +
                                            (welle.einzelproduktItems || []).reduce((sum, e) => sum + (e.currentNumber || 0) * (e.itemValue || 0), 0)).toLocaleString('de-DE')}`
                                      }
                                    </span>
                                    <span className={styles.coverageGoal}>
                                      Ziel: {welle.goalType === 'percentage' 
                                        ? `${welle.goalPercentage}%`
                                        : `€${(welle.goalValue || 0).toLocaleString('de-DE')}`
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !showItemSelection && !showFotoWelle ? (
            /* Market Selection View */
            <div className={styles.marketSelectionSection}>
              {/* Search Bar */}
              <div className={styles.searchBar}>
                <MagnifyingGlass size={20} weight="regular" className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Markt suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {/* Markets List */}
              <div className={styles.marketsList}>
                {/* Meine Märkte Section */}
                {myMarkets.length > 0 && (
                  <div className={styles.marketsSection}>
                    <div className={styles.marketsSectionLabel}>Meine Märkte</div>
                    
                    {/* Uncompleted */}
                    {uncompletedMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Verfügbar</div>
                        {uncompletedMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <div
                              key={market.id}
                              className={`${styles.marketItem} ${isSelected ? styles.selected : ''}`}
                              onClick={() => handleSelectMarket(market)}
                            >
                              <div className={styles.marketInfo}>
                                <div className={styles.marketName}>{market.name}</div>
                                <div className={styles.marketMeta}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Completed */}
                    {completedMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Abgeschlossen</div>
                        {completedMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <div
                              key={market.id}
                              className={`${styles.marketItem} ${styles.completed} ${isSelected ? styles.selected : ''}`}
                              onClick={() => handleSelectMarket(market)}
                            >
                              <div className={styles.completedCheck}>
                                <Check size={12} weight="bold" />
                              </div>
                              <div className={styles.marketInfo}>
                                <div className={styles.marketName}>{market.name}</div>
                                <div className={styles.marketMeta}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Andere Märkte Section */}
                {otherMarkets.length > 0 && (
                  <div className={`${styles.marketsSection} ${styles.otherMarketsSection}`}>
                    <div className={styles.marketsSectionLabel}>Andere Märkte</div>
                    
                    {/* Uncompleted */}
                    {otherUncompletedMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Verfügbar</div>
                        {otherUncompletedMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <div
                              key={market.id}
                              className={`${styles.marketItem} ${styles.otherMarket} ${isSelected ? styles.selected : ''}`}
                              onClick={() => handleSelectMarket(market)}
                            >
                              <div className={styles.marketInfo}>
                                <div className={styles.marketName}>{market.name}</div>
                                <div className={styles.marketMeta}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Completed */}
                    {otherCompletedMarkets.length > 0 && (
                      <div className={styles.marketsGroup}>
                        <div className={styles.marketsGroupLabel}>Abgeschlossen</div>
                        {otherCompletedMarkets.map((market) => {
                          const isSelected = selectedMarket?.id === market.id;
                          return (
                            <div
                              key={market.id}
                              className={`${styles.marketItem} ${styles.completed} ${styles.otherMarket} ${isSelected ? styles.selected : ''}`}
                              onClick={() => handleSelectMarket(market)}
                            >
                              <div className={styles.completedCheck}>
                                <Check size={12} weight="bold" />
                              </div>
                              <div className={styles.marketInfo}>
                                <div className={styles.marketName}>{market.name}</div>
                                <div className={styles.marketMeta}>
                                  {market.address}, {market.postalCode} {market.city}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : !showFotoWelle ? (
            /* Item Selection View */
            <div className={styles.itemSelectionSection}>
              <div className={styles.itemsList}>
                {/* Displays Section */}
                {selectedVorbesteller?.displays && selectedVorbesteller.displays.length > 0 && (
                  <div className={styles.itemsGroup}>
                    <div className={styles.itemsGroupLabel}>Displays</div>
                    {selectedVorbesteller.displays.map((display) => (
                      <div key={display.id} className={styles.itemCard}>
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{display.name}</div>
                          <div className={styles.itemMeta}>
                            Ziel: {display.targetNumber} Stück
                            {display.itemValue && ` · €${display.itemValue.toFixed(2)}`}
                          </div>
                        </div>
                        <div className={styles.quantityControls}>
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(display.id, -1)}
                            aria-label="Weniger"
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <input
                            type="text"
                            className={styles.quantity}
                            value={itemQuantities[display.id] === 0 || !itemQuantities[display.id] ? '' : itemQuantities[display.id]}
                            onChange={(e) => handleManualItemQuantityChange(display.id, e.target.value)}
                            placeholder="0"
                            aria-label="Menge"
                          />
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(display.id, 1)}
                            aria-label="Mehr"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Kartonware Section */}
                {selectedVorbesteller?.kartonwareItems && selectedVorbesteller.kartonwareItems.length > 0 && (
                  <div className={styles.itemsGroup}>
                    <div className={styles.itemsGroupLabel}>Kartonware</div>
                    {selectedVorbesteller.kartonwareItems.map((item) => (
                      <div key={item.id} className={styles.itemCard}>
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{item.name}</div>
                          <div className={styles.itemMeta}>
                            Ziel: {item.targetNumber} Stück
                            {item.itemValue && ` · €${item.itemValue.toFixed(2)}`}
                          </div>
                        </div>
                        <div className={styles.quantityControls}>
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(item.id, -1)}
                            aria-label="Weniger"
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <input
                            type="text"
                            className={styles.quantity}
                            value={itemQuantities[item.id] === 0 || !itemQuantities[item.id] ? '' : itemQuantities[item.id]}
                            onChange={(e) => handleManualItemQuantityChange(item.id, e.target.value)}
                            placeholder="0"
                            aria-label="Menge"
                          />
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(item.id, 1)}
                            aria-label="Mehr"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Einzelprodukte Section */}
                {selectedVorbesteller?.einzelproduktItems && selectedVorbesteller.einzelproduktItems.length > 0 && (
                  <div className={styles.itemsGroup}>
                    <div className={styles.itemsGroupLabel}>Einzelprodukte</div>
                    {selectedVorbesteller.einzelproduktItems.map((item) => (
                      <div key={item.id} className={styles.itemCard}>
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{item.name}</div>
                          <div className={styles.itemMeta}>
                            Ziel: {item.targetNumber} Stück
                            {item.itemValue && ` · €${item.itemValue.toFixed(2)}`}
                          </div>
                        </div>
                        <div className={styles.quantityControls}>
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(item.id, -1)}
                            aria-label="Weniger"
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <input
                            type="text"
                            className={styles.quantity}
                            value={itemQuantities[item.id] === 0 || !itemQuantities[item.id] ? '' : itemQuantities[item.id]}
                            onChange={(e) => handleManualItemQuantityChange(item.id, e.target.value)}
                            placeholder="0"
                            aria-label="Menge"
                          />
                          <button
                            className={styles.quantityButton}
                            onClick={() => handleUpdateItemQuantity(item.id, 1)}
                            aria-label="Mehr"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All Products Section (Master Product List) */}
                {selectedVorbesteller?.types?.includes('einzelprodukt') && masterProducts.length > 0 && (
                  <div className={styles.allProductsSection}>
                    <button 
                      className={styles.allProductsHeader}
                      onClick={() => setShowAllProducts(!showAllProducts)}
                    >
                      <div className={styles.allProductsHeaderLeft}>
                        <Cube size={20} weight="regular" />
                        <span>Alle Produkte</span>
                        <span className={styles.allProductsCount}>{masterProducts.length}</span>
                      </div>
                      {showAllProducts ? <CaretDown size={18} weight="bold" /> : <CaretRight size={18} weight="bold" />}
                    </button>
                    
                    {showAllProducts && (
                      <div className={styles.allProductsContent}>
                        <div className={styles.allProductsSearch}>
                          <MagnifyingGlass size={16} />
                          <input
                            type="text"
                            placeholder="Produkt suchen..."
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                          />
                        </div>
                        
                        <div className={styles.allProductsList}>
                          {masterProducts
                            .filter(product => 
                              product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
                            )
                            .map((product) => (
                              <div key={`master-${product.id}`} className={styles.productCard}>
                                <div className={styles.productInfo}>
                                  <span className={`${styles.departmentBadge} ${product.department === 'pets' ? styles.departmentPets : styles.departmentFood}`}>
                                    {product.department === 'pets' ? 'Pets' : 'Food'}
                                  </span>
                                  <div className={styles.productName}>{product.name}</div>
                                  <div className={styles.productMeta}>
                                    {product.weight && `${product.weight}`}
                                    {product.price > 0 && ` · €${product.price.toFixed(2)}`}
                                  </div>
                                </div>
                                <div className={styles.quantityControls}>
                                  <button
                                    className={styles.quantityButton}
                                    onClick={() => handleUpdateItemQuantity(`master-${product.id}`, -1)}
                                    aria-label="Weniger"
                                  >
                                    <Minus size={14} weight="bold" />
                                  </button>
                                  <input
                                    type="text"
                                    className={styles.quantity}
                                    value={itemQuantities[`master-${product.id}`] === 0 || !itemQuantities[`master-${product.id}`] ? '' : itemQuantities[`master-${product.id}`]}
                                    onChange={(e) => handleManualItemQuantityChange(`master-${product.id}`, e.target.value)}
                                    placeholder="0"
                                    aria-label="Menge"
                                  />
                                  <button
                                    className={styles.quantityButton}
                                    onClick={() => handleUpdateItemQuantity(`master-${product.id}`, 1)}
                                    aria-label="Mehr"
                                  >
                                    <Plus size={14} weight="bold" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Paletten & Schütten Section with Progress Bar */}
                {hasPalettenOrSchuetten && (
                  <>
                    {/* Progress Bar towards €600 goal */}
                    <div className={styles.valueProgressSection}>
                      <div className={styles.valueProgressHeader}>
                        <div className={styles.valueProgressLabel}>Paletten & Schütten Wert</div>
                        <div className={styles.valueProgressAmount}>
                          €{paletteSchutteValue.toFixed(2)} <span className={styles.valueGoal}>/ €600 Minimum</span>
                        </div>
                      </div>
                      <div className={styles.valueProgressBar}>
                        <div 
                          className={`${styles.valueProgressFill} ${paletteSchutteValue >= 600 ? styles.valueProgressComplete : ''}`}
                          style={{ width: `${Math.min(100, (paletteSchutteValue / 600) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Paletten Section */}
                    {selectedVorbesteller?.paletteItems && selectedVorbesteller.paletteItems.length > 0 && (
                      <div className={styles.itemsGroup}>
                        <div className={styles.itemsGroupLabel}>Paletten</div>
                        {selectedVorbesteller.paletteItems.map((palette) => (
                          <div key={palette.id} className={styles.paletteContainer}>
                            <div className={styles.paletteHeader}>
                              <div className={styles.paletteName}>{palette.name}</div>
                              {palette.size && <div className={styles.paletteSize}>{palette.size}</div>}
                            </div>
                            <div className={styles.paletteProducts}>
                              {palette.products.map((product) => {
                                const productKey = `palette-${palette.id}-${product.id}`;
                                return (
                                  <div key={product.id} className={styles.itemCard}>
                                    <div className={styles.itemInfo}>
                                      <div className={styles.itemName}>{product.name}</div>
                                      <div className={styles.itemMeta}>
                                        €{product.valuePerVE.toFixed(2)}/VE · Vorschlag/VE: {product.ve}
                                        {product.ean && ` · EAN: ${product.ean}`}
                                      </div>
                                    </div>
                                    <div className={styles.quantityControls}>
                                      <button
                                        className={styles.quantityButton}
                                        onClick={() => handleUpdateItemQuantity(productKey, -1)}
                                        aria-label="Weniger"
                                      >
                                        <Minus size={14} weight="bold" />
                                      </button>
                                      <input
                                        type="text"
                                        className={styles.quantity}
                                        value={itemQuantities[productKey] === 0 || !itemQuantities[productKey] ? '' : itemQuantities[productKey]}
                                        onChange={(e) => handleManualItemQuantityChange(productKey, e.target.value)}
                                        placeholder="0"
                                        aria-label="Menge"
                                      />
                                      <button
                                        className={styles.quantityButton}
                                        onClick={() => handleUpdateItemQuantity(productKey, 1)}
                                        aria-label="Mehr"
                                      >
                                        <Plus size={14} weight="bold" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Schütten Section */}
                    {selectedVorbesteller?.schutteItems && selectedVorbesteller.schutteItems.length > 0 && (
                      <div className={styles.itemsGroup}>
                        <div className={styles.itemsGroupLabel}>Schütten</div>
                        {selectedVorbesteller.schutteItems.map((schuette) => (
                          <div key={schuette.id} className={styles.paletteContainer}>
                            <div className={styles.paletteHeader}>
                              <div className={styles.paletteName}>{schuette.name}</div>
                              {schuette.size && <div className={styles.paletteSize}>{schuette.size}</div>}
                            </div>
                            <div className={styles.paletteProducts}>
                              {schuette.products.map((product) => {
                                const productKey = `schutte-${schuette.id}-${product.id}`;
                                return (
                                  <div key={product.id} className={styles.itemCard}>
                                    <div className={styles.itemInfo}>
                                      <div className={styles.itemName}>{product.name}</div>
                                      <div className={styles.itemMeta}>
                                        €{product.valuePerVE.toFixed(2)}/VE · Vorschlag/VE: {product.ve}
                                        {product.ean && ` · EAN: ${product.ean}`}
                                      </div>
                                    </div>
                                    <div className={styles.quantityControls}>
                                      <button
                                        className={styles.quantityButton}
                                        onClick={() => handleUpdateItemQuantity(productKey, -1)}
                                        aria-label="Weniger"
                                      >
                                        <Minus size={14} weight="bold" />
                                      </button>
                                      <input
                                        type="text"
                                        className={styles.quantity}
                                        value={itemQuantities[productKey] === 0 || !itemQuantities[productKey] ? '' : itemQuantities[productKey]}
                                        onChange={(e) => handleManualItemQuantityChange(productKey, e.target.value)}
                                        placeholder="0"
                                        aria-label="Menge"
                                      />
                                      <button
                                        className={styles.quantityButton}
                                        onClick={() => handleUpdateItemQuantity(productKey, 1)}
                                        aria-label="Mehr"
                                      >
                                        <Plus size={14} weight="bold" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : showFotoWelle ? (
            /* Foto Welle Step */
            <div className={styles.fotoSection}>
              {isSubmitting ? (
                <div className={styles.loadingState}>
                  <RingLoader color="#3B82F6" size={80} />
                  <h3 className={styles.loadingTitle}>Fotos werden hochgeladen...</h3>
                </div>
              ) : isSubmitCompleted ? (
                <div className={styles.loadingState}>
                  <div className={styles.completedAnimation}>
                    <div className={styles.completedPulse}></div>
                    <div className={styles.completedCircle}>
                      <Check size={40} weight="bold" />
                    </div>
                  </div>
                  <h3 className={styles.loadingTitle}>Erfolgreich!</h3>
                </div>
              ) : (
                <>
                  {/* Hero */}
                  <div className={styles.fotoHero}>
                    <div className={styles.fotoHeroIcon}>
                      <Camera size={30} weight="duotone" />
                    </div>
                    <h3 className={styles.fotoHeroTitle}>{selectedVorbesteller?.fotoHeader || 'Fotos'}</h3>
                    {selectedVorbesteller?.fotoDescription && (
                      <p className={styles.fotoHeroDesc}>{selectedVorbesteller.fotoDescription}</p>
                    )}
                    <div className={`${styles.fotoCounter} ${fotoWellePhotos.length > 0 ? styles.fotoCounterActive : ''}`}>
                      {fotoWellePhotos.length > 0
                        ? `${fotoWellePhotos.length} ${fotoWellePhotos.length === 1 ? 'Foto' : 'Fotos'}`
                        : 'Noch keine Fotos'}
                    </div>
                  </div>

                  {/* Tags - "Alle" mode: selected/available split */}
                  {(selectedVorbesteller?.fotoTags || []).length > 0 && fotoTaggingIndex === null && (
                    <div className={styles.fotoTagsSection}>
                      {(selectedVorbesteller?.fotoTags || []).some(t => t.type === 'optional') && (
                        <div className={styles.fotoModeToggle}>
                          <div className={styles.fotoModeSlider} style={{ transform: fotoTagsAllMode ? 'translateX(0)' : 'translateX(100%)' }} />
                          <button className={`${styles.fotoModeBtn} ${fotoTagsAllMode ? styles.fotoModeBtnActive : ''}`} onClick={() => setFotoTagsAllMode(true)}>Alle</button>
                          <button className={`${styles.fotoModeBtn} ${!fotoTagsAllMode ? styles.fotoModeBtnActive : ''}`} onClick={() => setFotoTagsAllMode(false)}>Pro Foto</button>
                        </div>
                      )}
                      {fotoTagsAllMode && (
                        <div className={styles.fotoTagSplit}>
                          {/* Selected optional tags */}
                          {(selectedVorbesteller?.fotoTags || []).filter(t => t.type === 'optional' && fotoSelectedTags.has(t.name)).map(tag => (
                            <button key={`s-${tag.name}`} type="button" className={styles.fotoTagSelected} onClick={() => toggleFotoTag(tag.name)}>
                              <Check size={10} weight="bold" />
                              {tag.name}
                            </button>
                          ))}
                          {/* Divider if both selected and available exist */}
                          {fotoSelectedTags.size > 0 && (selectedVorbesteller?.fotoTags || []).filter(t => t.type === 'optional' && !fotoSelectedTags.has(t.name)).length > 0 && (
                            <div className={styles.fotoTagDivider} />
                          )}
                          {/* Available optional tags */}
                          {(selectedVorbesteller?.fotoTags || []).filter(t => t.type === 'optional' && !fotoSelectedTags.has(t.name)).map(tag => (
                            <button key={`a-${tag.name}`} type="button" className={styles.fotoTagAvailable} onClick={() => toggleFotoTag(tag.name)}>
                              <Plus size={10} weight="bold" />
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photo tagging overlay (per-photo mode) */}
                  {fotoTaggingIndex !== null && fotoWellePhotos[fotoTaggingIndex] ? (
                    <div className={styles.fotoTaggingOverlay}>
                      <div className={styles.fotoTaggingCard}>
                        <img src={fotoWellePhotos[fotoTaggingIndex].image} alt="" className={styles.fotoTaggingImg} />
                        <div className={styles.fotoTaggingContent}>
                          <h4 className={styles.fotoTaggingTitle}>Tags fur Foto {fotoTaggingIndex + 1}</h4>
                          <div className={styles.fotoTaggingPills}>
                            {(selectedVorbesteller?.fotoTags || []).filter(t => t.type === 'optional').map(tag => {
                              const isOn = fotoWellePhotos[fotoTaggingIndex!].tags.includes(tag.name);
                              return (
                                <button
                                  key={`to-${tag.name}`}
                                  type="button"
                                  className={`${styles.fotoTaggingPill} ${isOn ? styles.fotoTaggingPillOn : ''}`}
                                  onClick={() => toggleFotoTag(tag.name, fotoTaggingIndex!)}
                                >
                                  {isOn ? <Check size={12} weight="bold" /> : <Plus size={12} weight="bold" />}
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                          <button className={styles.fotoTaggingDone} onClick={() => setFotoTaggingIndex(null)}>
                            <Check size={14} weight="bold" /> Fertig
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Photo area */
                    <div className={styles.fotoArea}>
                      {fotoWellePhotos.length === 0 ? (
                        <label className={styles.fotoDropZone}>
                          <div className={styles.fotoDropIcon}><Camera size={36} weight="regular" /></div>
                          <span className={styles.fotoDropTitle}>Fotos aufnehmen oder hochladen</span>
                          <span className={styles.fotoDropHint}>Tippen oder Dateien hierher ziehen</span>
                          <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                            onChange={(e) => { if (e.target.files) handleFotoWelleAddMultiple(e.target.files); e.target.value = ''; }} />
                        </label>
                      ) : (
                        <div className={styles.fotoGrid}>
                          {fotoWellePhotos.map((photo, idx) => (
                            <div
                              key={idx}
                              className={styles.fotoCard}
                              style={{ animationDelay: `${idx * 50}ms` }}
                              onClick={!fotoTagsAllMode ? () => setFotoTaggingIndex(idx) : undefined}
                            >
                              <img src={photo.image} alt="" className={styles.fotoCardImg} />
                              <div className={styles.fotoCardBadge}>{idx + 1}</div>
                              <button className={styles.fotoCardRemove} onClick={(e) => { e.stopPropagation(); handleFotoWelleRemovePhoto(idx); }}>
                                <X size={11} weight="bold" />
                              </button>
                              {/* Tag count badge on card */}
                              {(() => {
                                const fixedNames = new Set((selectedVorbesteller?.fotoTags || []).filter(t => t.type === 'fixed').map(t => t.name));
                                const optCount = photo.tags.filter(t => !fixedNames.has(t)).length;
                                return optCount > 0 ? (
                                <div className={styles.fotoCardTagCount}>
                                  {optCount} {optCount === 1 ? 'Tag' : 'Tags'}
                                </div>
                              ) : null;
                              })()}
                            </div>
                          ))}
                          <label className={styles.fotoAddMore}>
                            <Plus size={20} weight="bold" />
                            <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                              onChange={(e) => { if (e.target.files) handleFotoWelleAddMultiple(e.target.files); e.target.value = ''; }} />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary bar */}
                  {fotoWellePhotos.length > 0 && (
                    <div className={styles.fotoSummaryBar}>
                      <div className={styles.fotoSummaryLeft}>
                        <CheckCircle size={16} weight="fill" />
                        <span>{fotoWellePhotos.length} {fotoWellePhotos.length === 1 ? 'Foto' : 'Fotos'} bereit</span>
                      </div>
                      {fotoSelectedTags.size > 0 && fotoTagsAllMode && (
                        <div className={styles.fotoSummaryRight}>
                          {fotoSelectedTags.size} Tags
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Buttons */}
        <div className={`${styles.footer} ${showSuccess ? styles.successFooter : ''}`}>
          {showSuccess ? (
            <button className={styles.primaryButton} onClick={handleSuccessClose}>
              Zurück zum Dashboard
            </button>
          ) : showFotoWelle ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setShowFotoWelle(false)}>
                Zurück
              </button>
              <button className={styles.primaryButton} onClick={handleFotoWelleWeiter} disabled={fotoWellePhotos.length === 0}>
                Absenden
              </button>
            </>
          ) : showItemSelection ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setShowItemSelection(false)}>
                Zurück
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleFertigClick}
                disabled={totalQuantity === 0 && !selectedVorbesteller?.fotoEnabled}
              >
                {selectedVorbesteller?.fotoEnabled ? 'Weiter' : 'Fertig'}
              </button>
            </>
          ) : showMarketSelection ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setShowMarketSelection(false)}>
                Zurück
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleMarketWeiterClick}
                disabled={!selectedMarket || isCheckingDeliveryPhotos}
              >
                {isCheckingDeliveryPhotos ? 'Lädt...' : 'Weiter'}
              </button>
            </>
          ) : (
            <>
              <button className={styles.secondaryButton} onClick={handleClose}>
                Schließen
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleWeiterClick}
                disabled={!selectedCardId}
              >
                Weiter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Market Visit Choice Modal */}
      <MarketVisitChoiceModal
        isOpen={showVisitChoiceModal}
        marketName={selectedMarket?.name || ''}
        lastVisitDate={selectedMarket?.lastVisitDate || ''}
        onCreateNewVisit={handleCreateNewVisit}
        onCountToExisting={handleCountToExisting}
        onClose={() => setShowVisitChoiceModal(false)}
      />
      
      {/* Delivery Photo Modal - shown when there are pending submissions from last visit */}
      <VorbestellerDeliveryPhotoModal
        isOpen={showDeliveryPhotoModal}
        marketName={selectedMarket?.name || ''}
        lastVisitDate={selectedMarket?.lastVisitDate || ''}
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

