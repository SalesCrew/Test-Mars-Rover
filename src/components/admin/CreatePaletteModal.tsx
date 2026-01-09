import React, { useState } from 'react';
import { X, Plus, Trash, Check, ArrowLeft, Package } from '@phosphor-icons/react';
import styles from './CreatePaletteModal.module.css';
import type { Product } from '../../types/product-types';

interface CreatePaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (palettes: Product[]) => void;
  department: 'pets' | 'food';
}

interface PaletteProductItem {
  name: string;
  value: number;
  ve: number; // Verkaufseinheit
  ean: string;
}

interface PaletteItem {
  name: string;
  subname: string;
  products: PaletteProductItem[];
  size: string;
}

export const CreatePaletteModal: React.FC<CreatePaletteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  department
}) => {
  const [step, setStep] = useState<'input' | 'summary'>('input');
  const [currentPalette, setCurrentPalette] = useState<PaletteItem>({
    name: '',
    subname: '',
    products: [{ name: '', value: 0, ve: 0, ean: '' }],
    size: ''
  });
  const [createdPalettes, setCreatedPalettes] = useState<PaletteItem[]>([]);

  if (!isOpen) return null;

  const handleAddProduct = () => {
    setCurrentPalette(prev => ({
      ...prev,
      products: [...prev.products, { name: '', value: 0, ve: 0, ean: '' }]
    }));
  };

  const handleRemoveProduct = (index: number) => {
    if (currentPalette.products.length > 1) {
      setCurrentPalette(prev => ({
        ...prev,
        products: prev.products.filter((_, i) => i !== index)
      }));
    }
  };

  const handleProductChange = (index: number, field: 'name' | 'value' | 've' | 'ean', value: string | number) => {
    setCurrentPalette(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const handleWeiter = () => {
    if (isFormValid()) {
      setCreatedPalettes(prev => [...prev, currentPalette]);
      resetCurrentPalette();
    }
  };

  const handleFertig = () => {
    if (isFormValid()) {
      const finalPalettes = [...createdPalettes, currentPalette];
      setStep('summary');
      setCreatedPalettes(finalPalettes);
    } else if (createdPalettes.length > 0) {
      setStep('summary');
    }
  };

  const handleSave = () => {
    const products: Product[] = createdPalettes.map((palette, index) => ({
      id: `palette-${department}-${Date.now()}-${index}`,
      name: palette.name,
      department: department,
      productType: 'palette' as const,
      weight: palette.size,
      content: palette.products.map(p => `${p.name} (€${p.value.toFixed(2)}/VE, VE: ${p.ve}${p.ean ? `, EAN: ${p.ean}` : ''})`).join(', '),
      palletSize: palette.products.length,
      price: getTotalValue(palette.products), // Store total value in price field
      sku: undefined
    }));

    onSave(products);
    handleReset();
    onClose();
  };

  const resetCurrentPalette = () => {
    setCurrentPalette({
      name: '',
      subname: '',
      products: [{ name: '', value: 0, ve: 0, ean: '' }],
      size: ''
    });
  };

  const handleReset = () => {
    setStep('input');
    resetCurrentPalette();
    setCreatedPalettes([]);
  };

  const handleRemovePalette = (index: number) => {
    setCreatedPalettes(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditPalette = (index: number) => {
    setCurrentPalette(createdPalettes[index]);
    setCreatedPalettes(prev => prev.filter((_, i) => i !== index));
    setStep('input');
  };

  const isFormValid = () => {
    return (
      currentPalette.name.trim() !== '' &&
      currentPalette.size.trim() !== '' &&
      currentPalette.products.every(p => p.name.trim() !== '' && p.value > 0 && p.ve > 0)
    );
  };

  // Calculate total value of palette products
  const getTotalValue = (products: PaletteProductItem[]) => {
    return products.reduce((sum, p) => sum + p.value, 0);
  };

  const departmentColor = department === 'pets' ? '#10B981' : '#F59E0B';
  const departmentLabel = department === 'pets' ? 'Tiernahrung' : 'Lebensmittel';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.departmentBadge} style={{ 
              backgroundColor: `${departmentColor}15`,
              color: departmentColor,
              borderColor: `${departmentColor}30`
            }}>
              {departmentLabel}
            </div>
            <h2 className={styles.modalTitle}>Palette erstellen</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {step === 'input' ? (
            <div className={styles.inputForm}>
              {/* Name */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Palettenname *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={currentPalette.name}
                  onChange={(e) => setCurrentPalette(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Whiskas Aktionspalette"
                />
              </div>

              {/* Subname */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Subname</label>
                <input
                  type="text"
                  className={styles.input}
                  value={currentPalette.subname}
                  onChange={(e) => setCurrentPalette(prev => ({ ...prev, subname: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              {/* Size */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Größe *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={currentPalette.size}
                  onChange={(e) => setCurrentPalette(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="z.B. 120cm x 80cm"
                />
              </div>

              {/* Products */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Produkte *</label>
                <p className={styles.labelHint}>
                  GLs können frei aus diesen Produkten wählen (min. 600€ pro Markt)
                </p>
                <div className={styles.productsWrapper}>
                  {currentPalette.products.map((product, index) => (
                    <div key={index} className={styles.productInputRow}>
                      <input
                        type="text"
                        className={styles.inputProductName}
                        value={product.name}
                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                        placeholder="Produktname"
                      />
                      <input
                        type="number"
                        step="0.01"
                        className={styles.inputProductValue}
                        value={product.value || ''}
                        onChange={(e) => handleProductChange(index, 'value', parseFloat(e.target.value) || 0)}
                        placeholder="Preis (€)"
                        min="0"
                      />
                      <input
                        type="number"
                        className={styles.inputProductVE}
                        value={product.ve || ''}
                        onChange={(e) => handleProductChange(index, 've', parseInt(e.target.value) || 0)}
                        placeholder="VE"
                        min="0"
                      />
                      <input
                        type="text"
                        className={styles.inputProductEAN}
                        value={product.ean}
                        onChange={(e) => handleProductChange(index, 'ean', e.target.value)}
                        placeholder="EAN-Code"
                      />
                      {currentPalette.products.length > 1 && (
                        <button
                          className={styles.removeProductButton}
                          onClick={() => handleRemoveProduct(index)}
                          title="Entfernen"
                        >
                          <Trash size={16} weight="bold" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className={styles.addProductButton} onClick={handleAddProduct}>
                    <Plus size={16} weight="bold" />
                    <span>Weitere hinzufügen</span>
                  </button>
                </div>
              </div>

              {/* Created palettes count */}
              {createdPalettes.length > 0 && (
                <div className={styles.createdCount}>
                  <Package size={18} weight="fill" style={{ color: departmentColor }} />
                  <span>{createdPalettes.length} Palette{createdPalettes.length > 1 ? 'n' : ''} erstellt</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.summaryView}>
              <h3 className={styles.summaryTitle}>Zusammenfassung</h3>
              <p className={styles.summarySubtitle}>
                {createdPalettes.length} Palette{createdPalettes.length > 1 ? 'n' : ''} bereit zum Speichern
              </p>
              
              <div className={styles.palettesList}>
                {createdPalettes.map((palette, index) => (
                  <div key={index} className={styles.paletteCard}>
                    <div className={styles.paletteCardHeader}>
                      <div className={styles.paletteCardTitle}>
                        <Package size={20} weight="fill" style={{ color: departmentColor }} />
                        <div>
                          <span className={styles.paletteName}>{palette.name}</span>
                          {palette.subname && (
                            <span className={styles.paletteSubname}>{palette.subname}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.paletteCardActions}>
                        <button
                          className={styles.editButton}
                          onClick={() => handleEditPalette(index)}
                          title="Bearbeiten"
                        >
                          <ArrowLeft size={16} weight="bold" />
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleRemovePalette(index)}
                          title="Löschen"
                        >
                          <Trash size={16} weight="bold" />
                        </button>
                      </div>
                    </div>
                    
                    <div className={styles.paletteCardDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Größe:</span>
                        <span className={styles.detailValue}>{palette.size}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Produkte:</span>
                        <div className={styles.contentsList}>
                          {palette.products.map((p, i) => (
                            <div key={i} className={styles.contentItem}>
                              <span className={styles.productItemName}>{p.name}</span>
                              <span className={styles.productItemValue}>€{p.value.toFixed(2)}/VE · VE: {p.ve}</span>
                              {p.ean && <span className={styles.productItemEAN}>EAN: {p.ean}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          {step === 'input' ? (
            <>
              <button className={styles.cancelButton} onClick={onClose}>
                Abbrechen
              </button>
              <div className={styles.footerRight}>
                <button
                  className={styles.secondaryButton}
                  onClick={handleWeiter}
                  disabled={!isFormValid()}
                >
                  <Plus size={18} weight="bold" />
                  <span>Weiter</span>
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleFertig}
                  disabled={!isFormValid() && createdPalettes.length === 0}
                  style={{ backgroundColor: departmentColor, borderColor: departmentColor }}
                >
                  <Check size={18} weight="bold" />
                  <span>Fertig</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button className={styles.secondaryButton} onClick={() => setStep('input')}>
                <ArrowLeft size={18} weight="bold" />
                <span>Zurück</span>
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleSave}
                disabled={createdPalettes.length === 0}
                style={{ backgroundColor: departmentColor, borderColor: departmentColor }}
              >
                <Check size={18} weight="bold" />
                <span>Speichern ({createdPalettes.length})</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
