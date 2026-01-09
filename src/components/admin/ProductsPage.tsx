import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FunnelSimple, X, MagnifyingGlass, Package, CaretDown, SortAscending, SortDescending } from '@phosphor-icons/react';
import { getAllProducts, deleteProduct } from '../../data/productsData';
import type { Product } from '../../types/product-types';
import styles from './ProductsPage.module.css';

type FilterType = 'department' | 'productType' | 'weight' | 'price';
type SortField = 'name' | 'department' | 'price' | 'weight';

type ModalDropdownType = 'department' | 'productType';

export const ProductsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [openModalDropdown, setOpenModalDropdown] = useState<ModalDropdownType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render when products change
  const [products, setProducts] = useState<Product[]>([]); // State for products
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [selectedFilters, setSelectedFilters] = useState<{
    department: string[];
    productType: string[];
    weight: string[];
    price: string[];
  }>({
    department: [],
    productType: [],
    weight: [],
    price: []
  });
  
  // Delete confirmation state
  const [deleteClickedOnce, setDeleteClickedOnce] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<FilterType, string>>({
    department: '',
    productType: '',
    weight: '',
    price: ''
  });

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const filterRefs = {
    department: useRef<HTMLDivElement>(null),
    productType: useRef<HTMLDivElement>(null),
    weight: useRef<HTMLDivElement>(null),
    price: useRef<HTMLDivElement>(null)
  };

  // Get unique values for filters
  const uniqueDepartments = useMemo(() => 
    [...new Set(products.map(p => p.department))].sort(), 
    [products, refreshKey]
  );
  
  const uniqueProductTypes = useMemo(() => 
    [...new Set(products.map(p => p.productType))].sort(), 
    [products, refreshKey]
  );

  const uniqueWeights = useMemo(() => 
    [...new Set(products.map(p => p.weight))].sort((a, b) => {
      // Custom sort: numbers first, then alphabetically
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    }), 
    [products, refreshKey]
  );

  const priceRanges = [
    '< €1',
    '€1 - €2',
    '€2 - €3',
    '€3 - €5',
    '> €5'
  ];

  // Load products on mount
  useEffect(() => {
    const loadProductsData = async () => {
      setIsLoading(true);
      try {
        const loadedProducts = await getAllProducts();
        setProducts(loadedProducts);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductsData();
  }, [refreshKey]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.weight.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query))
      );
    }

    // Department filter
    if (selectedFilters.department.length > 0) {
      filtered = filtered.filter(p => selectedFilters.department.includes(p.department));
    }

    // Product Type filter
    if (selectedFilters.productType.length > 0) {
      filtered = filtered.filter(p => selectedFilters.productType.includes(p.productType));
    }

    // Weight filter
    if (selectedFilters.weight.length > 0) {
      filtered = filtered.filter(p => selectedFilters.weight.includes(p.weight));
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

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'de');
          break;
        case 'department':
          comparison = a.department.localeCompare(b.department, 'de');
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'weight':
          comparison = a.weight.localeCompare(b.weight, 'de');
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [searchQuery, selectedFilters, products, refreshKey, sortField, sortDirection]);

  // Listen for product updates
  useEffect(() => {
    const handleProductsUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('productsUpdated', handleProductsUpdate);
    return () => window.removeEventListener('productsUpdated', handleProductsUpdate);
  }, []);

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

  const handleSearchChange = (type: FilterType, value: string) => {
    setSearchTerms(prev => ({ ...prev, [type]: value }));
  };

  // Filter options based on search term
  const getFilteredOptions = (type: FilterType, options: string[]) => {
    const search = searchTerms[type].toLowerCase();
    return options.filter(option => option.toLowerCase().includes(search));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      department: [],
      productType: [],
      weight: [],
      price: []
    });
    setSearchQuery('');
    setSearchTerms({
      department: '',
      productType: '',
      weight: '',
      price: ''
    });
    // Reset sort to default
    setSortField('name');
    setSortDirection('asc');
  };

  const hasActiveFilters = 
    selectedFilters.department.length > 0 ||
    selectedFilters.productType.length > 0 ||
    selectedFilters.weight.length > 0 ||
    selectedFilters.price.length > 0 ||
    searchQuery.trim().length > 0 ||
    sortField !== 'name' || sortDirection !== 'asc';

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openFilter) return;

      const clickedElement = event.target as HTMLElement;
      const currentFilterRef = filterRefs[openFilter].current;

      // Check if click is outside the current open filter
      if (currentFilterRef && !currentFilterRef.contains(clickedElement)) {
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFilter]);

  // Close sort dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'name', label: 'Name' },
    { field: 'department', label: 'Abteilung' },
    { field: 'price', label: 'Preis' },
    { field: 'weight', label: 'Gewicht' }
  ];

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setIsSortDropdownOpen(false);
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  const getDepartmentColor = (department: string) => {
    return department === 'pets' ? '#10B981' : '#F59E0B';
  };

  const getDepartmentLabel = (department: string) => {
    return department === 'pets' ? 'Tiernahrung' : 'Lebensmittel';
  };

  const getProductTypeLabel = (productType: string) => {
    switch (productType) {
      case 'standard': return 'Standard';
      case 'display': return 'Display';
      case 'palette': return 'Palette';
      case 'schuette': return 'Schütte';
      default: return productType;
    }
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
    // After saving, refresh products
    setRefreshKey(prev => prev + 1);
    handleCloseModal();
  };

  // Handle delete with double-click confirmation
  const handleDeleteClick = async () => {
    if (!selectedProduct) return;
    
    if (deleteClickedOnce) {
      // Second click within 2 seconds - perform delete
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      setIsDeleting(true);
      try {
        await deleteProduct(selectedProduct.id);
        setProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
        setRefreshKey(prev => prev + 1);
        handleCloseModal();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Fehler beim Löschen des Produkts');
      } finally {
        setIsDeleting(false);
        setDeleteClickedOnce(false);
      }
    } else {
      // First click - start 2 second window
      setDeleteClickedOnce(true);
      deleteTimeoutRef.current = setTimeout(() => {
        setDeleteClickedOnce(false);
      }, 2000);
    }
  };

  // Cleanup timeout on modal close
  const handleCloseModalWithCleanup = () => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }
    setDeleteClickedOnce(false);
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
              placeholder="Suche nach Name, Gewicht oder SKU..."
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
          <div className={styles.sortDropdownWrapper} ref={sortDropdownRef}>
            <button 
              className={styles.sortButton}
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            >
              {sortDirection === 'asc' ? (
                <SortAscending size={18} weight="bold" />
              ) : (
                <SortDescending size={18} weight="bold" />
              )}
              <span>{sortOptions.find(o => o.field === sortField)?.label}</span>
              <CaretDown size={14} weight="bold" className={`${styles.sortCaret} ${isSortDropdownOpen ? styles.sortCaretOpen : ''}`} />
            </button>
            {isSortDropdownOpen && (
              <div className={styles.sortDropdown}>
                {sortOptions.map(option => (
                  <button
                    key={option.field}
                    className={`${styles.sortOption} ${sortField === option.field ? styles.sortOptionActive : ''}`}
                    onClick={() => handleSortChange(option.field)}
                  >
                    <span>{option.label}</span>
                    {sortField === option.field && (
                      sortDirection === 'asc' ? (
                        <SortAscending size={16} weight="bold" />
                      ) : (
                        <SortDescending size={16} weight="bold" />
                      )
                    )}
                  </button>
                ))}
              </div>
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

          {/* Department */}
          <div 
            className={`${styles.headerCell} ${selectedFilters.department.length > 0 ? styles.headerCellActive : ''}`}
            ref={filterRefs.department}
          >
            <span>Abteilung</span>
            <button
              className={`${styles.filterButton} ${selectedFilters.department.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenFilter(openFilter === 'department' ? null : 'department')}
            >
              <FunnelSimple size={14} weight={selectedFilters.department.length > 0 ? 'fill' : 'regular'} />
            </button>
            {openFilter === 'department' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.department}
                    onChange={(e) => handleSearchChange('department', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('department', getFilteredOptions('department', uniqueDepartments))}
                    onChange={() => {
                      if (isAllSelected('department', getFilteredOptions('department', uniqueDepartments))) {
                        setSelectedFilters(prev => ({ ...prev, department: [] }));
                      } else {
                        handleSelectAll('department', getFilteredOptions('department', uniqueDepartments));
                      }
                    }}
                  />
                  <span className={styles.filterOptionLabel}>
                    <strong>Alle</strong>
                  </span>
                </label>
                {getFilteredOptions('department', uniqueDepartments).map(dept => (
                  <label key={dept} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.department.includes(dept)}
                      onChange={() => handleFilterToggle('department', dept)}
                    />
                    <span className={styles.filterOptionLabel}>
                      {getDepartmentLabel(dept)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Product Type */}
          <div 
            className={`${styles.headerCell} ${selectedFilters.productType.length > 0 ? styles.headerCellActive : ''}`}
            ref={filterRefs.productType}
          >
            <span>Typ</span>
            <button
              className={`${styles.filterButton} ${selectedFilters.productType.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenFilter(openFilter === 'productType' ? null : 'productType')}
            >
              <FunnelSimple size={14} weight={selectedFilters.productType.length > 0 ? 'fill' : 'regular'} />
            </button>
            {openFilter === 'productType' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.productType}
                    onChange={(e) => handleSearchChange('productType', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('productType', getFilteredOptions('productType', uniqueProductTypes))}
                    onChange={() => {
                      if (isAllSelected('productType', getFilteredOptions('productType', uniqueProductTypes))) {
                        setSelectedFilters(prev => ({ ...prev, productType: [] }));
                      } else {
                        handleSelectAll('productType', getFilteredOptions('productType', uniqueProductTypes));
                      }
                    }}
                  />
                  <span className={styles.filterOptionLabel}>
                    <strong>Alle</strong>
                  </span>
                </label>
                {getFilteredOptions('productType', uniqueProductTypes).map(type => (
                  <label key={type} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.productType.includes(type)}
                      onChange={() => handleFilterToggle('productType', type)}
                    />
                    <span className={styles.filterOptionLabel}>{getProductTypeLabel(type)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Weight/Size */}
          <div 
            className={`${styles.headerCell} ${selectedFilters.weight.length > 0 ? styles.headerCellActive : ''}`}
            ref={filterRefs.weight}
          >
            <span>Gewicht/Größe</span>
            <button
              className={`${styles.filterButton} ${selectedFilters.weight.length > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenFilter(openFilter === 'weight' ? null : 'weight')}
            >
              <FunnelSimple size={14} weight={selectedFilters.weight.length > 0 ? 'fill' : 'regular'} />
            </button>
            {openFilter === 'weight' && (
              <div className={styles.filterDropdown}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.weight}
                    onChange={(e) => handleSearchChange('weight', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('weight', getFilteredOptions('weight', uniqueWeights))}
                    onChange={() => {
                      if (isAllSelected('weight', getFilteredOptions('weight', uniqueWeights))) {
                        setSelectedFilters(prev => ({ ...prev, weight: [] }));
                      } else {
                        handleSelectAll('weight', getFilteredOptions('weight', uniqueWeights));
                      }
                    }}
                  />
                  <span className={styles.filterOptionLabel}>
                    <strong>Alle</strong>
                  </span>
                </label>
                {getFilteredOptions('weight', uniqueWeights).map(weight => (
                  <label key={weight} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedFilters.weight.includes(weight)}
                      onChange={() => handleFilterToggle('weight', weight)}
                    />
                    <span className={styles.filterOptionLabel}>{weight}</span>
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
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className={styles.searchInput}
                    value={searchTerms.price}
                    onChange={(e) => handleSearchChange('price', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={isAllSelected('price', getFilteredOptions('price', priceRanges))}
                    onChange={() => {
                      if (isAllSelected('price', getFilteredOptions('price', priceRanges))) {
                        setSelectedFilters(prev => ({ ...prev, price: [] }));
                      } else {
                        handleSelectAll('price', getFilteredOptions('price', priceRanges));
                      }
                    }}
                  />
                  <span className={styles.filterOptionLabel}>
                    <strong>Alle</strong>
                  </span>
                </label>
                {getFilteredOptions('price', priceRanges).map(range => (
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

          {/* Pallet Size */}
          <div className={styles.headerCell}>
            <span>Palette</span>
          </div>
        </div>

        {/* Products List */}
        <div className={styles.listContent}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <Package size={48} weight="regular" />
              <p>Lade Produkte...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
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

                {/* Department */}
                <div className={styles.productCell}>
                  <span 
                    className={styles.categoryBadge}
                    style={{ 
                      backgroundColor: `${getDepartmentColor(product.department)}15`,
                      color: getDepartmentColor(product.department),
                      borderColor: `${getDepartmentColor(product.department)}30`
                    }}
                  >
                    {getDepartmentLabel(product.department)}
                  </span>
                </div>

                {/* Product Type */}
                <div className={styles.productCell}>
                  <span className={styles.subCategory}>{getProductTypeLabel(product.productType)}</span>
                </div>

                {/* Weight */}
                <div className={styles.productCell}>
                  <span className={styles.packageSize}>{product.weight}</span>
                </div>

                {/* Price */}
                <div className={styles.productCell}>
                  <span className={styles.price}>{formatPrice(product.price)}</span>
                </div>

                {/* Pallet Size */}
                <div className={styles.productCell}>
                  <span className={styles.palletSize}>{product.palletSize || '-'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && editedProduct && (
        <div className={styles.modalOverlay} onClick={handleCloseModalWithCleanup}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleRow}>
                <h3 className={styles.modalTitle}>{selectedProduct.name}</h3>
                <span 
                  className={styles.categoryBadge}
                  style={{ 
                    backgroundColor: `${getDepartmentColor(selectedProduct.department)}15`,
                    color: getDepartmentColor(selectedProduct.department),
                    borderColor: `${getDepartmentColor(selectedProduct.department)}30`,
                    marginLeft: '12px'
                  }}
                >
                  {getDepartmentLabel(selectedProduct.department)}
                </span>
              </div>
              <button className={styles.modalClose} onClick={handleCloseModalWithCleanup}>
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

                {/* Department */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Abteilung</label>
                  <div className={styles.customDropdownWrapper}>
                    <button
                      className={styles.customDropdownButton}
                      onClick={() => setOpenModalDropdown(openModalDropdown === 'department' ? null : 'department')}
                      type="button"
                    >
                      <span>{getDepartmentLabel(editedProduct.department)}</span>
                      <CaretDown size={16} weight="bold" />
                    </button>
                    {openModalDropdown === 'department' && (
                      <div className={styles.customDropdownMenu}>
                        <div
                          className={`${styles.customDropdownOption} ${editedProduct.department === 'pets' ? styles.customDropdownOptionSelected : ''}`}
                          onClick={() => {
                            handleInputChange('department', 'pets');
                            setOpenModalDropdown(null);
                          }}
                        >
                          Tiernahrung
                        </div>
                        <div
                          className={`${styles.customDropdownOption} ${editedProduct.department === 'food' ? styles.customDropdownOptionSelected : ''}`}
                          onClick={() => {
                            handleInputChange('department', 'food');
                            setOpenModalDropdown(null);
                          }}
                        >
                          Lebensmittel
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Type */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Produkttyp</label>
                  <div className={styles.customDropdownWrapper}>
                    <button
                      className={styles.customDropdownButton}
                      onClick={() => setOpenModalDropdown(openModalDropdown === 'productType' ? null : 'productType')}
                      type="button"
                    >
                      <span>{getProductTypeLabel(editedProduct.productType)}</span>
                      <CaretDown size={16} weight="bold" />
                    </button>
                    {openModalDropdown === 'productType' && (
                      <div className={styles.customDropdownMenu}>
                        <div
                          className={`${styles.customDropdownOption} ${editedProduct.productType === 'standard' ? styles.customDropdownOptionSelected : ''}`}
                          onClick={() => {
                            handleInputChange('productType', 'standard');
                            setOpenModalDropdown(null);
                          }}
                        >
                          Standard
                        </div>
                        <div
                          className={`${styles.customDropdownOption} ${editedProduct.productType === 'display' ? styles.customDropdownOptionSelected : ''}`}
                          onClick={() => {
                            handleInputChange('productType', 'display');
                            setOpenModalDropdown(null);
                          }}
                        >
                          Display
                        </div>
                        <div
                          className={`${styles.customDropdownOption} ${editedProduct.productType === 'palette' ? styles.customDropdownOptionSelected : ''}`}
                          onClick={() => {
                            handleInputChange('productType', 'palette');
                            setOpenModalDropdown(null);
                          }}
                        >
                          Palette
                        </div>
                        <div
                          className={`${styles.customDropdownOption} ${editedProduct.productType === 'schuette' ? styles.customDropdownOptionSelected : ''}`}
                          onClick={() => {
                            handleInputChange('productType', 'schuette');
                            setOpenModalDropdown(null);
                          }}
                        >
                          Schütte
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Weight */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Gewicht</label>
                  <input
                    type="text"
                    className={styles.detailInput}
                    value={editedProduct.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder="z.B. 150g, 1kg"
                  />
                </div>

                {/* Content / Palette or Schütte Products */}
                {(editedProduct.productType === 'palette' || editedProduct.productType === 'schuette') && editedProduct.paletteProducts ? (
                  <div className={styles.detailItemFull}>
                    <label className={styles.detailLabel}>Produkte ({editedProduct.paletteProducts.length})</label>
                    <div className={styles.paletteProductsList}>
                      {editedProduct.paletteProducts.map((product, index) => (
                        <div key={index} className={styles.paletteProductRow}>
                          <div className={styles.paletteProductName}>{product.name}</div>
                          <div className={styles.paletteProductDetails}>
                            <span className={styles.paletteProductPrice}>€{product.value.toFixed(2)}/VE</span>
                            <span className={styles.paletteProductVE}>VE: {product.ve}</span>
                            {product.ean && <span className={styles.paletteProductEAN}>EAN: {product.ean}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.detailItem}>
                    <label className={styles.detailLabel}>Inhalt</label>
                    <input
                      type="text"
                      className={styles.detailInput}
                      value={editedProduct.content || ''}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                )}

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

                {/* SKU */}
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>SKU</label>
                  <input
                    type="text"
                    className={styles.detailInput}
                    value={editedProduct.sku || ''}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Automatisch generiert"
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={`${styles.deleteButton} ${deleteClickedOnce ? styles.deleteConfirm : ''}`}
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Löschen...' : deleteClickedOnce ? 'Nochmal klicken!' : 'Löschen'}
                </button>
                <div className={styles.modalActionsRight}>
                  <button className={styles.cancelButton} onClick={handleCloseModalWithCleanup}>
                    Abbrechen
                  </button>
                  <button className={styles.saveButton} onClick={handleSaveProduct}>
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
