import React, { useState } from 'react';
import { X, Plus, Trash, Check, ArrowLeft, Package } from '@phosphor-icons/react';
import styles from './CreateSchutteModal.module.css';
import type { Product } from '../../types/product-types';

interface CreateSchutteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schuetten: Product[]) => void;
  department: 'pets' | 'food';
}

interface SchutteProductItem {
  name: string;
  value: number;
  ve: number; // Verkaufseinheit
  ean: string;
}

interface SchutteItem {
  name: string;
  subname: string;
  products: SchutteProductItem[];
  size: string;
}

export const CreateSchutteModal: React.FC<CreateSchutteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  department
}) => {
  const [step, setStep] = useState<'input' | 'summary'>('input');
  const [currentSchutte, setCurrentSchutte] = useState<SchutteItem>({
    name: '',
    subname: '',
    products: [{ name: '', value: 0, ve: 0, ean: '' }],
    size: ''
  });
  const [createdSchuetten, setCreatedSchuetten] = useState<SchutteItem[]>([]);

  if (!isOpen) return null;

  const handleAddProduct = () => {
    setCurrentSchutte(prev => ({
      ...prev,
      products: [...prev.products, { name: '', value: 0, ve: 0, ean: '' }]
    }));
  };

  const handleRemoveProduct = (index: number) => {
    if (currentSchutte.products.length > 1) {
      setCurrentSchutte(prev => ({
        ...prev,
        products: prev.products.filter((_, i) => i !== index)
      }));
    }
  };

  const handleProductChange = (index: number, field: 'name' | 'value' | 've' | 'ean', value: string | number) => {
    setCurrentSchutte(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const handleWeiter = () => {
    if (isFormValid()) {
      setCreatedSchuetten(prev => [...prev, currentSchutte]);
      resetCurrentSchutte();
    }
  };

  const handleFertig = () => {
    if (isFormValid()) {
      const finalSchuetten = [...createdSchuetten, currentSchutte];
      setStep('summary');
      setCreatedSchuetten(finalSchuetten);
    } else if (createdSchuetten.length > 0) {
      setStep('summary');
    }
  };

  const handleSave = () => {
    const products: Product[] = createdSchuetten.map((schutte, index) => ({
      id: `schuette-${department}-${Date.now()}-${index}`,
      name: schutte.name,
      department: department,
      productType: 'schuette' as const,
      weight: schutte.size,
      content: schutte.products.map(p => `${p.name} (€${p.value.toFixed(2)}/VE, VE: ${p.ve}${p.ean ? `, EAN: ${p.ean}` : ''})`).join(', '),
      palletSize: schutte.products.length,
      price: 0, // Schütten don't have a fixed price
      sku: undefined,
      paletteProducts: schutte.products.map(p => ({
        name: p.name,
        value: p.value,
        ve: p.ve,
        ean: p.ean || undefined
      }))
    }));

    onSave(products);
    handleReset();
    onClose();
  };

  const resetCurrentSchutte = () => {
    setCurrentSchutte({
      name: '',
      subname: '',
      products: [{ name: '', value: 0, ve: 0, ean: '' }],
      size: ''
    });
  };

  const handleReset = () => {
    setStep('input');
    resetCurrentSchutte();
    setCreatedSchuetten([]);
  };

  const handleRemoveSchutte = (index: number) => {
    setCreatedSchuetten(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditSchutte = (index: number) => {
    setCurrentSchutte(createdSchuetten[index]);
    setCreatedSchuetten(prev => prev.filter((_, i) => i !== index));
    setStep('input');
  };

  const isFormValid = () => {
    return (
      currentSchutte.name.trim() !== '' &&
      currentSchutte.size.trim() !== '' &&
      currentSchutte.products.every(p => p.name.trim() !== '' && p.value > 0 && p.ve > 0)
    );
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
            <h2 className={styles.modalTitle}>Schütte erstellen</h2>
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
                <label className={styles.label}>Schüttenname *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={currentSchutte.name}
                  onChange={(e) => setCurrentSchutte(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Whiskas Aktionsschütte"
                />
              </div>

              {/* Subname */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Subname</label>
                <input
                  type="text"
                  className={styles.input}
                  value={currentSchutte.subname}
                  onChange={(e) => setCurrentSchutte(prev => ({ ...prev, subname: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              {/* Size */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Größe *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={currentSchutte.size}
                  onChange={(e) => setCurrentSchutte(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="z.B. 60cm x 40cm"
                />
              </div>

              {/* Products */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Produkte *</label>
                <p className={styles.labelHint}>
                  GLs können frei aus diesen Produkten wählen (min. 600€ pro Markt)
                </p>
                <div className={styles.productsWrapper}>
                  {currentSchutte.products.map((product, index) => (
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
                      {currentSchutte.products.length > 1 && (
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

              {/* Created schuetten count */}
              {createdSchuetten.length > 0 && (
                <div className={styles.createdCount}>
                  <Package size={18} weight="fill" style={{ color: departmentColor }} />
                  <span>{createdSchuetten.length} Schütte{createdSchuetten.length > 1 ? 'n' : ''} erstellt</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.summaryView}>
              <h3 className={styles.summaryTitle}>Zusammenfassung</h3>
              <p className={styles.summarySubtitle}>
                {createdSchuetten.length} Schütte{createdSchuetten.length > 1 ? 'n' : ''} bereit zum Speichern
              </p>
              
              <div className={styles.palettesList}>
                {createdSchuetten.map((schutte, index) => (
                  <div key={index} className={styles.paletteCard}>
                    <div className={styles.paletteCardHeader}>
                      <div className={styles.paletteCardTitle}>
                        <Package size={20} weight="fill" style={{ color: departmentColor }} />
                        <div>
                          <span className={styles.paletteName}>{schutte.name}</span>
                          {schutte.subname && (
                            <span className={styles.paletteSubname}>{schutte.subname}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.paletteCardActions}>
                        <button
                          className={styles.editButton}
                          onClick={() => handleEditSchutte(index)}
                          title="Bearbeiten"
                        >
                          <ArrowLeft size={16} weight="bold" />
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleRemoveSchutte(index)}
                          title="Löschen"
                        >
                          <Trash size={16} weight="bold" />
                        </button>
                      </div>
                    </div>
                    
                    <div className={styles.paletteCardDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Größe:</span>
                        <span className={styles.detailValue}>{schutte.size}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Produkte:</span>
                        <div className={styles.contentsList}>
                          {schutte.products.map((p, i) => (
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
                  disabled={!isFormValid() && createdSchuetten.length === 0}
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
                disabled={createdSchuetten.length === 0}
                style={{ backgroundColor: departmentColor, borderColor: departmentColor }}
              >
                <Check size={18} weight="bold" />
                <span>Speichern ({createdSchuetten.length})</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
