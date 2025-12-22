import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FunnelSimple, X, MagnifyingGlass, Package } from '@phosphor-icons/react';
import { allProducts } from '../../data/productsData';
import type { Product } from '../../types/product-types';
import styles from './ProductsPage.module.css';

type FilterType = 'category' | 'subCategory' | 'brand' | 'price';

export const ProductsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<{
    category: string[];
    subCategory: string[];
    brand: string[];
    price: string[];
  }>({
    category: [],
    subCategory: [],
    brand: [],
    price: []
  });

  const filterRefs = {
    category: useRef<HTMLDivElement>(null),
    subCategory: useRef<HTMLDivElement>(null),
    brand: useRef<HTMLDivElement>(null),
    price: useRef<HTMLDivElement>(null)
  };

  // Get unique values for filters
  const uniqueCategories = useMemo(() => 
    [...new Set(allProducts.map(p => p.category))].sort(), 
    []
  );
  
  const uniqueSubCategories = useMemo(() => 
    [...new Set(allProducts.map(p => p.subCategory))].sort(), 
    []
  );
  
  const uniqueBrands = useMemo(() => 
    [...new Set(allProducts.map(p => p.brand))].sort(), 
    []
  );

  const priceRanges = [
    '< €1',
    '€1 - €2',
    '€2 - €3',
    '€3 - €5',
    '> €5'
  ];

  // Apply filters
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.orderNumber?.toString().includes(query)
      );
    }

    // Category filter
    if (selectedFilters.category.length > 0) {
      filtered = filtered.filter(p => selectedFilters.category.includes(p.category));
    }

    // Sub-category filter
    if (selectedFilters.subCategory.length > 0) {
      filtered = filtered.filter(p => selectedFilters.subCategory.includes(p.subCategory));
    }

    // Brand filter
    if (selectedFilters.brand.length > 0) {
      filtered = filtered.filter(p => selectedFilters.brand.includes(p.brand));
    }

    // Price filter
    if (selectedFilters.price.length > 0) {
      filtered = filtered.filter(p => {
        return selectedFilters.price.some(range => {
          if (range === '< €1') return p.price < 1;
          if (range === '€1 - €2') return p.price >= 1 && p.price < 2;
          if (range === '€2 - €3') return p.price >= 2 && p.price < 3;
          if (range === '€3 - €5') return p.price >= 3 && p.price < 5;
          if (range === '> €5') return p.price >= 5;
          return false;
        });
      });
    }

    return filtered;
  }, [searchQuery, selectedFilters]);

  const handleFilterToggle = (filterType: FilterType, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[filterType];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [filterType]: newValues };
    });
  };

  const handleSelectAll = (filterType: FilterType, allOptions: string[]) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: allOptions
    }));
  };

  const isAllSelected = (filterType: FilterType, allOptions: string[]) => {
    return selectedFilters[filterType].length === allOptions.length && allOptions.length > 0;
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      category: [],
      subCategory: [],
      brand: [],
      price: []
    });
    setSearchQuery('');
  };

  const hasActiveFilters = 
    selectedFilters.category.length > 0 ||
    selectedFilters.subCategory.length > 0 ||
    selectedFilters.brand.length > 0 ||
    selectedFilters.price.length > 0 ||
    searchQuery.trim().length > 0;

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(filterRefs).forEach(([key, ref]) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          if (openFilter === key as FilterType) {
            setOpenFilter(null);
          }
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter]);

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  const getCategoryColor = (category: string) => {
    return category === 'pets' ? '#10B981' : '#F59E0B';
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setEditedProduct({ ...product });
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setEditedProduct(null);
  };

  const handleSaveProduct = () => {
    // TODO: Implement save logic (API call)
    console.log('Saving product:', editedProduct);
    handleCloseModal();
  };

  const handleInputChange = (field: keyof Product, value: string | number) => {
    if (editedProduct) {
      setEditedProduct({
        ...editedProduct,
        [field]: value
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Products List with integrated search */}
      <div className={styles.listContainer}>
        {/* Search Bar - Now inside container */}
        <div className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <MagnifyingGlass size={20} weight="regular" className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Suche nach Name, Marke, SKU oder Bestellnummer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button 
                className={styles.clearSearchButton}
                onClick={() => setSearchQuery('')}
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>
          <div className={styles.searchStats}>
            <Package size={18} weight="regular" />
            <span>{filteredProducts.length} Produkte</span>
          </div>
        </div>

        <div className={styles.listHeader}>
          {hasActiveFilters && (
            <button
              className={styles.clearFiltersButton}
              onClick={clearAllFilters}
              title="Alle Filter löschen"
            >
              <X size={16} weight="bold" />
            </button>
          )}

          {/* Name */}
          <div className={styles.headerCell}>
            <span>Produktname</span>
          </div>

          {/* Category */}
          <div 
            className={`${styles.headerCell} ${selectedFilters.category.length > 0 ? styles.headerCellActive : ''}`}
            ref={filterRefs.category}
          >
            <span>Kategorie</span>
            <button
              className={`${styles.filterButton} ${selectedFilters.category.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenFilter(openFilter === 'category' ? null : 'category')}
            >
              <FunnelSimple size={14} weight={selectedFilters.category.length > 0 ? 'fill' : 'regular'} />
            </button>
            {openFilter === 'category' && (
              <div className={styles.filterDropdown}>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('category', uniqueCategories)}
                    onChange={() => {
                      if (isAllSelected('category', uniqueCategories)) {
                        setSelectedFilters(prev => ({ ...prev, category: [] }));
                      } else {
                        handleSelectAll('category', uniqueCategories);
                      }
                    }}
                  />
                  <span className={styles.filterOptionLabel}>
                    <strong>Alle</strong>
                  </span>
                </label>
                {uniqueCategories.map(cat => (
                  <label key={cat} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.category.includes(cat)}
                      onChange={() => handleFilterToggle('category', cat)}
                    />
                    <span className={styles.filterOptionLabel}>
                      {cat === 'pets' ? 'Haustiere' : 'Lebensmittel'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Sub-Category */}
          <div 
            className={`${styles.headerCell} ${selectedFilters.subCategory.length > 0 ? styles.headerCellActive : ''}`}
            ref={filterRefs.subCategory}
          >
            <span>Unterkategorie</span>
            <button
              className={`${styles.filterButton} ${selectedFilters.subCategory.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenFilter(openFilter === 'subCategory' ? null : 'subCategory')}
            >
              <FunnelSimple size={14} weight={selectedFilters.subCategory.length > 0 ? 'fill' : 'regular'} />
            </button>
            {openFilter === 'subCategory' && (
              <div className={styles.filterDropdown}>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('subCategory', uniqueSubCategories)}
                    onChange={() => {
                      if (isAllSelected('subCategory', uniqueSubCategories)) {
                        setSelectedFilters(prev => ({ ...prev, subCategory: [] }));
                      } else {
                        handleSelectAll('subCategory', uniqueSubCategories);
                      }
                    }}
                  />
                  <span className={styles.filterOptionLabel}>
                    <strong>Alle</strong>
                  </span>
                </label>
                {uniqueSubCategories.map(subCat => (
                  <label key={subCat} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.subCategory.includes(subCat)}
                      onChange={() => handleFilterToggle('subCategory', subCat)}
                    />
                    <span className={styles.filterOptionLabel}>{subCat}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Brand */}
          <div 
            className={`${styles.headerCell} ${selectedFilters.brand.length > 0 ? styles.headerCellActive : ''}`}
            ref={filterRefs.brand}
          >
            <span>Marke</span>
            <button
              className={`${styles.filterButton} ${selectedFilters.brand.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenFilter(openFilter === 'brand' ? null : 'brand')}
            >
              <FunnelSimple size={14} weight={selectedFilters.brand.length > 0 ? 'fill' : 'regular'} />
            </button>
            {openFilter === 'brand' && (
              <div className={styles.filterDropdown}>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('brand', uniqueBrands)}
                    onChange={() => {
                      if (isAllSelected('brand', uniqueBrands)) {
                        setSelectedFilters(prev => ({ ...prev, brand: [] }));
                      } else {
                        handleSelectAll('brand', uniqueBrands);
                      }
                    }}
                  />
                  <span className={styles.filterOptionLabel}>
                    <strong>Alle</strong>
                  </span>
                </label>
                {uniqueBrands.map(brand => (
                  <label key={brand} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.brand.includes(brand)}
                      onChange={() => handleFilterToggle('brand', brand)}
                    />
                    <span className={styles.filterOptionLabel}>{brand}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Price */}
          <div 
            className={`${styles.headerCell} ${selectedFilters.price.length > 0 ? styles.headerCellActive : ''}`}
            ref={filterRefs.price}
          >
            <span>Preis</span>
            <button
              className={`${styles.filterButton} ${selectedFilters.price.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
            >
              <FunnelSimple size={14} weight={selectedFilters.price.length > 0 ? 'fill' : 'regular'} />
            </button>
            {openFilter === 'price' && (
              <div className={styles.filterDropdown}>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('price', priceRanges)}
                    onChange={() => {
                      if (isAllSelected('price', priceRanges)) {
                        setSelectedFilters(prev => ({ ...prev, price: [] }));
                      } else {
                        handleSelectAll('price', priceRanges);
                      }
                    }}
                  />
                  <span className={styles.filterOptionLabel}>
                    <strong>Alle</strong>
                  </span>
                </label>
                {priceRanges.map(range => (
                  <label key={range} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.price.includes(range)}
                      onChange={() => handleFilterToggle('price', range)}
                    />
                    <span className={styles.filterOptionLabel}>{range}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Package Size */}
          <div className={styles.headerCell}>
            <span>Größe</span>
          </div>

          {/* Pallet Size */}
          <div className={styles.headerCell}>
            <span>Palette</span>
          </div>

          {/* SKU */}
          <div className={styles.headerCell}>
            <span>SKU</span>
          </div>

          {/* Order Number */}
          <div className={styles.headerCell}>
            <span>Best.-Nr.</span>
          </div>
        </div>

        {/* Products List */}
        <div className={styles.listContent}>
          {filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <Package size={48} weight="regular" />
              <p>Keine Produkte gefunden</p>
              {hasActiveFilters && (
                <button className={styles.clearFiltersEmptyButton} onClick={clearAllFilters}>
                  Filter zurücksetzen
                </button>
              )}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className={styles.productRow}
                onClick={() => handleProductClick(product)}
              >
                {/* Name */}
                <div className={styles.productCell}>
                  <span className={styles.productName}>{product.name}</span>
                </div>

                {/* Category */}
                <div className={styles.productCell}>
                  <span 
                    className={styles.categoryBadge}
                    style={{ 
                      backgroundColor: `${getCategoryColor(product.category)}15`,
                      color: getCategoryColor(product.category),
                      borderColor: `${getCategoryColor(product.category)}30`
                    }}
                  >
                    {product.category === 'pets' ? 'Haustiere' : 'Lebensmittel'}
                  </span>
                </div>

                {/* Sub-Category */}
                <div className={styles.productCell}>
                  <span className={styles.subCategory}>{product.subCategory}</span>
                </div>

                {/* Brand */}
                <div className={styles.productCell}>
                  <span className={styles.brand}>{product.brand}</span>
                </div>

                {/* Price */}
                <div className={styles.productCell}>
                  <span className={styles.price}>{formatPrice(product.price)}</span>
                </div>

                {/* Package Size */}
                <div className={styles.productCell}>
                  <span className={styles.packageSize}>{product.packageSize}</span>
                </div>

                {/* Pallet Size */}
                <div className={styles.productCell}>
                  <span className={styles.palletSize}>{product.palletSize || '-'}</span>
                </div>

                {/* SKU */}
                <div className={styles.productCell}>
                  <span className={styles.sku}>{product.sku}</span>
                </div>

                {/* Order Number */}
                <div className={styles.productCell}>
                  <span className={styles.orderNumber}>{product.orderNumber}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && editedProduct && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedProduct.name}</h3>
              <button className={styles.modalClose} onClick={handleCloseModal}>
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                {/* Product Name */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Produktname</label>
                  <input
                    type="text"
                    className={styles.detailInput}
                    value={editedProduct.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>

                {/* Brand */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Marke</label>
                  <input
                    type="text"
                    className={styles.detailInput}
                    value={editedProduct.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                  />
                </div>

                {/* Category */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Kategorie</label>
                  <select
                    className={styles.detailSelect}
                    value={editedProduct.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    <option value="pets">Haustiere</option>
                    <option value="food">Lebensmittel</option>
                  </select>
                </div>

                {/* Sub-Category */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Unterkategorie</label>
                  <input
                    type="text"
                    className={styles.detailInput}
                    value={editedProduct.subCategory}
                    onChange={(e) => handleInputChange('subCategory', e.target.value)}
                  />
                </div>

                {/* Price */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Preis (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.detailInput}
                    value={editedProduct.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  />
                </div>

                {/* Package Size */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Packungsgröße</label>
                  <input
                    type="text"
                    className={styles.detailInput}
                    value={editedProduct.packageSize}
                    onChange={(e) => handleInputChange('packageSize', e.target.value)}
                  />
                </div>

                {/* Pallet Size */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Palettengröße (Stück)</label>
                  <input
                    type="number"
                    className={styles.detailInput}
                    value={editedProduct.palletSize || ''}
                    onChange={(e) => handleInputChange('palletSize', parseInt(e.target.value) || 0)}
                    placeholder="z.B. 120"
                  />
                </div>

                {/* Weight */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Gewicht (g)</label>
                  <input
                    type="number"
                    className={styles.detailInput}
                    value={editedProduct.weight || ''}
                    onChange={(e) => handleInputChange('weight', parseInt(e.target.value) || 0)}
                    placeholder="Optional"
                  />
                </div>

                {/* Volume */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Volumen (ml)</label>
                  <input
                    type="number"
                    className={styles.detailInput}
                    value={editedProduct.volume || ''}
                    onChange={(e) => handleInputChange('volume', parseInt(e.target.value) || 0)}
                    placeholder="Optional"
                  />
                </div>

                {/* SKU */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>SKU</label>
                  <input
                    type="text"
                    className={styles.detailInput}
                    value={editedProduct.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                  />
                </div>

                {/* Order Number */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Bestellnummer</label>
                  <input
                    type="number"
                    className={styles.detailInput}
                    value={editedProduct.orderNumber || ''}
                    onChange={(e) => handleInputChange('orderNumber', parseInt(e.target.value) || 0)}
                    placeholder="5-stellig"
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.cancelButton} onClick={handleCloseModal}>
                  Abbrechen
                </button>
                <button className={styles.saveButton} onClick={handleSaveProduct}>
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
