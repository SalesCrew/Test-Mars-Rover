import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, PencilSimple, Stack, Question, Storefront, Check, MagnifyingGlass, Funnel, Archive, CheckCircle, Eye } from '@phosphor-icons/react';
import { adminMarkets } from '../../data/adminMarketsData';
import { FragebogenPreviewModal } from './FragebogenPreviewModal';
import fragebogenService from '../../services/fragebogenService';
// AdminMarket type available if needed from market-types
import styles from './FragebogenDetailModal.module.css';

interface Question {
  id: string;
  moduleId: string;
  type: 'text' | 'textarea' | 'multiple_choice' | 'checkbox' | 'rating' | 'yesno' | 'slider' | 'image' | 'open_numeric' | 'dropdown' | 'single_choice' | 'likert' | 'photo_upload' | 'matrix' | 'open_text' | 'barcode_scanner';
  questionText: string;
  required: boolean;
  order: number;
  options?: string[];
}

interface Module {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  questions: Question[];
  createdAt: string;
}

interface Fragebogen {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'inactive';
  moduleIds: string[];
  assignedGLCount: number;
  responseCount: number;
  marketIds: string[]; // Array of selected market IDs
  createdAt: string;
}

interface FragebogenDetailModalProps {
  fragebogen: Fragebogen;
  modules: Module[];
  onClose: () => void;
  onUpdateMarkets?: (marketIds: string[]) => void; // Callback to save market changes
  onArchive?: (fragebogenId: string) => void; // Callback to archive fragebogen
  onEdit?: (fragebogen: Fragebogen) => void; // Callback to open edit modal
}

type FilterType = 'chain' | 'plz' | 'adresse' | 'gebietsleiter' | 'subgroup' | 'status';

export const FragebogenDetailModal: React.FC<FragebogenDetailModalProps> = ({ 
  fragebogen, 
  modules: initialModules,
  onClose,
  onUpdateMarkets,
  onArchive,
  onEdit
}) => {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(initialModules[0]?.id || null);
  const moduleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Modules with full question data for preview
  const [modulesWithQuestions, setModulesWithQuestions] = useState<Module[]>(initialModules);
  
  // Fetch full module data with questions when opening preview
  useEffect(() => {
    const loadFullModuleData = async () => {
      try {
        // Fetch full data for each module
        const fullModules = await Promise.all(
          initialModules.map(async (m) => {
            const fullModule = await fragebogenService.modules.getById(m.id);
            
            // Build a map from local_id to question_id for rule transformation
            const localIdToQuestionId: Record<string, string> = {};
            (fullModule.questions || []).forEach((mq: any) => {
              if (mq.local_id && mq.question?.id) {
                localIdToQuestionId[mq.local_id] = mq.question.id;
              }
            });
            
            // Transform rules into conditions attached to the trigger question
            const rulesByQuestion: Record<string, any[]> = {};
            (fullModule.rules || []).forEach((rule: any) => {
              const triggerQuestionId = localIdToQuestionId[rule.trigger_local_id] || '';
              const targetQuestionIds = (rule.target_local_ids || []).map((lid: string) => localIdToQuestionId[lid] || '');
              
              const condition = {
                id: rule.id,
                triggerQuestionId,
                triggerAnswer: rule.trigger_answer,
                operator: rule.operator || 'equals',
                triggerAnswerMax: rule.trigger_answer_max ? Number(rule.trigger_answer_max) : undefined,
                action: rule.action,
                targetQuestionIds
              };
              
              if (!rulesByQuestion[triggerQuestionId]) {
                rulesByQuestion[triggerQuestionId] = [];
              }
              rulesByQuestion[triggerQuestionId].push(condition);
            });
            
            // Transform API response to component format
            return {
              id: fullModule.id,
              name: fullModule.name,
              description: fullModule.description,
              questionCount: fullModule.question_count || 0,
              questions: (fullModule.questions || []).map((mq: any) => ({
                id: mq.question?.id || mq.id,
                moduleId: fullModule.id,
                type: mq.question?.type || 'open_text',
                questionText: mq.question?.question_text || '',
                instruction: mq.question?.instruction,
                required: mq.required || false,
                order: mq.order_index || 0,
                options: mq.question?.options,
                likertScale: mq.question?.likert_scale,
                matrixRows: mq.question?.matrix_config?.rows,
                matrixColumns: mq.question?.matrix_config?.columns,
                numericConstraints: mq.question?.numeric_constraints,
                sliderConfig: mq.question?.slider_config,
                conditions: rulesByQuestion[mq.question?.id] || []
              })),
              createdAt: fullModule.created_at
            } as Module;
          })
        );
        setModulesWithQuestions(fullModules);
      } catch (error) {
        console.error('Failed to load full module data:', error);
      }
    };
    
    loadFullModuleData();
  }, [initialModules]);
  
  // Archive confirmation state
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);
  
  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Market selection state
  const [isMarketSelectorOpen, setIsMarketSelectorOpen] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(fragebogen.marketIds || []);
  const [marketSearchTerm, setMarketSearchTerm] = useState('');
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<FilterType, string>>({
    chain: '',
    plz: '',
    adresse: '',
    gebietsleiter: '',
    subgroup: '',
    status: ''
  });
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

  const filterRefs = useRef<{ [key in FilterType]?: HTMLDivElement | null }>({});
  const marketSelectorRef = useRef<HTMLDivElement>(null);

  // Helper functions
  const getChainGradient = (chain: string) => {
    const gradients: Record<string, string> = {
      'Adeg': 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
      'Billa+': 'linear-gradient(135deg, #EAB308 0%, #F59E0B 100%)',
      'BILLA+': 'linear-gradient(135deg, #EAB308 0%, #F59E0B 100%)',
      'BILLA Plus': 'linear-gradient(135deg, #EAB308 0%, #F59E0B 100%)',
      'BILLA+ Privat': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'BILLA Plus Privat': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'BILLA Privat': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'Eurospar': 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
      'Futterhaus': 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      'Hagebau': 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      'Interspar': 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
      'Spar': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      'Spar Gourmet': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'Zoofachhandel': 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      'Hofer': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      'Merkur': 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
    };
    return gradients[chain] || 'linear-gradient(135deg, #64748B 0%, #475569 100%)';
  };

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
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(v => v !== value)
        : [...prev[filterType], value]
    }));
  };

  const handleClearFilter = (filterType: FilterType) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: []
    }));
    setSearchTerms(prev => ({
      ...prev,
      [filterType]: ''
    }));
  };

  const handleSaveMarkets = () => {
    if (onUpdateMarkets) {
      onUpdateMarkets(selectedMarkets);
    }
    setIsMarketSelectorOpen(false);
  };

  const handleCancelMarketSelection = () => {
    setSelectedMarkets(fragebogen.marketIds || []);
    setIsMarketSelectorOpen(false);
  };

  // Filter markets
  const filteredMarkets = useMemo(() => {
    let result = [...adminMarkets];

    // Apply search term
    if (marketSearchTerm.trim()) {
      const term = marketSearchTerm.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.address.toLowerCase().includes(term) ||
        m.city.toLowerCase().includes(term) ||
        m.internalId.toLowerCase().includes(term) ||
        m.chain.toLowerCase().includes(term) ||
        (m.gebietsleiter && m.gebietsleiter.toLowerCase().includes(term))
      );
    }

    // Apply filters
    if (selectedFilters.chain.length > 0) {
      result = result.filter(m => selectedFilters.chain.includes(m.chain));
    }
    if (selectedFilters.plz.length > 0) {
      result = result.filter(m => selectedFilters.plz.includes(m.postalCode));
    }
    if (selectedFilters.adresse.length > 0) {
      result = result.filter(m => selectedFilters.adresse.includes(m.city));
    }
    if (selectedFilters.gebietsleiter.length > 0) {
      result = result.filter(m => m.gebietsleiter && selectedFilters.gebietsleiter.includes(m.gebietsleiter));
    }
    if (selectedFilters.subgroup.length > 0) {
      result = result.filter(m => m.subgroup && selectedFilters.subgroup.includes(m.subgroup));
    }
    if (selectedFilters.status.length > 0) {
      result = result.filter(m => {
        const status = m.isActive ? 'Aktiv' : 'Inaktiv';
        return selectedFilters.status.includes(status);
      });
    }

    return result;
  }, [marketSearchTerm, selectedFilters]);

  // Get unique filter options
  const getUniqueFilterOptions = (filterType: FilterType) => {
    const allValues = adminMarkets.map(m => {
      switch (filterType) {
        case 'chain': return m.chain;
        case 'plz': return m.postalCode;
        case 'adresse': return m.city;
        case 'gebietsleiter': return m.gebietsleiter || '';
        case 'subgroup': return m.subgroup || '';
        case 'status': return m.isActive ? 'Aktiv' : 'Inaktiv';
        default: return '';
      }
    }).filter(Boolean);
    
    const unique = Array.from(new Set(allValues)).sort();
    const term = searchTerms[filterType].toLowerCase();
    return term ? unique.filter(v => v.toLowerCase().includes(term)) : unique;
  };

  // Click outside handler for filter dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilter && filterRefs.current[openFilter]) {
        const filterElement = filterRefs.current[openFilter];
        if (filterElement && !filterElement.contains(event.target as Node)) {
          setOpenFilter(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter]);

  // Click outside handler for market selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMarketSelectorOpen && marketSelectorRef.current) {
        if (!marketSelectorRef.current.contains(event.target as Node)) {
          handleCancelMarketSelection();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMarketSelectorOpen]);

  const getStatusConfig = () => {
    switch (fragebogen.status) {
      case 'active':
        return { label: 'Aktiv', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' };
      case 'scheduled':
        return { label: 'Geplant', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' };
      case 'inactive':
        return { label: 'Inaktiv', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' };
    }
  };

  const statusConfig = getStatusConfig();

  const getQuestionTypeLabel = (type: Question['type']) => {
    switch (type) {
      case 'text': return 'Kurztext';
      case 'textarea': return 'Langtext';
      case 'multiple_choice': return 'Einfachauswahl';
      case 'checkbox': return 'Mehrfachauswahl';
      case 'rating': return 'Bewertung';
      case 'yesno': return 'Ja/Nein';
      default: return type;
    }
  };

  const scrollToModule = (moduleId: string) => {
    const element = moduleRefs.current[moduleId];
    if (element && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elementTop = element.offsetTop;
      const offset = 120; // Account for sticky module nav
      container.scrollTo({
        top: elementTop - offset,
        behavior: 'smooth'
      });
      setActiveModuleId(moduleId);
    }
  };

  // Track scroll position to highlight active module
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + 150;
      
      for (const module of initialModules) {
        const element = moduleRefs.current[module.id];
        if (element) {
          const elementTop = element.offsetTop;
          const elementBottom = elementTop + element.offsetHeight;
          
          if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
            setActiveModuleId(module.id);
            break;
          }
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [initialModules]);

  const handleArchiveClick = () => {
    setShowArchiveConfirmation(true);
  };

  const handleConfirmArchive = () => {
    if (onArchive) {
      onArchive(fragebogen.id);
    }
    setShowArchiveConfirmation(false);
    onClose();
  };

  const handleCancelArchive = () => {
    setShowArchiveConfirmation(false);
  };

  // Determine if fragebogen is archived (inactive)
  const isArchived = fragebogen.status === 'inactive';
  const actionButtonText = isArchived ? 'Aktivieren' : 'Archivieren';
  const ActionIcon = isArchived ? CheckCircle : Archive;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <h2 className={styles.modalTitle}>{fragebogen.name}</h2>
            <div className={styles.statusPill} style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color
            }}>
              {statusConfig.label}
            </div>
            <button 
              className={styles.marketSelectorButton}
              onClick={() => setIsMarketSelectorOpen(true)}
            >
              <Storefront size={16} weight="fill" />
              <span>{selectedMarkets.length} {selectedMarkets.length === 1 ? 'Markt' : 'Märkte'}</span>
            </button>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.archiveButton} onClick={handleArchiveClick}>
              <ActionIcon size={20} weight="bold" />
              <span>{actionButtonText}</span>
            </button>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={24} weight="bold" />
            </button>
          </div>
        </div>

        {/* Module Navigation */}
        <div className={styles.moduleNav}>
          <div className={styles.moduleNavScroller}>
            {initialModules.map(module => (
              <button
                key={module.id}
                className={`${styles.moduleNavPill} ${activeModuleId === module.id ? styles.moduleNavPillActive : ''}`}
                onClick={() => scrollToModule(module.id)}
              >
                <Stack size={14} weight="fill" />
                <span>{module.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Questions Content */}
        <div className={styles.modalContent} ref={scrollContainerRef}>
          {modulesWithQuestions.map((module, _moduleIndex) => (
            <div 
              key={module.id} 
              className={styles.moduleSection}
              ref={el => { moduleRefs.current[module.id] = el; }}
            >
              <div className={styles.moduleSectionHeader}>
                <Stack size={20} weight="fill" />
                <h3 className={styles.moduleSectionTitle}>{module.name}</h3>
                <span className={styles.moduleSectionCount}>
                  {module.questions.length} {module.questions.length === 1 ? 'Frage' : 'Fragen'}
                </span>
              </div>

              <div className={styles.questionsList}>
                {module.questions.map((question, index) => (
                  <div key={question.id} className={styles.questionCard}>
                    <div className={styles.questionHeader}>
                      <div className={styles.questionNumber}>
                        {index + 1}
                      </div>
                      <div className={styles.questionMeta}>
                        <span className={styles.questionType}>
                          {getQuestionTypeLabel(question.type)}
                        </span>
                        {question.required && (
                          <span className={styles.requiredBadge}>Pflichtfrage</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.questionBody}>
                      <p className={styles.questionText}>
                        <Question size={16} weight="fill" />
                        {question.questionText}
                      </p>

                      {question.options && question.options.length > 0 && (
                        <div className={styles.questionOptions}>
                          <span className={styles.optionsLabel}>Antwortmöglichkeiten:</span>
                          <div className={styles.optionsList}>
                            {question.options.map((option, idx) => (
                              <span key={idx} className={styles.optionPill}>
                                {option}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.previewButton} onClick={() => setIsPreviewOpen(true)}>
            <Eye size={18} weight="bold" />
            Vorschau
          </button>
          <button 
            className={styles.editButton}
            onClick={() => {
              if (onEdit) {
                onEdit(fragebogen);
                onClose();
              }
            }}
          >
            <PencilSimple size={18} weight="bold" />
            Fragebogen bearbeiten
          </button>
          <button className={styles.secondaryButton} onClick={onClose}>
            Schließen
          </button>
        </div>

        {/* Market Selector Popup */}
        {isMarketSelectorOpen && (
          <div className={styles.marketSelectorOverlay}>
            <div className={styles.marketSelectorPopup} ref={marketSelectorRef}>
              <div className={styles.marketSelectorHeader}>
                <h3 className={styles.marketSelectorTitle}>
                  <Storefront size={20} weight="fill" />
                  Märkte auswählen
                </h3>
                <button className={styles.marketSelectorClose} onClick={handleCancelMarketSelection}>
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Filters */}
              <div className={styles.marketFilters}>
                <div className={styles.filterRow}>
                  {/* Chain Filter */}
                  <div className={styles.filterButtonWrapper} ref={el => { filterRefs.current.chain = el; }}>
                    <button
                      className={styles.filterButton}
                      onClick={() => setOpenFilter(openFilter === 'chain' ? null : 'chain')}
                    >
                      <Funnel size={14} weight="fill" />
                      <span>Chain</span>
                      {selectedFilters.chain.length > 0 && (
                        <span className={styles.filterCount}>{selectedFilters.chain.length}</span>
                      )}
                    </button>
                    {openFilter === 'chain' && (
                      <div className={styles.filterDropdown}>
                        <input
                          type="text"
                          placeholder="Suchen..."
                          className={styles.filterSearch}
                          value={searchTerms.chain}
                          onChange={(e) => setSearchTerms({...searchTerms, chain: e.target.value})}
                        />
                        <div className={styles.filterActions}>
                          <button onClick={() => handleClearFilter('chain')}>Zurücksetzen</button>
                        </div>
                        <div className={styles.filterOptions}>
                          {getUniqueFilterOptions('chain').map(chain => (
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
                  <div className={styles.filterButtonWrapper} ref={el => { filterRefs.current.plz = el; }}>
                    <button
                      className={styles.filterButton}
                      onClick={() => setOpenFilter(openFilter === 'plz' ? null : 'plz')}
                    >
                      <Funnel size={14} weight="fill" />
                      <span>PLZ</span>
                      {selectedFilters.plz.length > 0 && (
                        <span className={styles.filterCount}>{selectedFilters.plz.length}</span>
                      )}
                    </button>
                    {openFilter === 'plz' && (
                      <div className={styles.filterDropdown}>
                        <input
                          type="text"
                          placeholder="Suchen..."
                          className={styles.filterSearch}
                          value={searchTerms.plz}
                          onChange={(e) => setSearchTerms({...searchTerms, plz: e.target.value})}
                        />
                        <div className={styles.filterActions}>
                          <button onClick={() => handleClearFilter('plz')}>Zurücksetzen</button>
                        </div>
                        <div className={styles.filterOptions}>
                          {getUniqueFilterOptions('plz').map(plz => (
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

                  {/* Adresse Filter */}
                  <div className={styles.filterButtonWrapper} ref={el => { filterRefs.current.adresse = el; }}>
                    <button
                      className={styles.filterButton}
                      onClick={() => setOpenFilter(openFilter === 'adresse' ? null : 'adresse')}
                    >
                      <Funnel size={14} weight="fill" />
                      <span>Adresse</span>
                      {selectedFilters.adresse.length > 0 && (
                        <span className={styles.filterCount}>{selectedFilters.adresse.length}</span>
                      )}
                    </button>
                    {openFilter === 'adresse' && (
                      <div className={styles.filterDropdown}>
                        <input
                          type="text"
                          placeholder="Suchen..."
                          className={styles.filterSearch}
                          value={searchTerms.adresse}
                          onChange={(e) => setSearchTerms({...searchTerms, adresse: e.target.value})}
                        />
                        <div className={styles.filterActions}>
                          <button onClick={() => handleClearFilter('adresse')}>Zurücksetzen</button>
                        </div>
                        <div className={styles.filterOptions}>
                          {getUniqueFilterOptions('adresse').map(city => (
                            <label key={city} className={styles.filterOption}>
                              <input
                                type="checkbox"
                                checked={selectedFilters.adresse.includes(city)}
                                onChange={() => handleToggleFilter('adresse', city)}
                              />
                              <span>{city}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GL Filter */}
                  <div className={styles.filterButtonWrapper} ref={el => { filterRefs.current.gebietsleiter = el; }}>
                    <button
                      className={styles.filterButton}
                      onClick={() => setOpenFilter(openFilter === 'gebietsleiter' ? null : 'gebietsleiter')}
                    >
                      <Funnel size={14} weight="fill" />
                      <span>GL</span>
                      {selectedFilters.gebietsleiter.length > 0 && (
                        <span className={styles.filterCount}>{selectedFilters.gebietsleiter.length}</span>
                      )}
                    </button>
                    {openFilter === 'gebietsleiter' && (
                      <div className={styles.filterDropdown}>
                        <input
                          type="text"
                          placeholder="Suchen..."
                          className={styles.filterSearch}
                          value={searchTerms.gebietsleiter}
                          onChange={(e) => setSearchTerms({...searchTerms, gebietsleiter: e.target.value})}
                        />
                        <div className={styles.filterActions}>
                          <button onClick={() => handleClearFilter('gebietsleiter')}>Zurücksetzen</button>
                        </div>
                        <div className={styles.filterOptions}>
                          {getUniqueFilterOptions('gebietsleiter').map(gl => (
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
                  <div className={styles.filterButtonWrapper} ref={el => { filterRefs.current.subgroup = el; }}>
                    <button
                      className={styles.filterButton}
                      onClick={() => setOpenFilter(openFilter === 'subgroup' ? null : 'subgroup')}
                    >
                      <Funnel size={14} weight="fill" />
                      <span>Subgroup</span>
                      {selectedFilters.subgroup.length > 0 && (
                        <span className={styles.filterCount}>{selectedFilters.subgroup.length}</span>
                      )}
                    </button>
                    {openFilter === 'subgroup' && (
                      <div className={styles.filterDropdown}>
                        <input
                          type="text"
                          placeholder="Suchen..."
                          className={styles.filterSearch}
                          value={searchTerms.subgroup}
                          onChange={(e) => setSearchTerms({...searchTerms, subgroup: e.target.value})}
                        />
                        <div className={styles.filterActions}>
                          <button onClick={() => handleClearFilter('subgroup')}>Zurücksetzen</button>
                        </div>
                        <div className={styles.filterOptions}>
                          {getUniqueFilterOptions('subgroup').map(sub => (
                            <label key={sub} className={styles.filterOption}>
                              <input
                                type="checkbox"
                                checked={selectedFilters.subgroup.includes(sub)}
                                onChange={() => handleToggleFilter('subgroup', sub)}
                              />
                              <span>{sub}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className={styles.filterButtonWrapper} ref={el => { filterRefs.current.status = el; }}>
                    <button
                      className={styles.filterButton}
                      onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                    >
                      <Funnel size={14} weight="fill" />
                      <span>Status</span>
                      {selectedFilters.status.length > 0 && (
                        <span className={styles.filterCount}>{selectedFilters.status.length}</span>
                      )}
                    </button>
                    {openFilter === 'status' && (
                      <div className={styles.filterDropdown}>
                        <div className={styles.filterActions}>
                          <button onClick={() => handleClearFilter('status')}>Zurücksetzen</button>
                        </div>
                        <div className={styles.filterOptions}>
                          {getUniqueFilterOptions('status').map(status => (
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
                    <MagnifyingGlass size={16} weight="bold" className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Suche..."
                      className={styles.marketSearchInput}
                      value={marketSearchTerm}
                      onChange={(e) => setMarketSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Market List */}
              <div className={styles.marketList}>
                {filteredMarkets.length === 0 ? (
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

              {/* Popup Footer */}
              <div className={styles.marketSelectorFooter}>
                <button className={styles.secondaryButton} onClick={handleCancelMarketSelection}>
                  Abbrechen
                </button>
                <button className={styles.primaryButton} onClick={handleSaveMarkets}>
                  <Check size={18} weight="bold" />
                  Speichern ({selectedMarkets.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive/Activate Confirmation Modal */}
        {showArchiveConfirmation && (
          <div className={styles.confirmationOverlay} onClick={handleCancelArchive}>
            <div className={styles.confirmationModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.confirmationIcon}>
                <ActionIcon size={32} weight="fill" />
              </div>
              <h3 className={styles.confirmationTitle}>
                {isArchived ? 'Fragebogen aktivieren?' : 'Fragebogen archivieren?'}
              </h3>
              <p className={styles.confirmationText}>
                {isArchived 
                  ? `Möchten Sie den Fragebogen "${fragebogen.name}" wirklich aktivieren? Der Fragebogen wird wieder in den aktiven Bereich verschoben.`
                  : `Möchten Sie den Fragebogen "${fragebogen.name}" wirklich archivieren? Der Fragebogen wird in den archivierten Bereich verschoben.`
                }
              </p>
              <div className={styles.confirmationButtons}>
                <button className={styles.confirmationCancel} onClick={handleCancelArchive}>
                  Abbrechen
                </button>
                <button className={styles.confirmationConfirm} onClick={handleConfirmArchive}>
                  <ActionIcon size={18} weight="bold" />
                  {actionButtonText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {isPreviewOpen && (
          <FragebogenPreviewModal
            title={fragebogen.name}
            modules={modulesWithQuestions.map(m => ({
              id: m.id,
              name: m.name,
              description: m.description,
              questions: (m.questions || []).map(q => ({
                ...q,
                type: q.type as any
              }))
            }))}
            onClose={() => setIsPreviewOpen(false)}
            onComplete={() => {
              // Preview only - no data storage, just close
              setIsPreviewOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

