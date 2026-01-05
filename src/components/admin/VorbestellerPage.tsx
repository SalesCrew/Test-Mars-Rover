import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CalendarPlus, X, CheckCircle, Package, Image as ImageIcon, ArrowLeft, ArrowRight, Plus, Trash, PencilSimple, Calendar, TrendUp, Clock, CheckCircle as CheckCircleFilled, Storefront } from '@phosphor-icons/react';
import styles from './VorbestellerPage.module.css';
import { CustomDatePicker } from './CustomDatePicker';
import { WelleDetailModal } from './WelleDetailModal';
import { WelleMarketSelectorModal } from './WelleMarketSelectorModal';
import { wellenService } from '../../services/wellenService';
import { getAllProducts, type Product } from '../../data/productsData';
import { API_BASE_URL } from '../../config/database';

// Helper function to upload image to Supabase Storage
const uploadImageToStorage = async (file: File, folder: string): Promise<string | null> => {
  try {
    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(`${API_BASE_URL}/wellen/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, folder })
    });

    if (!response.ok) {
      console.error('Image upload failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

interface VorbestellerPageProps {
  isCreateWelleModalOpen: boolean;
  onCloseCreateWelleModal: () => void;
  onOpenCreateWelleModal: () => void;
  waveIdToEdit?: string | null;
  onClearWaveIdToEdit?: () => void;
}

interface DisplayItem {
  id: string;
  name: string;
  targetNumber: string;
  picture: File | null;
  itemValue?: string; // Only used when wave goalType is 'value'
}

interface KartonwareItem {
  id: string;
  name: string;
  targetNumber: string;
  picture: File | null;
  itemValue?: string; // Only used when wave goalType is 'value'
}

interface KWDay {
  kw: string;
  days: string[];
}

interface WelleDisplayItem {
  id: string;
  name: string;
  targetNumber?: number;
  currentNumber?: number;
  picture?: string | null;
  itemValue?: number | null; // Only used when wave goalType is 'value'
}

interface WelleKartonwareItem {
  id: string;
  name: string;
  targetNumber?: number;
  currentNumber?: number;
  picture?: string | null;
  itemValue?: number | null; // Only used when wave goalType is 'value'
}

interface Welle {
  id: string;
  name: string;
  image: string | null;
  startDate: string;
  endDate: string;
  types: ('display' | 'kartonware')[];
  status: 'upcoming' | 'active' | 'past';
  displayCount: number;
  kartonwareCount: number;
  kwDays?: KWDay[];
  displays?: WelleDisplayItem[];
  kartonwareItems?: WelleKartonwareItem[];
  totalGLs?: number;
  participatingGLs?: number;
  goalType: 'percentage' | 'value'; // Wave-level goal type
  goalPercentage?: number | null; // For percentage goals (e.g., 80%)
  goalValue?: number | null; // For value goals (e.g., €7500)
  assignedMarketIds?: string[]; // IDs of assigned markets
}

export const VorbestellerPage: React.FC<VorbestellerPageProps> = ({ 
  isCreateWelleModalOpen, 
  onCloseCreateWelleModal,
  onOpenCreateWelleModal,
  waveIdToEdit,
  onClearWaveIdToEdit
}) => {
  // State for wellen list
  const [wellenList, setWellenList] = useState<Welle[]>([]);
  const [_isLoadingWellen, setIsLoadingWellen] = useState(true);
  void _isLoadingWellen; // Reserved for loading state display

  // Load wellen from database
  useEffect(() => {
    const loadWellen = async () => {
      try {
        setIsLoadingWellen(true);
        const fetchedWellen = await wellenService.getAllWellen();
        setWellenList(fetchedWellen);
      } catch (error) {
        console.error('Error loading wellen:', error);
      } finally {
        setIsLoadingWellen(false);
      }
    };
    loadWellen();
  }, []);

  // Handle waveIdToEdit from dashboard
  useEffect(() => {
    if (waveIdToEdit && wellenList.length > 0) {
      const waveToEdit = wellenList.find(w => w.id === waveIdToEdit);
      if (waveToEdit) {
        // Open edit mode for this wave
        setEditingWelle(waveToEdit);
        setWaveName(waveToEdit.name);
        setStartDate(waveToEdit.startDate);
        setEndDate(waveToEdit.endDate);
        setSelectedTypes(waveToEdit.types);
        setWaveImagePreview(waveToEdit.image);
        setGoalType(waveToEdit.goalType);
        setGoalPercentage(waveToEdit.goalPercentage?.toString() || '');
        setGoalValue(waveToEdit.goalValue?.toString() || '');
        setAssignedMarketIds(waveToEdit.assignedMarketIds || []);
        setDisplays(waveToEdit.displays?.map((d, idx) => ({
          id: `existing-${idx}`,
          name: d.name,
          targetNumber: d.targetNumber?.toString() || '',
          picture: null,
          itemValue: d.itemValue?.toString() || ''
        })) || []);
        setKartonwareItems(waveToEdit.kartonwareItems?.map((k, idx) => ({
          id: `existing-${idx}`,
          name: k.name,
          targetNumber: k.targetNumber?.toString() || '',
          picture: null,
          itemValue: k.itemValue?.toString() || ''
        })) || []);
        setKwDays(waveToEdit.kwDays || []);
        setCurrentStep(2); // Skip type selection when editing
        onOpenCreateWelleModal();
        // Clear the waveIdToEdit
        if (onClearWaveIdToEdit) {
          onClearWaveIdToEdit();
        }
      }
    }
  }, [waveIdToEdit, wellenList]);

  // Load product displays (displays from products table)
  useEffect(() => {
    const loadProductDisplays = async () => {
      try {
        const products = await getAllProducts();
        // Filter only displays (productType === 'display')
        const displays = products.filter(p => p.productType === 'display');
        setProductDisplays(displays);
      } catch (error) {
        console.error('Error loading product displays:', error);
      }
    };
    loadProductDisplays();
  }, []);

  const [selectedWelle, setSelectedWelle] = useState<Welle | null>(null);

  const [editingWelle, setEditingWelle] = useState<Welle | null>(null);
  const [isPastItemsModalOpen, setIsPastItemsModalOpen] = useState<boolean>(false);
  const [pastItemType, setPastItemType] = useState<'display' | 'kartonware' | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<('display' | 'kartonware')[]>([]);
  const [productDisplays, setProductDisplays] = useState<Product[]>([]);
  
  // Wave details
  const [waveName, setWaveName] = useState('');
  const [waveImagePreview, setWaveImagePreview] = useState<string | null>(null);
  const [waveImageFile, setWaveImageFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goalType, setGoalType] = useState<'percentage' | 'value'>('percentage');
  const [goalPercentage, setGoalPercentage] = useState('');
  const [goalValue, setGoalValue] = useState('');
  const [assignedMarketIds, setAssignedMarketIds] = useState<string[]>([]);
  const [isMarketSelectorOpen, setIsMarketSelectorOpen] = useState(false);
  
  // Display items
  const [displays, setDisplays] = useState<DisplayItem[]>([]);
  
  // Kartonware items
  const [kartonwareItems, setKartonwareItems] = useState<KartonwareItem[]>([]);
  
  // KW + Days
  const [kwDays, setKwDays] = useState<KWDay[]>([]);
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleType = (type: 'display' | 'kartonware') => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleNext = () => {
    if (currentStep === 1 && selectedTypes.length === 0) return;
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleWaveImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWaveImagePreview(URL.createObjectURL(file));
      setWaveImageFile(file);
    }
  };

  const addDisplay = () => {
    setDisplays(prev => [...prev, {
      id: `display-${Date.now()}`,
      name: '',
      targetNumber: '',
      picture: null,
      itemValue: goalType === 'value' ? '' : undefined
    }]);
  };

  const removeDisplay = (id: string) => {
    setDisplays(prev => prev.filter(d => d.id !== id));
  };

  const updateDisplay = (id: string, field: keyof DisplayItem, value: any) => {
    setDisplays(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const addKartonware = () => {
    setKartonwareItems(prev => [...prev, {
      id: `kartonware-${Date.now()}`,
      name: '',
      targetNumber: '',
      picture: null,
      itemValue: goalType === 'value' ? '' : undefined
    }]);
  };

  const removeKartonware = (id: string) => {
    setKartonwareItems(prev => prev.filter(k => k.id !== id));
  };

  const updateKartonware = (id: string, field: keyof KartonwareItem, value: any) => {
    setKartonwareItems(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k));
  };

  const addKWDay = () => {
    setKwDays(prev => [...prev, {
      kw: '',
      days: [],
    }]);
  };

  const removeKWDay = (index: number) => {
    setKwDays(prev => prev.filter((_, i) => i !== index));
  };

  const updateKWDay = (index: number, field: 'kw' | 'days', value: any) => {
    setKwDays(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const toggleDay = (kwIndex: number, day: string) => {
    setKwDays(prev => prev.map((item, i) => {
      if (i === kwIndex) {
        const days = item.days.includes(day) 
          ? item.days.filter(d => d !== day)
          : [...item.days, day];
        return { ...item, days };
      }
      return item;
    }));
  };

  const handleCreateWelle = async () => {
    if (isSaving) return; // Prevent double-click
    setIsSaving(true);
    
    try {
      // Upload wave image if a new file was selected
      let imageUrl: string | null = waveImagePreview;
      if (waveImageFile) {
        const uploadedUrl = await uploadImageToStorage(waveImageFile, 'wellen');
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      // Keep existing image URL if it's already a valid URL (not a blob)
      if (imageUrl && imageUrl.startsWith('blob:')) {
        imageUrl = null; // Don't save blob URLs
      }

      // Upload display images
      const processedDisplays = await Promise.all(displays.map(async (d) => {
        let pictureUrl: string | null = null;
        if (d.picture) {
          pictureUrl = await uploadImageToStorage(d.picture, 'displays');
        }
        return {
          name: d.name,
          targetNumber: parseInt(d.targetNumber) || 0,
          picture: pictureUrl,
          itemValue: goalType === 'value' && d.itemValue ? parseFloat(d.itemValue) : null
        };
      }));

      // Upload kartonware images
      const processedKartonware = await Promise.all(kartonwareItems.map(async (k) => {
        let pictureUrl: string | null = null;
        if (k.picture) {
          pictureUrl = await uploadImageToStorage(k.picture, 'kartonware');
        }
        return {
          name: k.name,
          targetNumber: parseInt(k.targetNumber) || 0,
          picture: pictureUrl,
          itemValue: goalType === 'value' && k.itemValue ? parseFloat(k.itemValue) : null
        };
      }));

      const welleData = {
        name: waveName,
        image: imageUrl,
        startDate,
        endDate,
        goalType,
        goalPercentage: goalType === 'percentage' ? parseFloat(goalPercentage) : null,
        goalValue: goalType === 'value' ? parseFloat(goalValue) : null,
        displays: processedDisplays,
        kartonwareItems: processedKartonware,
        kwDays: kwDays.map(kw => ({
          kw: kw.kw,
          days: kw.days
        })),
        assignedMarketIds
      };

      if (editingWelle) {
        // Update existing welle
        await wellenService.updateWelle(editingWelle.id, welleData);
      } else {
        // Create new welle
        await wellenService.createWelle(welleData);
      }

      // Reload wellen list
      const fetchedWellen = await wellenService.getAllWellen();
      setWellenList(fetchedWellen);
      
      handleClose();
    } catch (error) {
      console.error('Error saving welle:', error);
      alert('Fehler beim Speichern der Welle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditWelle = (welle: Welle) => {
    setEditingWelle(welle);
    setWaveName(welle.name);
    setStartDate(welle.startDate);
    setEndDate(welle.endDate);
    setSelectedTypes(welle.types);
    setWaveImagePreview(welle.image);
    setGoalType(welle.goalType);
    setGoalPercentage(welle.goalPercentage?.toString() || '');
    setGoalValue(welle.goalValue?.toString() || '');
    setAssignedMarketIds(welle.assignedMarketIds || []);
    setCurrentStep(2); // Skip type selection when editing
    
    // Load displays
    if (welle.displays) {
      setDisplays(welle.displays.map(d => ({
        id: d.id,
        name: d.name,
        targetNumber: (d.targetNumber || 0).toString(),
        picture: null,
        itemValue: d.itemValue?.toString()
      })));
    }
    
    // Load kartonware
    if (welle.kartonwareItems) {
      setKartonwareItems(welle.kartonwareItems.map(k => ({
        id: k.id,
        name: k.name,
        targetNumber: (k.targetNumber || 0).toString(),
        picture: null,
        itemValue: k.itemValue?.toString()
      })));
    }
    
    // Load KW days
    setKwDays(welle.kwDays || []);
    
    // Open the modal
    onOpenCreateWelleModal();
  };

  // Get all past displays/kartonware from past wellen
  const getAllPastDisplays = (): WelleDisplayItem[] => {
    const pastWellen = wellenList.filter(w => w.status === 'past' || w.status === 'active');
    return pastWellen.flatMap(w => w.displays || []);
  };

  const getAllPastKartonware = (): WelleKartonwareItem[] => {
    const pastWellen = wellenList.filter(w => w.status === 'past' || w.status === 'active');
    return pastWellen.flatMap(w => w.kartonwareItems || []);
  };

  const handleOpenPastItems = (type: 'display' | 'kartonware') => {
    setPastItemType(type);
    setIsPastItemsModalOpen(true);
  };

  const handleClosePastItems = () => {
    setIsPastItemsModalOpen(false);
    setPastItemType(null);
  };

  const handleSelectPastItem = (item: WelleDisplayItem | WelleKartonwareItem) => {
    if (pastItemType === 'display') {
      const newDisplay: DisplayItem = {
        id: Date.now().toString(),
        name: item.name,
        targetNumber: '',
        picture: null,
        itemValue: item.itemValue?.toString()
      };
      setDisplays(prev => [...prev, newDisplay]);
    } else if (pastItemType === 'kartonware') {
      const newKartonware: KartonwareItem = {
        id: Date.now().toString(),
        name: item.name,
        targetNumber: '',
        picture: null,
        itemValue: item.itemValue?.toString()
      };
      setKartonwareItems(prev => [...prev, newKartonware]);
    }
    handleClosePastItems();
  };

  // Handle selecting a product display (from products table)
  const handleSelectProductDisplay = (product: Product) => {
    const newDisplay: DisplayItem = {
      id: Date.now().toString(),
      name: product.name,
      targetNumber: '',
      picture: null,
      itemValue: product.price?.toString()
    };
    setDisplays(prev => [...prev, newDisplay]);
    handleClosePastItems();
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${startDate.toLocaleDateString('de-DE', options)} - ${endDate.toLocaleDateString('de-DE', options)}`;
  };

  const getStatusConfig = (status: Welle['status']) => {
    switch (status) {
      case 'active':
        return {
          label: 'Aktiv',
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          icon: <TrendUp size={16} weight="bold" />
        };
      case 'upcoming':
        return {
          label: 'Bevorstehend',
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: <Clock size={16} weight="bold" />
        };
      case 'past':
        return {
          label: 'Abgeschlossen',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          icon: <CheckCircleFilled size={16} weight="fill" />
        };
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedTypes([]);
    setWaveName('');
    setWaveImagePreview(null);
    setWaveImageFile(null);
    setStartDate('');
    setEndDate('');
    setGoalType('percentage');
    setGoalPercentage('');
    setGoalValue('');
    setAssignedMarketIds([]);
    setDisplays([]);
    setKartonwareItems([]);
    setKwDays([]);
    setEditingWelle(null);
    setSelectedWelle(null);
    onCloseCreateWelleModal();
  };

  const getTotalSteps = () => {
    let steps = 2; // Type selection + Wave details
    if (selectedTypes.includes('display')) steps++;
    if (selectedTypes.includes('kartonware')) steps++;
    steps++; // KW + Days
    return steps;
  };

  const getStepTitle = () => {
    const prefix = editingWelle ? 'Welle bearbeiten' : 'Neue Welle erstellen';
    if (currentStep === 1) return prefix;
    if (currentStep === 2) return editingWelle ? 'Welle bearbeiten - Details' : 'Welle Details';
    if (currentStep === 3 && selectedTypes[0] === 'display') return editingWelle ? 'Welle bearbeiten - Displays' : 'Displays hinzufügen';
    if (currentStep === 3 && selectedTypes[0] === 'kartonware') return editingWelle ? 'Welle bearbeiten - Kartonware' : 'Kartonware hinzufügen';
    if (currentStep === 4 && selectedTypes.length === 2) {
      return selectedTypes[0] === 'display' ? 
        (editingWelle ? 'Welle bearbeiten - Kartonware' : 'Kartonware hinzufügen') : 
        (editingWelle ? 'Welle bearbeiten - Displays' : 'Displays hinzufügen');
    }
    return editingWelle ? 'Welle bearbeiten - Verkaufstage' : 'Verkaufstage festlegen';
  };

  const activeWellen = wellenList.filter(w => w.status === 'active');
  const upcomingWellen = wellenList.filter(w => w.status === 'upcoming');
  const pastWellen = wellenList.filter(w => w.status === 'past');

  return (
    <div className={styles.vorbestellerPage}>
      {/* Active Wellen */}
      {activeWellen.length > 0 && (
        <div className={styles.wellenSection}>
          <h2 className={styles.sectionTitle}>Aktive Wellen</h2>
          <div className={styles.wellenGrid}>
            {activeWellen.map(welle => {
              const statusConfig = getStatusConfig(welle.status);
              return (
                <div 
                  key={welle.id} 
                  className={`${styles.welleCard} ${styles.welleCardActive}`}
                  onClick={() => setSelectedWelle(welle)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.welleHeader}>
                    <div className={styles.welleStatus} style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color 
                    }}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                    <button 
                      className={styles.welleEditButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditWelle(welle);
                      }}
                    >
                      <PencilSimple size={18} weight="bold" />
                    </button>
                  </div>

                  <div className={`${styles.welleImage} ${welle.image ? styles.hasImage : ''}`}>
                    {welle.image && <img src={welle.image} alt={welle.name} />}
                  </div>

                  <div className={styles.welleContent}>
                    <h3 className={styles.welleName}>{welle.name}</h3>
                    
                    <div className={styles.welleDateRange}>
                      <Calendar size={16} weight="regular" />
                      <span>{formatDateRange(welle.startDate, welle.endDate)}</span>
                    </div>

                    <div className={styles.welleTypes}>
                      {welle.types.includes('display') && (
                        <div className={styles.welleType}>
                          <CheckCircle size={16} weight="fill" />
                          <span>{welle.displayCount} Display{welle.displayCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {welle.types.includes('kartonware') && (
                        <div className={styles.welleType}>
                          <Package size={16} weight="fill" />
                          <span>{welle.kartonwareCount} Kartonware</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.welleKWDays}>
                      {(welle.kwDays || []).map((kw, idx) => (
                        <div key={idx} className={styles.kwDayItem}>
                          <span className={styles.kwLabel}>{kw.kw}:</span>
                          <span className={styles.kwDaysList}>{kw.days.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Wellen */}
      {upcomingWellen.length > 0 && (
        <div className={styles.wellenSection}>
          <h2 className={styles.sectionTitle}>Bevorstehende Wellen</h2>
          <div className={styles.wellenGrid}>
            {upcomingWellen.map(welle => {
              const statusConfig = getStatusConfig(welle.status);
              return (
                <div 
                  key={welle.id} 
                  className={`${styles.welleCard} ${styles.welleCardUpcoming}`}
                  onClick={() => setSelectedWelle(welle)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.welleHeader}>
                    <div className={styles.welleStatus} style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color 
                    }}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                    <button 
                      className={styles.welleEditButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditWelle(welle);
                      }}
                    >
                      <PencilSimple size={18} weight="bold" />
                    </button>
                  </div>

                  <div className={`${styles.welleImage} ${welle.image ? styles.hasImage : ''}`}>
                    {welle.image && <img src={welle.image} alt={welle.name} />}
                  </div>

                  <div className={styles.welleContent}>
                    <h3 className={styles.welleName}>{welle.name}</h3>
                    
                    <div className={styles.welleDateRange}>
                      <Calendar size={16} weight="regular" />
                      <span>{formatDateRange(welle.startDate, welle.endDate)}</span>
                    </div>

                    <div className={styles.welleTypes}>
                      {welle.types.includes('display') && (
                        <div className={styles.welleType}>
                          <CheckCircle size={16} weight="fill" />
                          <span>{welle.displayCount} Display{welle.displayCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {welle.types.includes('kartonware') && (
                        <div className={styles.welleType}>
                          <Package size={16} weight="fill" />
                          <span>{welle.kartonwareCount} Kartonware</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.welleKWDays}>
                      {(welle.kwDays || []).map((kw, idx) => (
                        <div key={idx} className={styles.kwDayItem}>
                          <span className={styles.kwLabel}>{kw.kw}:</span>
                          <span className={styles.kwDaysList}>{kw.days.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Wellen */}
      {pastWellen.length > 0 && (
        <div className={styles.wellenSection}>
          <h2 className={styles.sectionTitle}>Vergangene Wellen</h2>
          <div className={styles.wellenGrid}>
            {pastWellen.map(welle => {
              const statusConfig = getStatusConfig(welle.status);
              return (
                <div 
                  key={welle.id} 
                  className={`${styles.welleCard} ${styles.welleCardPast}`}
                  onClick={() => setSelectedWelle(welle)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.welleHeader}>
                    <div className={styles.welleStatus} style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color 
                    }}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                    <button 
                      className={styles.welleEditButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditWelle(welle);
                      }}
                    >
                      <PencilSimple size={18} weight="bold" />
                    </button>
                  </div>

                  <div className={`${styles.welleImage} ${welle.image ? styles.hasImage : ''}`}>
                    {welle.image && <img src={welle.image} alt={welle.name} />}
                  </div>

                  <div className={styles.welleContent}>
                    <h3 className={styles.welleName}>{welle.name}</h3>
                    
                    <div className={styles.welleDateRange}>
                      <Calendar size={16} weight="regular" />
                      <span>{formatDateRange(welle.startDate, welle.endDate)}</span>
                    </div>

                    <div className={styles.welleTypes}>
                      {welle.types.includes('display') && (
                        <div className={styles.welleType}>
                          <CheckCircle size={16} weight="fill" />
                          <span>{welle.displayCount} Display{welle.displayCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {welle.types.includes('kartonware') && (
                        <div className={styles.welleType}>
                          <Package size={16} weight="fill" />
                          <span>{welle.kartonwareCount} Kartonware</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.welleKWDays}>
                      {(welle.kwDays || []).map((kw, idx) => (
                        <div key={idx} className={styles.kwDayItem}>
                          <span className={styles.kwLabel}>{kw.kw}:</span>
                          <span className={styles.kwDaysList}>{kw.days.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Welle Detail Modal */}
      {selectedWelle && (
        <WelleDetailModal 
          welle={selectedWelle} 
          onClose={() => setSelectedWelle(null)}
          onDelete={async () => {
            try {
              const fetchedWellen = await wellenService.getAllWellen();
              setWellenList(fetchedWellen);
            } catch (error) {
              console.error('Error reloading wellen after delete:', error);
            }
          }}
        />
      )}

      {/* Create Welle Modal */}
      {isCreateWelleModalOpen && ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={handleClose}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{getStepTitle()}</h3>
              <button 
                className={styles.modalClose}
                onClick={handleClose}
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.modalContent}>
              {/* Step Progress Indicator - Hidden on first step */}
              {currentStep > 1 && (
                <div className={styles.progressIndicatorWrapper}>
                  <div className={styles.progressIndicator}>
                    {Array.from({ length: getTotalSteps() }).map((_, index) => (
                      <div 
                        key={index}
                        className={`${styles.progressDot} ${index + 1 <= currentStep ? styles.progressDotActive : ''}`}
                      />
                    ))}
                  </div>
                  {/* Add from Past Button */}
                  {((currentStep === 3 && selectedTypes[0] === 'display') || 
                    (currentStep === 4 && selectedTypes.includes('display') && selectedTypes[0] === 'kartonware')) && (
                    <button 
                      className={styles.addFromPastButton}
                      onClick={() => handleOpenPastItems('display')}
                      title="Aus vergangenen Wellen hinzufügen"
                    >
                      <Plus size={14} weight="bold" />
                    </button>
                  )}
                  {((currentStep === 3 && selectedTypes[0] === 'kartonware') || 
                    (currentStep === 4 && selectedTypes.includes('kartonware') && selectedTypes[0] === 'display')) && (
                    <button 
                      className={styles.addFromPastButton}
                      onClick={() => handleOpenPastItems('kartonware')}
                      title="Aus vergangenen Wellen hinzufügen"
                    >
                      <Plus size={14} weight="bold" />
                    </button>
                  )}
                </div>
              )}

              {/* Step 1: Type Selection */}
              {currentStep === 1 && (
                <div className={styles.stepContent}>
                  <p className={styles.modalDescription}>
                    Wähle die Vorbesteller-Typen für diese Welle aus:
                  </p>

                  <div className={styles.optionsGrid}>
                    <button
                      className={`${styles.optionCard} ${selectedTypes.includes('display') ? styles.optionCardActive : ''}`}
                      onClick={() => handleToggleType('display')}
                    >
                      <div className={styles.optionIcon}>
                        <CheckCircle 
                          size={48} 
                          weight={selectedTypes.includes('display') ? 'fill' : 'regular'} 
                        />
                      </div>
                      <h4 className={styles.optionTitle}>Display</h4>
                      <p className={styles.optionDescription}>
                        Display-Vorbesteller für diese Welle
                      </p>
                      {selectedTypes.includes('display') && (
                        <div className={styles.optionCheckmark}>
                          <CheckCircle size={20} weight="fill" />
                        </div>
                      )}
                    </button>

                    <button
                      className={`${styles.optionCard} ${selectedTypes.includes('kartonware') ? styles.optionCardActive : ''}`}
                      onClick={() => handleToggleType('kartonware')}
                    >
                      <div className={styles.optionIcon}>
                        <Package 
                          size={48} 
                          weight={selectedTypes.includes('kartonware') ? 'fill' : 'regular'} 
                        />
                      </div>
                      <h4 className={styles.optionTitle}>Kartonware</h4>
                      <p className={styles.optionDescription}>
                        Kartonware-Vorbesteller für diese Welle
                      </p>
                      {selectedTypes.includes('kartonware') && (
                        <div className={styles.optionCheckmark}>
                          <CheckCircle size={20} weight="fill" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Wave Details */}
              {currentStep === 2 && (
                <div className={styles.stepContent}>
                  <div className={styles.formSection}>
                    <label className={styles.label}>Wellen-Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="z.B. KW 48-49 oder Q4 2024"
                      value={waveName}
                      onChange={(e) => setWaveName(e.target.value)}
                    />
                  </div>

                  <div className={styles.formSection}>
                    <label className={styles.label}>Wellen-Bild (optional)</label>
                    <div className={styles.imageUploadArea}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleWaveImageUpload}
                        className={styles.imageInput}
                        id="waveImage"
                      />
                      <label htmlFor="waveImage" className={styles.imageLabel}>
                        {waveImagePreview ? (
                          <img src={waveImagePreview} alt="Wave preview" className={styles.imagePreview} />
                        ) : (
                          <>
                            <ImageIcon size={32} weight="regular" />
                            <span>Bild hochladen</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formSection}>
                      <label className={styles.label}>Start-Datum</label>
                      <CustomDatePicker
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Start-Datum auswählen"
                      />
                    </div>
                    <div className={styles.formSection}>
                      <label className={styles.label}>End-Datum</label>
                      <CustomDatePicker
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="End-Datum auswählen"
                      />
                    </div>
                  </div>

                  {/* Goal Type Selection */}
                  <div className={styles.formSection}>
                    <label className={styles.label}>Zieltyp für diese Welle</label>
                    <div className={styles.goalTypeToggle}>
                      <button
                        type="button"
                        className={`${styles.goalTypeButton} ${goalType === 'percentage' ? styles.goalTypeButtonActive : ''}`}
                        onClick={() => setGoalType('percentage')}
                      >
                        Prozent %
                      </button>
                      <button
                        type="button"
                        className={`${styles.goalTypeButton} ${goalType === 'value' ? styles.goalTypeButtonActive : ''}`}
                        onClick={() => setGoalType('value')}
                      >
                        Wert €
                      </button>
                    </div>
                  </div>

                  {/* Goal Input Based on Type */}
                  {goalType === 'percentage' ? (
                    <div className={styles.formSection}>
                      <label className={styles.label}>Ziel Prozentsatz (%)</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="z.B. 80"
                        value={goalPercentage}
                        onChange={(e) => setGoalPercentage(e.target.value)}
                        min="0"
                        max="100"
                      />
                      <small className={styles.fieldHint}>
                        Das Ziel ist, {goalPercentage || 0}% aller Displays/Kartonware zu verkaufen
                      </small>
                    </div>
                  ) : (
                    <div className={styles.formSection}>
                      <label className={styles.label}>Zielwert (€)</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="z.B. 25000"
                        value={goalValue}
                        onChange={(e) => setGoalValue(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      <small className={styles.fieldHint}>
                        Der Gesamtwert aller verkauften Displays/Kartonware soll {goalValue ? `€${parseFloat(goalValue).toLocaleString('de-DE')}` : '€0'} erreichen
                      </small>
                    </div>
                  )}

                  {/* Market Assignment */}
                  <div className={styles.formSection}>
                    <label className={styles.label}>Märkte zuweisen</label>
                    <button
                      type="button"
                      className={styles.marketAssignButton}
                      onClick={() => setIsMarketSelectorOpen(true)}
                    >
                      <Storefront size={18} weight="bold" />
                      <span>
                        {assignedMarketIds.length > 0 
                          ? `${assignedMarketIds.length} ${assignedMarketIds.length === 1 ? 'Markt' : 'Märkte'} ausgewählt`
                          : 'Märkte auswählen'}
                      </span>
                    </button>
                    {assignedMarketIds.length > 0 && (
                      <small className={styles.fieldHint}>
                        {assignedMarketIds.length} {assignedMarketIds.length === 1 ? 'Markt' : 'Märkte'} dieser Welle zugewiesen
                      </small>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3/4: Display Details */}
              {((currentStep === 3 && selectedTypes[0] === 'display') || 
                (currentStep === 4 && selectedTypes.includes('display') && selectedTypes[0] === 'kartonware')) && (
                <div className={styles.stepContent}>
                  <div className={styles.itemsList}>
                    {displays.map((display, index) => (
                      <div key={display.id} className={styles.itemCard}>
                        <div className={styles.itemHeader}>
                          <span className={styles.itemNumber}>Display {index + 1}</span>
                          {displays.length > 1 && (
                            <button
                              className={styles.removeItemButton}
                              onClick={() => removeDisplay(display.id)}
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          )}
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formSection}>
                            <label className={styles.label}>Display-Name</label>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="z.B. Standard Display"
                              value={display.name}
                              onChange={(e) => updateDisplay(display.id, 'name', e.target.value)}
                            />
                          </div>
                          <div className={styles.formSection}>
                            <label className={styles.label}>Anzahl Ziel</label>
                            <input
                              type="number"
                              className={styles.input}
                              placeholder="0"
                              value={display.targetNumber}
                              onChange={(e) => updateDisplay(display.id, 'targetNumber', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Item Value (only for value-based goals) */}
                        {goalType === 'value' && (
                          <div className={styles.formSection}>
                            <label className={styles.label}>Wert pro Display (€)</label>
                            <input
                              type="number"
                              className={styles.input}
                              placeholder="z.B. 300"
                              value={display.itemValue || ''}
                              onChange={(e) => updateDisplay(display.id, 'itemValue', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                            <small className={styles.fieldHint}>
                              Gesamtwert: {display.itemValue && display.targetNumber 
                                ? `€${(parseFloat(display.itemValue) * parseFloat(display.targetNumber)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : '€0.00'
                              }
                            </small>
                          </div>
                        )}

                        <div className={styles.formSection}>
                          <label className={styles.label}>Display-Bild (optional)</label>
                          <div className={styles.imageUploadArea}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) updateDisplay(display.id, 'picture', file);
                              }}
                              className={styles.imageInput}
                              id={`displayImage-${display.id}`}
                            />
                            <label htmlFor={`displayImage-${display.id}`} className={styles.imageLabel}>
                              {display.picture ? (
                                <img 
                                  src={URL.createObjectURL(display.picture)} 
                                  alt="Display preview" 
                                  className={styles.imagePreview} 
                                />
                              ) : (
                                <>
                                  <ImageIcon size={24} weight="regular" />
                                  <span>Bild hochladen</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className={styles.addItemButton} onClick={addDisplay}>
                    <Plus size={18} weight="bold" />
                    <span>Weiteres Display hinzufügen</span>
                  </button>

                  {displays.length === 0 && (
                    <div className={styles.emptyState}>
                      <CheckCircle size={48} weight="regular" />
                      <p>Füge mindestens ein Display hinzu</p>
                      <button className={styles.addFirstButton} onClick={addDisplay}>
                        <Plus size={18} weight="bold" />
                        <span>Erstes Display hinzufügen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3/4: Kartonware Details */}
              {((currentStep === 3 && selectedTypes[0] === 'kartonware') || 
                (currentStep === 4 && selectedTypes.includes('kartonware') && selectedTypes[0] === 'display')) && (
                <div className={styles.stepContent}>
                  <div className={styles.itemsList}>
                    {kartonwareItems.map((item, index) => (
                      <div key={item.id} className={styles.itemCard}>
                        <div className={styles.itemHeader}>
                          <span className={styles.itemNumber}>Kartonware {index + 1}</span>
                          {kartonwareItems.length > 1 && (
                            <button
                              className={styles.removeItemButton}
                              onClick={() => removeKartonware(item.id)}
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          )}
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formSection}>
                            <label className={styles.label}>Kartonware-Name</label>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="z.B. Standard Karton"
                              value={item.name}
                              onChange={(e) => updateKartonware(item.id, 'name', e.target.value)}
                            />
                          </div>
                          <div className={styles.formSection}>
                            <label className={styles.label}>Anzahl Ziel</label>
                            <input
                              type="number"
                              className={styles.input}
                              placeholder="0"
                              value={item.targetNumber}
                              onChange={(e) => updateKartonware(item.id, 'targetNumber', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Item Value (only for value-based goals) */}
                        {goalType === 'value' && (
                          <div className={styles.formSection}>
                            <label className={styles.label}>Wert pro Kartonware (€)</label>
                            <input
                              type="number"
                              className={styles.input}
                              placeholder="z.B. 300"
                              value={item.itemValue || ''}
                              onChange={(e) => updateKartonware(item.id, 'itemValue', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                            <small className={styles.fieldHint}>
                              Gesamtwert: {item.itemValue && item.targetNumber 
                                ? `€${(parseFloat(item.itemValue) * parseFloat(item.targetNumber)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : '€0.00'
                              }
                            </small>
                          </div>
                        )}

                        <div className={styles.formSection}>
                          <label className={styles.label}>Kartonware-Bild (optional)</label>
                          <div className={styles.imageUploadArea}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) updateKartonware(item.id, 'picture', file);
                              }}
                              className={styles.imageInput}
                              id={`kartonwareImage-${item.id}`}
                            />
                            <label htmlFor={`kartonwareImage-${item.id}`} className={styles.imageLabel}>
                              {item.picture ? (
                                <img 
                                  src={URL.createObjectURL(item.picture)} 
                                  alt="Kartonware preview" 
                                  className={styles.imagePreview} 
                                />
                              ) : (
                                <>
                                  <ImageIcon size={24} weight="regular" />
                                  <span>Bild hochladen</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className={styles.addItemButton} onClick={addKartonware}>
                    <Plus size={18} weight="bold" />
                    <span>Weitere Kartonware hinzufügen</span>
                  </button>

                  {kartonwareItems.length === 0 && (
                    <div className={styles.emptyState}>
                      <Package size={48} weight="regular" />
                      <p>Füge mindestens eine Kartonware hinzu</p>
                      <button className={styles.addFirstButton} onClick={addKartonware}>
                        <Plus size={18} weight="bold" />
                        <span>Erste Kartonware hinzufügen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Final Step: KW + Days */}
              {currentStep === getTotalSteps() && (
                <div className={styles.stepContent}>
                  <p className={styles.modalDescription}>
                    Lege fest, an welchen Tagen die GLs verkaufen können:
                  </p>

                  <div className={styles.kwDaysList}>
                    {kwDays.map((kwDay, index) => (
                      <div key={index} className={styles.kwDayCard}>
                        <div className={styles.itemHeader}>
                          <span className={styles.itemNumber}>Kalenderwoche {index + 1}</span>
                          {kwDays.length > 1 && (
                            <button
                              className={styles.removeItemButton}
                              onClick={() => removeKWDay(index)}
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          )}
                        </div>

                        <div className={styles.formSection}>
                          <label className={styles.label}>Kalenderwoche</label>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="z.B. KW23"
                            value={kwDay.kw}
                            onChange={(e) => updateKWDay(index, 'kw', e.target.value)}
                          />
                        </div>

                        <div className={styles.formSection}>
                          <label className={styles.label}>Verkaufstage</label>
                          <div className={styles.daysGrid}>
                            {['MO', 'DI', 'MI', 'DO', 'FR'].map(day => (
                              <button
                                key={day}
                                className={`${styles.dayButton} ${kwDay.days.includes(day) ? styles.dayButtonActive : ''}`}
                                onClick={() => toggleDay(index, day)}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className={styles.addItemButton} onClick={addKWDay}>
                    <Plus size={18} weight="bold" />
                    <span>Weitere Kalenderwoche hinzufügen</span>
                  </button>

                  {kwDays.length === 0 && (
                    <div className={styles.emptyState}>
                      <CalendarPlus size={48} weight="regular" />
                      <p>Füge mindestens eine Kalenderwoche hinzu</p>
                      <button className={styles.addFirstButton} onClick={addKWDay}>
                        <Plus size={18} weight="bold" />
                        <span>Erste Kalenderwoche hinzufügen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {currentStep > 1 && (
                <button 
                  className={styles.backButton}
                  onClick={handleBack}
                >
                  <ArrowLeft size={18} weight="bold" />
                  <span>Zurück</span>
                </button>
              )}
              
              <div className={styles.footerSpacer} />

              <button 
                className={styles.cancelButton}
                onClick={handleClose}
              >
                Abbrechen
              </button>

              {currentStep < getTotalSteps() ? (
                <button 
                  className={`${styles.nextButton} ${
                    (currentStep === 1 && selectedTypes.length === 0) ||
                    (currentStep === 2 && (!waveName || !startDate || !endDate || 
                      (goalType === 'percentage' && !goalPercentage) || 
                      (goalType === 'value' && !goalValue))) ||
                    (currentStep === 3 && selectedTypes[0] === 'display' && displays.length === 0) ||
                    (currentStep === 3 && selectedTypes[0] === 'kartonware' && kartonwareItems.length === 0) ||
                    (currentStep === 4 && selectedTypes[0] === 'display' && kartonwareItems.length === 0) ||
                    (currentStep === 4 && selectedTypes[0] === 'kartonware' && displays.length === 0)
                    ? styles.nextButtonDisabled : ''
                  }`}
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && selectedTypes.length === 0) ||
                    (currentStep === 2 && (!waveName || !startDate || !endDate || 
                      (goalType === 'percentage' && !goalPercentage) || 
                      (goalType === 'value' && !goalValue))) ||
                    (currentStep === 3 && selectedTypes[0] === 'display' && displays.length === 0) ||
                    (currentStep === 3 && selectedTypes[0] === 'kartonware' && kartonwareItems.length === 0) ||
                    (currentStep === 4 && selectedTypes[0] === 'display' && kartonwareItems.length === 0) ||
                    (currentStep === 4 && selectedTypes[0] === 'kartonware' && displays.length === 0)
                  }
                >
                  <span>Weiter</span>
                  <ArrowRight size={18} weight="bold" />
                </button>
              ) : (
                <button 
                  className={`${styles.createButton} ${kwDays.length === 0 || isSaving ? styles.createButtonDisabled : ''}`}
                  onClick={handleCreateWelle}
                  disabled={kwDays.length === 0 || isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className={styles.spinner}></span>
                      <span>Speichern...</span>
                    </>
                  ) : (
                    <>
                      <CalendarPlus size={18} weight="bold" />
                      <span>{editingWelle ? 'Welle aktualisieren' : 'Welle erstellen'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Past Items Selection Modal */}
      {isPastItemsModalOpen && ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={handleClosePastItems}>
          <div className={styles.pastItemsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {pastItemType === 'display' ? 'Display hinzufügen' : 'Kartonware aus vergangenen Wellen'}
              </h3>
              <button 
                className={styles.modalClose}
                onClick={handleClosePastItems}
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.pastItemsContent}>
              {/* Product Displays Section (only for display type) */}
              {pastItemType === 'display' && productDisplays.length > 0 && (
                <div className={styles.pastItemsSection}>
                  <h4 className={styles.pastItemsSectionTitle}>Aus Produktliste</h4>
                  <div className={styles.pastItemsGrid}>
                    {productDisplays.map((product) => (
                      <button
                        key={product.id}
                        className={styles.pastItemCard}
                        onClick={() => handleSelectProductDisplay(product)}
                      >
                        <div className={styles.pastItemImage}>
                          <div className={styles.pastItemImagePlaceholder}>
                            <Package size={32} weight="regular" />
                          </div>
                        </div>
                        <div className={styles.pastItemName}>{product.name}</div>
                        <div className={styles.pastItemPrice}>€{product.price?.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Wellen Items Section */}
              {pastItemType === 'display' && getAllPastDisplays().length > 0 && (
                <div className={styles.pastItemsSection}>
                  <h4 className={styles.pastItemsSectionTitle}>Aus vergangenen Wellen</h4>
                  <div className={styles.pastItemsGrid}>
                    {getAllPastDisplays().map((item) => (
                      <button
                        key={item.id}
                        className={styles.pastItemCard}
                        onClick={() => handleSelectPastItem(item)}
                      >
                        <div className={styles.pastItemImage}>
                          {item.picture ? (
                            <img src={item.picture} alt={item.name} />
                          ) : (
                            <div className={styles.pastItemImagePlaceholder}>
                              <CheckCircle size={32} weight="regular" />
                            </div>
                          )}
                        </div>
                        <div className={styles.pastItemName}>{item.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kartonware from past wellen */}
              {pastItemType === 'kartonware' && (
                <div className={styles.pastItemsGrid}>
                  {getAllPastKartonware().map((item) => (
                    <button
                      key={item.id}
                      className={styles.pastItemCard}
                      onClick={() => handleSelectPastItem(item)}
                    >
                      <div className={styles.pastItemImage}>
                        {item.picture ? (
                          <img src={item.picture} alt={item.name} />
                        ) : (
                          <div className={styles.pastItemImagePlaceholder}>
                            <Package size={32} weight="regular" />
                          </div>
                        )}
                      </div>
                      <div className={styles.pastItemName}>{item.name}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {pastItemType === 'display' && getAllPastDisplays().length === 0 && productDisplays.length === 0 && (
                <div className={styles.emptyPastItems}>
                  <p>Keine Displays gefunden</p>
                </div>
              )}
              {pastItemType === 'kartonware' && getAllPastKartonware().length === 0 && (
                <div className={styles.emptyPastItems}>
                  <p>Keine vergangenen Kartonware gefunden</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Market Selector Modal */}
      {isMarketSelectorOpen && (
        <WelleMarketSelectorModal
          isOpen={isMarketSelectorOpen}
          onClose={() => setIsMarketSelectorOpen(false)}
          selectedMarketIds={assignedMarketIds}
          onConfirm={(marketIds) => {
            setAssignedMarketIds(marketIds);
            setIsMarketSelectorOpen(false);
          }}
        />
      )}
    </div>
  );
};

