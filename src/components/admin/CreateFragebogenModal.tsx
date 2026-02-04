import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, ArrowLeft, Check, Plus, Trash, DotsSixVertical, Calendar, Infinity, Stack, Storefront, MagnifyingGlass, CaretLeft, CaretRight, WarningCircle, ArrowsClockwise, XCircle, Timer } from '@phosphor-icons/react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Module } from './FragebogenPage';
import { marketService } from '../../services/marketService';
import type { AdminMarket } from '../../types/market-types';
import styles from './CreateFragebogenModal.module.css';

type Step = 'name' | 'modules' | 'settings' | 'conflicts';
type FilterType = 'chain' | 'plz' | 'adresse' | 'gebietsleiter' | 'subgroup' | 'status';

interface CreateFragebogenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fragebogen: any) => void;
  availableModules: Module[];
  existingFragebogen?: any[]; // List of existing fragebogen with marketIds
  editingFragebogen?: any; // Optional: If provided, we're editing
}

interface MarketConflict {
  marketId: string;
  market: AdminMarket;
  existingFragebogen: {
    id: string;
    name: string;
    isTimeLimited: boolean;
    startDate?: string;
    endDate?: string;
  };
  resolution: 'override' | 'remove' | null;
}

interface SortableModuleCardProps {
  module: Module;
  onRemove: () => void;
}

const SortableModuleCard: React.FC<SortableModuleCardProps> = ({ module, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.sortableModuleCard}>
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <DotsSixVertical size={20} weight="bold" />
      </div>
      <div className={styles.moduleCardContent}>
        <div className={styles.moduleCardHeader}>
          <Stack size={18} weight="fill" />
          <span className={styles.moduleCardName}>{module.name}</span>
        </div>
        {module.description && (
          <p className={styles.moduleCardDescription}>{module.description}</p>
        )}
        <div className={styles.moduleCardFooter}>
          <span className={styles.moduleCardQuestions}>{module.questionCount} {module.questionCount === 1 ? 'Frage' : 'Fragen'}</span>
        </div>
      </div>
      <button
        className={styles.removeModuleButton}
        onClick={onRemove}
        title="Modul entfernen"
      >
        <Trash size={18} weight="bold" />
      </button>
    </div>
  );
};

export const CreateFragebogenModal: React.FC<CreateFragebogenModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  availableModules,
  existingFragebogen = [],
  editingFragebogen
}) => {
  const [step, setStep] = useState<Step>('name');
  const [fragebogenName, setFragebogenName] = useState('');
  const [fragebogenDescription, setFragebogenDescription] = useState('');
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);
  const [moduleSearchTerm, setModuleSearchTerm] = useState('');
  const [isAlwaysActive, setIsAlwaysActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [isMarketSelectorOpen, _setIsMarketSelectorOpen] = useState(true);
  void _setIsMarketSelectorOpen; // Reserved for future use
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [marketSearchTerm, setMarketSearchTerm] = useState('');
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null);
  const [conflicts, setConflicts] = useState<MarketConflict[]>([]);
  const [searchTerms, setSearchTerms] = useState<Record<FilterType, string>>({
    chain: '',
    plz: '',
    adresse: '',
    gebietsleiter: '',
    subgroup: '',
    status: ''
  });
  
  // Real markets from database
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  
  // Fetch markets from database when modal opens
  useEffect(() => {
    const loadMarkets = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoadingMarkets(true);
        const fetchedMarkets = await marketService.getAllMarkets();
        setMarkets(fetchedMarkets);
      } catch (error) {
        console.error('Failed to load markets:', error);
      } finally {
        setIsLoadingMarkets(false);
      }
    };
    
    loadMarkets();
  }, [isOpen]);

  // Initialize with editing data if provided
  React.useEffect(() => {
    if (editingFragebogen) {
      setFragebogenName(editingFragebogen.name);
      setFragebogenDescription(editingFragebogen.description || '');
      
      // Set modules
      const modules = availableModules.filter(m => editingFragebogen.moduleIds.includes(m.id));
      setSelectedModules(modules);
      
      // Set time settings
      const isTimeLimited = editingFragebogen.startDate !== '2000-01-01';
      setIsAlwaysActive(!isTimeLimited);
      if (isTimeLimited) {
        setStartDate(editingFragebogen.startDate);
        setEndDate(editingFragebogen.endDate);
      }
      
      // Set markets
      setSelectedMarkets(editingFragebogen.marketIds || []);
      
      setStep('modules'); // Start at modules step when editing
    }
  }, [editingFragebogen, availableModules]);
  const [selectedFilters, setSelectedFilters] = useState<{
    chain: string[];
    plz: string[];
    adresse: string[];
    gebietsleiter: string[];
    subgroup: string[];
    status: string[];
  }>({
    chain: [],
    plz: [],
    adresse: [],
    gebietsleiter: [],
    subgroup: [],
    status: []
  });

  // Refs for click outside handlers
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  const filterDropdownRefs = useRef<{ [key in FilterType]?: HTMLDivElement }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle calendar clicks
      if (showStartCalendar && startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) {
        const targetElement = event.target as HTMLElement;
        // Don't close if clicking the button that opens the calendar
        if (!targetElement.closest(`.${styles.dateInputButton}`)) {
          setShowStartCalendar(false);
        }
      }
      
      if (showEndCalendar && endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) {
        const targetElement = event.target as HTMLElement;
        if (!targetElement.closest(`.${styles.dateInputButton}`)) {
          setShowEndCalendar(false);
        }
      }

      // Handle filter dropdown clicks
      if (openFilter) {
        const filterRef = filterDropdownRefs.current[openFilter];
        if (filterRef && !filterRef.contains(event.target as Node)) {
          const targetElement = event.target as HTMLElement;
          // Don't close if clicking the button that opens the dropdown
          if (!targetElement.closest(`.${styles.filterButton}`)) {
            setOpenFilter(null);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStartCalendar, showEndCalendar, openFilter]);

  const resetForm = () => {
    setStep('name');
    setFragebogenName('');
    setFragebogenDescription('');
    setSelectedModules([]);
    setModuleSearchTerm('');
    setIsAlwaysActive(true);
    setStartDate('');
    setEndDate('');
    setShowStartCalendar(false);
    setShowEndCalendar(false);
    setSelectedMarkets([]);
    setMarketSearchTerm('');
    setOpenFilter(null);
    setSearchTerms({
      chain: '',
      plz: '',
      adresse: '',
      gebietsleiter: '',
      subgroup: '',
      status: ''
    });
    setSelectedFilters({
      chain: [],
      plz: [],
      adresse: [],
      gebietsleiter: [],
      subgroup: [],
      status: []
    });
  };

  const handleClose = () => {
    if (fragebogenName || selectedModules.length > 0) {
      if (!confirm('Möchten Sie wirklich abbrechen? Alle nicht gespeicherten Änderungen gehen verloren.')) {
        return;
      }
    }
    resetForm();
    onClose();
  };

  const handleAddModule = (module: Module) => {
    if (!selectedModules.find(m => m.id === module.id)) {
      setSelectedModules([...selectedModules, module]);
    }
  };

  const handleRemoveModule = (moduleId: string) => {
    setSelectedModules(selectedModules.filter(m => m.id !== moduleId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedModules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const oldIndexOver = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, oldIndexOver);
      });
    }
  };

  // Detect conflicts with existing fragebogen
  const detectConflicts = () => {
    const conflictingMarkets: MarketConflict[] = [];
    
    selectedMarkets.forEach(marketId => {
      const market = markets.find(m => m.id === marketId);
      if (!market) return;
      
      // Find if this market is already assigned to another fragebogen (exclude current if editing)
      const existingAssignment = existingFragebogen.find(fb => 
        fb.marketIds && 
        fb.marketIds.includes(marketId) &&
        (!editingFragebogen || fb.id !== editingFragebogen.id) // Exclude the fragebogen we're editing
      );
      
      if (existingAssignment) {
        conflictingMarkets.push({
          marketId,
          market,
          existingFragebogen: {
            id: existingAssignment.id,
            name: existingAssignment.name,
            isTimeLimited: existingAssignment.startDate !== '2000-01-01',
            startDate: existingAssignment.startDate,
            endDate: existingAssignment.endDate
          },
          resolution: null
        });
      }
    });
    
    return conflictingMarkets;
  };

  const handleProceedToConflicts = () => {
    const detectedConflicts = detectConflicts();
    if (detectedConflicts.length > 0) {
      setConflicts(detectedConflicts);
      setStep('conflicts');
    } else {
      handleSave();
    }
  };

  const handleConflictResolution = (marketId: string, resolution: 'override' | 'remove') => {
    setConflicts(prev => 
      prev.map(c => c.marketId === marketId ? { ...c, resolution } : c)
    );
  };

  const handleConfirmConflicts = () => {
    // Remove markets where user chose 'remove'
    const marketsToKeep = conflicts
      .filter(c => c.resolution === 'override')
      .map(c => c.marketId);
    
    const nonConflictingMarkets = selectedMarkets.filter(id => 
      !conflicts.find(c => c.marketId === id)
    );
    
    setSelectedMarkets([...nonConflictingMarkets, ...marketsToKeep]);
    handleSave();
  };

  const handleSave = () => {
    if (!fragebogenName.trim()) {
      alert('Bitte geben Sie einen Fragebogen-Namen ein');
      return;
    }

    if (selectedModules.length === 0) {
      alert('Bitte wählen Sie mindestens ein Modul aus');
      return;
    }

    if (!isAlwaysActive && (!startDate || !endDate)) {
      alert('Bitte geben Sie Start- und Enddatum ein');
      return;
    }

    if (editingFragebogen) {
      // Update existing fragebogen
      const updatedFragebogen = {
        ...editingFragebogen,
        name: fragebogenName,
        description: fragebogenDescription || undefined,
        startDate: isAlwaysActive ? '2000-01-01' : startDate,
        endDate: isAlwaysActive ? '2099-12-31' : endDate,
        status: isAlwaysActive || (startDate && new Date(startDate) <= new Date() && new Date(endDate) >= new Date()) ? 'active' : 'scheduled',
        moduleIds: selectedModules.map(m => m.id),
        marketIds: selectedMarkets
      };
      onSave(updatedFragebogen);
    } else {
      // Create new fragebogen
      const newFragebogen = {
        id: `f-${Date.now()}`,
        name: fragebogenName,
        description: fragebogenDescription || undefined,
        startDate: isAlwaysActive ? '2000-01-01' : startDate,
        endDate: isAlwaysActive ? '2099-12-31' : endDate,
        status: isAlwaysActive || (startDate && new Date(startDate) <= new Date() && new Date(endDate) >= new Date()) ? 'active' : 'scheduled',
        moduleIds: selectedModules.map(m => m.id),
        marketIds: selectedMarkets,
        assignedGLCount: 0,
        responseCount: 0,
        createdAt: new Date().toISOString(),
      };
      onSave(newFragebogen);
    }
    resetForm();
    onClose();
  };

  // Markets filtering - matching MarketsPage logic
  const uniqueChains = useMemo(() => {
    return [...new Set(markets.map(m => m.chain))].sort();
  }, [markets]);

  const uniquePLZs = useMemo(() => {
    return [...new Set(markets.map(m => m.postalCode))].sort();
  }, [markets]);

  const uniqueAddresses = useMemo(() => {
    return [...new Set(markets.map(m => `${m.address}, ${m.postalCode} ${m.city}`))].sort();
  }, [markets]);

  const uniqueGLs = useMemo(() => {
    return [...new Set([...markets.map(m => m.gebietsleiterName).filter(Boolean)])].sort() as string[];
  }, [markets]);

  const uniqueSubgroups = useMemo(() => {
    return [...new Set(markets.map(m => m.subgroup).filter(Boolean))].sort() as string[];
  }, [markets]);

  const statusOptions = ['Aktiv', 'Inaktiv'];

  const getFilteredOptions = (type: FilterType, options: string[]) => {
    const search = searchTerms[type].toLowerCase();
    
    if (type === 'adresse' && search.trim()) {
      const searchWords = search.trim().split(/\s+/);
      return options.filter(option => {
        const optionLower = option.toLowerCase();
        return searchWords.every(word => optionLower.includes(word));
      });
    }
    
    return options.filter(option => option.toLowerCase().includes(search));
  };

  const filteredMarkets = useMemo(() => {
    let filtered = markets;

    // Search filter
    if (marketSearchTerm.trim()) {
      const query = marketSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.address.toLowerCase().includes(query) ||
        m.city.toLowerCase().includes(query) ||
        m.postalCode.includes(query) ||
        m.internalId.toLowerCase().includes(query) ||
        m.chain.toLowerCase().includes(query)
      );
    }

    // Chain filter
    if (selectedFilters.chain.length > 0) {
      filtered = filtered.filter(m => selectedFilters.chain.includes(m.chain));
    }

    // PLZ filter
    if (selectedFilters.plz.length > 0) {
      filtered = filtered.filter(m => selectedFilters.plz.includes(m.postalCode));
    }

    // Address filter
    if (selectedFilters.adresse.length > 0) {
      filtered = filtered.filter(m => {
        const marketAddress = `${m.address}, ${m.postalCode} ${m.city}`;
        return selectedFilters.adresse.includes(marketAddress);
      });
    }

    // Gebietsleiter filter
    if (selectedFilters.gebietsleiter.length > 0) {
      filtered = filtered.filter(m => m.gebietsleiter && selectedFilters.gebietsleiter.includes(m.gebietsleiter));
    }

    // Subgroup filter
    if (selectedFilters.subgroup.length > 0) {
      filtered = filtered.filter(m => m.subgroup && selectedFilters.subgroup.includes(m.subgroup));
    }

    // Status filter
    if (selectedFilters.status.length > 0) {
      filtered = filtered.filter(m => {
        const marketStatus = m.isActive ? 'Aktiv' : 'Inaktiv';
        return selectedFilters.status.includes(marketStatus);
      });
    }

    return filtered;
  }, [markets, selectedFilters, marketSearchTerm]);

  const handleToggleMarket = (marketId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedMarkets(prev =>
      prev.includes(marketId)
        ? prev.filter(id => id !== marketId)
        : [...prev, marketId]
    );
  };

  const handleToggleFilter = (filterType: FilterType, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[filterType];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [filterType]: newValues };
    });
  };

  const handleSelectAllFilters = (filterType: FilterType, allOptions: string[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterType]: allOptions }));
  };

  const handleClearFilters = (filterType: FilterType) => {
    setSelectedFilters(prev => ({ ...prev, [filterType]: [] }));
  };

  // Get chain color (matching MarketListItem colors) - reserved for future use
  const _getChainColor = (chain: string): string => {
    void _getChainColor; // Suppress unused warning
    switch (chain) {
      // BILLA Family - Yellow variants
      case 'Billa+':
      case 'BILLA+':
      case 'BILLA Plus':
        return '#FED304'; // Bright Yellow
      case 'BILLA+ Privat':
      case 'BILLA Plus Privat':
        return '#FBBF24'; // Golden Yellow
      case 'BILLA Privat':
        return '#F59E0B'; // Amber
      
      // SPAR Family - Red/Green variants
      case 'Spar':
        return '#EF4444'; // Red
      case 'Eurospar':
        return '#DC2626'; // Darker Red
      case 'Interspar':
        return '#B91C1C'; // Dark Red
      case 'Spar Gourmet':
        return '#059669'; // Emerald Green
      
      // Other Chains
      case 'Hofer':
        return '#3B82F6'; // Blue
      case 'Merkur':
        return '#10B981'; // Green
      case 'Adeg':
        return '#8B5CF6'; // Purple
      case 'Futterhaus':
        return '#F97316'; // Orange
      case 'Hagebau':
        return '#0EA5E9'; // Sky Blue
      case 'Zoofachhandel':
        return '#EC4899'; // Pink
      default:
        return '#6B7280'; // Gray for unknown
    }
  };

  const getChainGradient = (chain: string): string => {
    switch (chain) {
      // BILLA Family
      case 'Billa+':
      case 'BILLA+':
      case 'BILLA Plus':
        return 'linear-gradient(135deg, #FED304 0%, #EAB308 100%)';
      case 'BILLA+ Privat':
      case 'BILLA Plus Privat':
        return 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)';
      case 'BILLA Privat':
        return 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
      
      // SPAR Family
      case 'Spar':
        return 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
      case 'Eurospar':
        return 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)';
      case 'Interspar':
        return 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)';
      case 'Spar Gourmet':
        return 'linear-gradient(135deg, #059669 0%, #047857 100%)';
      
      // Other Chains
      case 'Hofer':
        return 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)';
      case 'Merkur':
        return 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
      case 'Adeg':
        return 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)';
      case 'Futterhaus':
        return 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)';
      case 'Hagebau':
        return 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)';
      case 'Zoofachhandel':
        return 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)';
      default:
        return 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)';
    }
  };

  // Module filtering
  const filteredAvailableModules = useMemo(() => {
    const available = availableModules.filter(m => !selectedModules.find(sm => sm.id === m.id));
    
    if (!moduleSearchTerm.trim()) {
      return available;
    }

    const query = moduleSearchTerm.toLowerCase().trim();
    return available.filter(module => {
      // Search in module name
      if (module.name.toLowerCase().includes(query)) {
        return true;
      }
      // Search in module description
      if (module.description?.toLowerCase().includes(query)) {
        return true;
      }
      // Search in question texts
      if (module.questions.some(q => q.questionText.toLowerCase().includes(query))) {
        return true;
      }
      return false;
    });
  }, [availableModules, selectedModules, moduleSearchTerm]);

  if (!isOpen) return null;

  // Calendar helper functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (dateString: string) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const CalendarPicker = ({ value, onChange, onClose }: { value: string; onChange: (date: string) => void; onClose: () => void }) => {
    const currentDate = value ? parseDate(value) : new Date();
    const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
    const [viewYear, setViewYear] = useState(currentDate.getFullYear());

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    const handlePrevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    };

    const handleNextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    };

    const handleSelectDay = (day: number) => {
      const selectedDate = new Date(viewYear, viewMonth, day);
      onChange(formatDateForInput(selectedDate));
      onClose();
    };

    const isSelectedDate = (day: number) => {
      if (!value) return false;
      const selected = parseDate(value);
      return selected.getDate() === day && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear;
    };

    const days = [];
    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.calendarDayEmpty}></div>);
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <div
          key={day}
          className={`${styles.calendarDay} ${isSelectedDate(day) ? styles.calendarDaySelected : ''}`}
          onClick={() => handleSelectDay(day)}
        >
          {day}
        </div>
      );
    }

    return (
      <div className={styles.calendarPicker}>
        <div className={styles.calendarHeader}>
          <button className={styles.calendarNavButton} onClick={handlePrevMonth}>
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className={styles.calendarMonthYear}>
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button className={styles.calendarNavButton} onClick={handleNextMonth}>
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
        <div className={styles.calendarGrid}>
          {dayNames.map(day => (
            <div key={day} className={styles.calendarDayName}>{day}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={`${styles.modal} ${step === 'name' ? styles.modalNameStep : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {step === 'name' ? 'Neuen Fragebogen erstellen' : step === 'modules' ? fragebogenName : 'Einstellungen'}
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {step === 'name' ? (
            <div className={styles.nameStep}>
              <div className={styles.formGroup}>
                <label htmlFor="fragebogenName" className={styles.label}>
                  Name des Fragebogens *
                </label>
                <input
                  type="text"
                  id="fragebogenName"
                  className={styles.input}
                  value={fragebogenName}
                  onChange={(e) => setFragebogenName(e.target.value)}
                  placeholder="z.B. KW 50 Weihnachts-Feedback"
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="fragebogenDescription" className={styles.label}>
                  Beschreibung (Optional)
                </label>
                <textarea
                  id="fragebogenDescription"
                  className={styles.textarea}
                  value={fragebogenDescription}
                  onChange={(e) => setFragebogenDescription(e.target.value)}
                  placeholder="Kurze Beschreibung des Fragebogens..."
                  rows={3}
                />
              </div>

              <button
                className={styles.primaryButton}
                onClick={() => fragebogenName.trim() && setStep('modules')}
                disabled={!fragebogenName.trim()}
              >
                Weiter zu Modulen
              </button>
            </div>
          ) : step === 'modules' ? (
            <div className={styles.modulesStep}>
              {/* Available Modules */}
              <div className={styles.availableModules}>
                <div className={styles.modulesHeader}>
                  <h3 className={styles.sectionTitle}>Verfügbare Module</h3>
                  <div className={styles.moduleSearchWrapper}>
                    <MagnifyingGlass size={16} weight="regular" className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Suche nach Modul oder Frage..."
                      className={styles.moduleSearchInput}
                      value={moduleSearchTerm}
                      onChange={(e) => setModuleSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.moduleGrid}>
                  {filteredAvailableModules.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Stack size={48} weight="regular" />
                      <p>{moduleSearchTerm ? 'Keine Module gefunden' : 'Alle Module wurden bereits hinzugefügt'}</p>
                    </div>
                  ) : (
                    filteredAvailableModules.map((module) => (
                      <div key={module.id} className={styles.availableModuleCard} onClick={() => handleAddModule(module)}>
                        <div className={styles.availableModuleHeader}>
                          <Stack size={18} weight="fill" />
                          <span className={styles.availableModuleName}>{module.name}</span>
                        </div>
                        {module.description && (
                          <p className={styles.availableModuleDescription}>{module.description}</p>
                        )}
                        <div className={styles.availableModuleFooter}>
                          <span className={styles.availableModuleQuestions}>{module.questionCount} {module.questionCount === 1 ? 'Frage' : 'Fragen'}</span>
                          <button className={styles.addModuleButton}>
                            <Plus size={16} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Selected Modules */}
              <div className={styles.selectedModules}>
                <h3 className={styles.sectionTitle}>Ausgewählte Module ({selectedModules.length})</h3>

                {selectedModules.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Stack size={48} weight="regular" />
                    <p>Wählen Sie Module aus der linken Liste aus</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedModules.map(m => m.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className={styles.sortableModuleList}>
                        {selectedModules.map((module, index) => (
                          <div key={module.id} className={styles.sortableModuleWrapper}>
                            <div className={styles.moduleOrderNumber}>{index + 1}</div>
                            <SortableModuleCard
                              module={module}
                              onRemove={() => handleRemoveModule(module.id)}
                            />
                          </div>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          ) : step === 'settings' ? (
            <div className={styles.settingsStep}>
              {/* Time Settings */}
              <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Zeitraum</h3>
                <div className={styles.timeToggle}>
                  <button
                    className={`${styles.timeToggleButton} ${isAlwaysActive ? styles.timeToggleButtonActive : ''}`}
                    onClick={() => setIsAlwaysActive(true)}
                  >
                    <Infinity size={20} weight="bold" />
                    <span>Immer aktiv</span>
                  </button>
                  <button
                    className={`${styles.timeToggleButton} ${!isAlwaysActive ? styles.timeToggleButtonActive : ''}`}
                    onClick={() => setIsAlwaysActive(false)}
                  >
                    <Calendar size={20} weight="bold" />
                    <span>Zeitlich begrenzt</span>
                  </button>
                </div>

                {!isAlwaysActive && (
                  <div className={styles.dateInputs}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Startdatum *</label>
                      <div className={styles.dateInputWrapper}>
                        <button
                          className={styles.dateInputButton}
                          onClick={() => {
                            setShowStartCalendar(!showStartCalendar);
                            setShowEndCalendar(false);
                          }}
                        >
                          <Calendar size={16} weight="regular" />
                          <span>{startDate || 'Datum wählen'}</span>
                        </button>
                        {showStartCalendar && (
                          <div className={styles.calendarWrapper} ref={startCalendarRef}>
                            <CalendarPicker
                              value={startDate}
                              onChange={setStartDate}
                              onClose={() => setShowStartCalendar(false)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Enddatum *</label>
                      <div className={styles.dateInputWrapper}>
                        <button
                          className={styles.dateInputButton}
                          onClick={() => {
                            setShowEndCalendar(!showEndCalendar);
                            setShowStartCalendar(false);
                          }}
                        >
                          <Calendar size={16} weight="regular" />
                          <span>{endDate || 'Datum wählen'}</span>
                        </button>
                        {showEndCalendar && (
                          <div className={styles.calendarWrapper} ref={endCalendarRef}>
                            <CalendarPicker
                              value={endDate}
                              onChange={setEndDate}
                              onClose={() => setShowEndCalendar(false)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Market Selection */}
              <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Märkte ({selectedMarkets.length} ausgewählt)</h3>

                {isMarketSelectorOpen && (
                  <div className={styles.marketSelector}>
                    {/* Filters and Search - Matching MarketsPage */}
                    <div className={styles.marketFiltersRow}>
                      {/* Chain Filter */}
                      <div className={styles.filterButtonWrapper}>
                        <button
                          className={`${styles.filterButton} ${openFilter === 'chain' ? styles.filterButtonActive : ''} ${selectedFilters.chain.length > 0 ? styles.filterButtonHasSelection : ''}`}
                          onClick={() => setOpenFilter(openFilter === 'chain' ? null : 'chain')}
                        >
                          <span>Chain</span>
                          {selectedFilters.chain.length > 0 && <span className={styles.filterCount}>({selectedFilters.chain.length})</span>}
                        </button>
                        {openFilter === 'chain' && (
                          <div className={styles.filterDropdown} ref={(el) => { if (el) filterDropdownRefs.current.chain = el; }}>
                            <input
                              type="text"
                              placeholder="Suchen..."
                              className={styles.filterSearch}
                              value={searchTerms.chain}
                              onChange={(e) => setSearchTerms(prev => ({ ...prev, chain: e.target.value }))}
                            />
                            <div className={styles.filterActions}>
                              <button onClick={() => handleSelectAllFilters('chain', uniqueChains)}>Alle</button>
                              <button onClick={() => handleClearFilters('chain')}>Keine</button>
                            </div>
                            <div className={styles.filterOptions}>
                              {getFilteredOptions('chain', uniqueChains).map(chain => (
                                <label key={chain} className={styles.filterOption}>
                                  <input
                                    type="checkbox"
                                    checked={selectedFilters.chain.includes(chain)}
                                    onChange={() => handleToggleFilter('chain', chain)}
                                  />
                                  <span>{chain}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* PLZ Filter */}
                      <div className={styles.filterButtonWrapper}>
                        <button
                          className={`${styles.filterButton} ${openFilter === 'plz' ? styles.filterButtonActive : ''} ${selectedFilters.plz.length > 0 ? styles.filterButtonHasSelection : ''}`}
                          onClick={() => setOpenFilter(openFilter === 'plz' ? null : 'plz')}
                        >
                          <span>PLZ</span>
                          {selectedFilters.plz.length > 0 && <span className={styles.filterCount}>({selectedFilters.plz.length})</span>}
                        </button>
                        {openFilter === 'plz' && (
                          <div className={styles.filterDropdown} ref={(el) => { if (el) filterDropdownRefs.current.plz = el; }}>
                            <input
                              type="text"
                              placeholder="Suchen..."
                              className={styles.filterSearch}
                              value={searchTerms.plz}
                              onChange={(e) => setSearchTerms(prev => ({ ...prev, plz: e.target.value }))}
                            />
                            <div className={styles.filterActions}>
                              <button onClick={() => handleSelectAllFilters('plz', uniquePLZs)}>Alle</button>
                              <button onClick={() => handleClearFilters('plz')}>Keine</button>
                            </div>
                            <div className={styles.filterOptions}>
                              {getFilteredOptions('plz', uniquePLZs).map(plz => (
                                <label key={plz} className={styles.filterOption}>
                                  <input
                                    type="checkbox"
                                    checked={selectedFilters.plz.includes(plz)}
                                    onChange={() => handleToggleFilter('plz', plz)}
                                  />
                                  <span>{plz}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Address Filter */}
                      <div className={styles.filterButtonWrapper}>
                        <button
                          className={`${styles.filterButton} ${openFilter === 'adresse' ? styles.filterButtonActive : ''} ${selectedFilters.adresse.length > 0 ? styles.filterButtonHasSelection : ''}`}
                          onClick={() => setOpenFilter(openFilter === 'adresse' ? null : 'adresse')}
                        >
                          <span>Adresse</span>
                          {selectedFilters.adresse.length > 0 && <span className={styles.filterCount}>({selectedFilters.adresse.length})</span>}
                        </button>
                        {openFilter === 'adresse' && (
                          <div className={styles.filterDropdown} ref={(el) => { if (el) filterDropdownRefs.current.adresse = el; }}>
                            <input
                              type="text"
                              placeholder="Suchen..."
                              className={styles.filterSearch}
                              value={searchTerms.adresse}
                              onChange={(e) => setSearchTerms(prev => ({ ...prev, adresse: e.target.value }))}
                            />
                            <div className={styles.filterActions}>
                              <button onClick={() => handleSelectAllFilters('adresse', uniqueAddresses)}>Alle</button>
                              <button onClick={() => handleClearFilters('adresse')}>Keine</button>
                            </div>
                            <div className={styles.filterOptions}>
                              {getFilteredOptions('adresse', uniqueAddresses).map(addr => (
                                <label key={addr} className={styles.filterOption}>
                                  <input
                                    type="checkbox"
                                    checked={selectedFilters.adresse.includes(addr)}
                                    onChange={() => handleToggleFilter('adresse', addr)}
                                  />
                                  <span>{addr}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* GL Filter */}
                      <div className={styles.filterButtonWrapper}>
                        <button
                          className={`${styles.filterButton} ${openFilter === 'gebietsleiter' ? styles.filterButtonActive : ''} ${selectedFilters.gebietsleiter.length > 0 ? styles.filterButtonHasSelection : ''}`}
                          onClick={() => setOpenFilter(openFilter === 'gebietsleiter' ? null : 'gebietsleiter')}
                        >
                          <span>GL</span>
                          {selectedFilters.gebietsleiter.length > 0 && <span className={styles.filterCount}>({selectedFilters.gebietsleiter.length})</span>}
                        </button>
                        {openFilter === 'gebietsleiter' && (
                          <div className={styles.filterDropdown} ref={(el) => { if (el) filterDropdownRefs.current.gebietsleiter = el; }}>
                            <input
                              type="text"
                              placeholder="Suchen..."
                              className={styles.filterSearch}
                              value={searchTerms.gebietsleiter}
                              onChange={(e) => setSearchTerms(prev => ({ ...prev, gebietsleiter: e.target.value }))}
                            />
                            <div className={styles.filterActions}>
                              <button onClick={() => handleSelectAllFilters('gebietsleiter', uniqueGLs)}>Alle</button>
                              <button onClick={() => handleClearFilters('gebietsleiter')}>Keine</button>
                            </div>
                            <div className={styles.filterOptions}>
                              {getFilteredOptions('gebietsleiter', uniqueGLs).map(gl => (
                                <label key={gl} className={styles.filterOption}>
                                  <input
                                    type="checkbox"
                                    checked={selectedFilters.gebietsleiter.includes(gl)}
                                    onChange={() => handleToggleFilter('gebietsleiter', gl)}
                                  />
                                  <span>{gl}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Subgroup Filter */}
                      <div className={styles.filterButtonWrapper}>
                        <button
                          className={`${styles.filterButton} ${openFilter === 'subgroup' ? styles.filterButtonActive : ''} ${selectedFilters.subgroup.length > 0 ? styles.filterButtonHasSelection : ''}`}
                          onClick={() => setOpenFilter(openFilter === 'subgroup' ? null : 'subgroup')}
                        >
                          <span>Subgroup</span>
                          {selectedFilters.subgroup.length > 0 && <span className={styles.filterCount}>({selectedFilters.subgroup.length})</span>}
                        </button>
                        {openFilter === 'subgroup' && uniqueSubgroups.length > 0 && (
                          <div className={styles.filterDropdown} ref={(el) => { if (el) filterDropdownRefs.current.subgroup = el; }}>
                            <input
                              type="text"
                              placeholder="Suchen..."
                              className={styles.filterSearch}
                              value={searchTerms.subgroup}
                              onChange={(e) => setSearchTerms(prev => ({ ...prev, subgroup: e.target.value }))}
                            />
                            <div className={styles.filterActions}>
                              <button onClick={() => handleSelectAllFilters('subgroup', uniqueSubgroups)}>Alle</button>
                              <button onClick={() => handleClearFilters('subgroup')}>Keine</button>
                            </div>
                            <div className={styles.filterOptions}>
                              {getFilteredOptions('subgroup', uniqueSubgroups).map(subgroup => (
                                <label key={subgroup} className={styles.filterOption}>
                                  <input
                                    type="checkbox"
                                    checked={selectedFilters.subgroup.includes(subgroup)}
                                    onChange={() => handleToggleFilter('subgroup', subgroup)}
                                  />
                                  <span>{subgroup}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status Filter */}
                      <div className={styles.filterButtonWrapper}>
                        <button
                          className={`${styles.filterButton} ${openFilter === 'status' ? styles.filterButtonActive : ''} ${selectedFilters.status.length > 0 ? styles.filterButtonHasSelection : ''}`}
                          onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                        >
                          <span>Status</span>
                          {selectedFilters.status.length > 0 && <span className={styles.filterCount}>({selectedFilters.status.length})</span>}
                        </button>
                        {openFilter === 'status' && (
                          <div className={styles.filterDropdown} ref={(el) => { if (el) filterDropdownRefs.current.status = el; }}>
                            <div className={styles.filterActions}>
                              <button onClick={() => handleSelectAllFilters('status', statusOptions)}>Alle</button>
                              <button onClick={() => handleClearFilters('status')}>Keine</button>
                            </div>
                            <div className={styles.filterOptions}>
                              {statusOptions.map(status => (
                                <label key={status} className={styles.filterOption}>
                                  <input
                                    type="checkbox"
                                    checked={selectedFilters.status.includes(status)}
                                    onChange={() => handleToggleFilter('status', status)}
                                  />
                                  <span>{status}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Search Bar */}
                      <div className={styles.marketSearchWrapper}>
                        <MagnifyingGlass size={16} weight="regular" className={styles.searchIcon} />
                        <input
                          type="text"
                          placeholder="Suche..."
                          className={styles.marketSearchInput}
                          value={marketSearchTerm}
                          onChange={(e) => setMarketSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Market List - Compact Single Row */}
                    <div className={styles.marketList}>
                      {isLoadingMarkets ? (
                        <div className={styles.emptyState}>
                          <Storefront size={48} weight="regular" />
                          <p>Märkte werden geladen...</p>
                        </div>
                      ) : filteredMarkets.length === 0 ? (
                        <div className={styles.emptyState}>
                          <Storefront size={48} weight="regular" />
                          <p>Keine Märkte gefunden</p>
                        </div>
                      ) : (
                        filteredMarkets.map((market) => (
                          <div
                            key={market.id}
                            className={`${styles.marketItem} ${selectedMarkets.includes(market.id) ? styles.marketItemSelected : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleMarket(market.id, e);
                            }}
                          >
                            <span className={styles.marketChain} style={{ background: getChainGradient(market.chain) }}>{market.chain}</span>
                            <span className={styles.marketId}>{market.internalId}</span>
                            <span className={styles.marketName}>{market.name}</span>
                            <span className={styles.marketGL}>
                              {market.gebietsleiterName || <span className={styles.noGL}>Kein GL</span>}
                            </span>
                            <span className={styles.marketAddress}>{market.address}, {market.postalCode} {market.city}</span>
                            {selectedMarkets.includes(market.id) && (
                              <div className={styles.marketCheck}>
                                <Check size={14} weight="bold" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Conflicts Resolution Step */
            <div className={styles.conflictsStep}>
              <div className={styles.conflictsHeader}>
                <WarningCircle size={32} weight="fill" className={styles.warningIcon} />
                <h3 className={styles.conflictsTitle}>Konflikte erkannt</h3>
                <p className={styles.conflictsDescription}>
                  Die folgenden Märkte haben bereits einen aktiven Fragebogen. Bitte entscheiden Sie, wie Sie fortfahren möchten.
                </p>
              </div>

              <div className={styles.conflictsList}>
                {conflicts.map((conflict) => {
                  const newIsTimeLimited = !isAlwaysActive;
                  
                  return (
                    <div key={conflict.marketId} className={styles.conflictCard}>
                      <div className={styles.conflictMarketInfo}>
                        <span className={styles.conflictMarketChain} style={{ background: getChainGradient(conflict.market.chain) }}>
                          {conflict.market.chain}
                        </span>
                        <div className={styles.conflictMarketDetails}>
                          <span className={styles.conflictMarketId}>{conflict.market.internalId}</span>
                          <span className={styles.conflictMarketName}>{conflict.market.address}, {conflict.market.postalCode} {conflict.market.city}</span>
                        </div>
                      </div>

                      <div className={styles.conflictInfo}>
                        <div className={styles.conflictExisting}>
                          <span className={styles.conflictLabel}>Aktueller Fragebogen:</span>
                          <span className={styles.conflictFragebogenName}>{conflict.existingFragebogen.name}</span>
                          <span className={styles.conflictType}>
                            {conflict.existingFragebogen.isTimeLimited ? 'Zeitlich begrenzt' : 'Permanent'}
                          </span>
                        </div>
                        
                        <div className={styles.conflictArrow}>→</div>
                        
                        <div className={styles.conflictNew}>
                          <span className={styles.conflictLabel}>Neuer Fragebogen:</span>
                          <span className={styles.conflictFragebogenName}>{fragebogenName}</span>
                          <span className={styles.conflictType}>
                            {newIsTimeLimited ? 'Zeitlich begrenzt' : 'Permanent'}
                          </span>
                        </div>
                      </div>

                      <div className={styles.conflictActions}>
                        {newIsTimeLimited ? (
                          <>
                            <button
                              className={`${styles.conflictButton} ${styles.conflictButtonOverride} ${conflict.resolution === 'override' ? styles.conflictButtonActive : ''}`}
                              onClick={() => handleConflictResolution(conflict.marketId, 'override')}
                            >
                              <ArrowsClockwise size={18} weight="bold" />
                              <span>Temporär überschreiben</span>
                              <span className={styles.conflictButtonHint}>
                                {startDate && endDate ? `${new Date(startDate).toLocaleDateString('de-DE')} - ${new Date(endDate).toLocaleDateString('de-DE')}` : ''}
                              </span>
                            </button>
                            <button
                              className={`${styles.conflictButton} ${styles.conflictButtonRemove} ${conflict.resolution === 'remove' ? styles.conflictButtonActive : ''}`}
                              onClick={() => handleConflictResolution(conflict.marketId, 'remove')}
                            >
                              <XCircle size={18} weight="bold" />
                              <span>Markt entfernen</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`${styles.conflictButton} ${styles.conflictButtonOverride} ${conflict.resolution === 'override' ? styles.conflictButtonActive : ''}`}
                              onClick={() => handleConflictResolution(conflict.marketId, 'override')}
                            >
                              <ArrowsClockwise size={18} weight="bold" />
                              <span>Permanent ersetzen</span>
                              <span className={styles.conflictButtonHint}>Entfernt aus "{conflict.existingFragebogen.name}"</span>
                            </button>
                            <button
                              className={`${styles.conflictButton} ${styles.conflictButtonRemove} ${conflict.resolution === 'remove' ? styles.conflictButtonActive : ''}`}
                              onClick={() => handleConflictResolution(conflict.marketId, 'remove')}
                            >
                              <XCircle size={18} weight="bold" />
                              <span>Markt entfernen</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer - hide on name step since X or click outside works */}
        {step !== 'name' && (
        <div className={styles.modalFooter}>
          {step === 'modules' ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setStep('name')}>
                <ArrowLeft size={18} weight="bold" />
                Zurück
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={() => selectedModules.length > 0 && setStep('settings')}
                disabled={selectedModules.length === 0}
              >
                Weiter zu Einstellungen
              </button>
            </>
          ) : step === 'settings' ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setStep('modules')}>
                <ArrowLeft size={18} weight="bold" />
                Zurück
              </button>
              <button className={styles.primaryButton} onClick={handleProceedToConflicts}>
                <Check size={18} weight="bold" />
                Fragebogen erstellen
              </button>
            </>
          ) : (
            <>
              <button className={styles.secondaryButton} onClick={() => setStep('settings')}>
                <ArrowLeft size={18} weight="bold" />
                Zurück
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleConfirmConflicts}
                disabled={conflicts.some(c => c.resolution === null)}
              >
                <Check size={18} weight="bold" />
                Konflikte bestätigen ({conflicts.filter(c => c.resolution !== null).length}/{conflicts.length})
              </button>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

