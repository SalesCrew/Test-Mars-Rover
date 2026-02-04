import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Check, Plus, Trash, DotsSixVertical, GitBranch, Question, CheckCircle as CheckCircleFilled, CaretDown } from '@phosphor-icons/react';
import fragebogenService from '../../services/fragebogenService';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Module, QuestionInterface, QuestionType, QuestionCondition } from './FragebogenPage';
import { QUESTION_TYPES, getQuestionTypeLabel } from './questionTypes';
import styles from './CreateModuleModal.module.css';

interface CreateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (module: Module) => void;
  editingModule?: Module; // Optional: If provided, we're editing
  originalModuleName?: string; // Optional: Original name when duplicating
  allModules?: Module[]; // All modules to import questions from
}

type Step = 'name' | 'questions' | 'review';

export const CreateModuleModal: React.FC<CreateModuleModalProps> = ({ isOpen, onClose, onSave, editingModule, originalModuleName }) => {
  const [step, setStep] = useState<Step>('name');
  const [moduleName, setModuleName] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionInterface[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [hoveredRuleBadge, setHoveredRuleBadge] = useState<string | null>(null);
  const [hoveredHeaderRules, setHoveredHeaderRules] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType | 'all'>('all');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [allDatabaseQuestions, setAllDatabaseQuestions] = useState<QuestionInterface[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Initialize with editing data if provided
  React.useEffect(() => {
    if (editingModule) {
      setModuleName(editingModule.name);
      setModuleDescription(editingModule.description || '');
      setQuestions(editingModule.questions);
      // If duplicating (no ID), start at 'name' step, otherwise start at 'questions'
      setStep(editingModule.id ? 'questions' : 'name');
    }
  }, [editingModule]);

  // Fetch all questions from database when import modal opens
  useEffect(() => {
    if (isImportModalOpen && allDatabaseQuestions.length === 0) {
      const loadQuestions = async () => {
        setIsLoadingQuestions(true);
        try {
          const questionsFromDb = await fragebogenService.questions.getAll();
          // Transform to QuestionInterface format
          const transformed: QuestionInterface[] = questionsFromDb.map((q: any) => ({
            id: q.id,
            moduleId: '',
            type: q.type as QuestionType,
            questionText: q.question_text,
            required: false,
            order: 0,
            options: q.options,
            likertScale: q.likert_scale,
            matrixRows: q.matrix_config?.rows,
            matrixColumns: q.matrix_config?.columns,
            numericConstraints: q.numeric_constraints,
            sliderConfig: q.slider_config,
            instruction: q.instruction,
          }));
          setAllDatabaseQuestions(transformed);
        } catch (error) {
          console.error('Failed to load questions:', error);
        } finally {
          setIsLoadingQuestions(false);
        }
      };
      loadQuestions();
    }
  }, [isImportModalOpen, allDatabaseQuestions.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  if (!isOpen) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((q) => q.id === active.id);
        const newIndex = items.findIndex((q) => q.id === over?.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((q, idx) => ({ ...q, order: idx + 1 }));
      });
    }
  };

  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion: QuestionInterface = {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      moduleId: 'temp',
      type,
      questionText: '',
      required: true, // Changed to true by default
      order: questions.length + 1,
      ...(QUESTION_TYPES[type].requiresOptions && { options: [''] }),
      ...(type === 'likert' && { 
        likertScale: { min: undefined as any, max: undefined as any, minLabel: '', maxLabel: '' } 
      }),
      ...(type === 'matrix' && { 
        matrixRows: [''], 
        matrixColumns: ['', ''] 
      }),
      ...(type === 'open_numeric' && { 
        numericConstraints: { decimals: false } 
      }),
      ...(type === 'slider' && { 
        sliderConfig: { min: undefined as any, max: undefined as any, step: undefined as any, unit: '' } 
      }),
    };
    setQuestions(prev => [...prev, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  const handleImportQuestion = (sourceQuestion: QuestionInterface) => {
    // Create a copy without conditions (rules are ignored)
    const { conditions, ...questionData } = sourceQuestion;
    const newQuestion: QuestionInterface = {
      ...questionData,
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      moduleId: 'temp',
      order: questions.length + 1,
    };
    setQuestions(prev => [...prev, newQuestion]);
    setEditingQuestionId(newQuestion.id);
    setIsImportModalOpen(false);
  };

  // Filter questions based on search and type (from database)
  const filteredImportQuestions = allDatabaseQuestions.filter(q => {
    const matchesSearch = importSearchTerm.trim() === '' || 
      q.questionText.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
      (q.options?.some(opt => opt.toLowerCase().includes(importSearchTerm.toLowerCase())));
    const matchesType = selectedQuestionType === 'all' || q.type === selectedQuestionType;
    return matchesSearch && matchesType;
  });

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, idx) => ({ ...q, order: idx + 1 })));
    if (editingQuestionId === id) {
      setEditingQuestionId(null);
    }
  };

  const handleUpdateQuestion = (id: string, updates: Partial<QuestionInterface>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleSaveAndClose = () => {
    if (!moduleName.trim()) {
      alert('Bitte geben Sie einen Modulnamen ein');
      return;
    }

    if (questions.length === 0) {
      alert('Bitte fügen Sie mindestens eine Frage hinzu');
      return;
    }

    // Validate all questions have text
    const invalidQuestions = questions.filter(q => !q.questionText.trim());
    if (invalidQuestions.length > 0) {
      alert('Bitte füllen Sie alle Fragetexte aus');
      return;
    }

    if (editingModule && editingModule.id) {
      // Update existing module (has ID)
      const updatedModule: Module = {
        ...editingModule,
        name: moduleName,
        description: moduleDescription || undefined,
        questionCount: questions.length,
        questions: questions.map(q => ({ ...q, moduleId: editingModule.id })),
      };
      onSave(updatedModule);
    } else {
      // Create new module (no ID or empty ID = duplicate)
      const newModuleId = `m-${Date.now()}`;
      const newModule: Module = {
        id: newModuleId,
        name: moduleName,
        description: moduleDescription || undefined,
        questionCount: questions.length,
        questions: questions.map(q => ({ ...q, moduleId: newModuleId })),
        createdAt: new Date().toISOString(),
      };
      onSave(newModule);
    }
    
    resetForm();
    onClose();
  };

  const handleGoToReview = () => {
    if (!moduleName.trim()) {
      alert('Bitte geben Sie einen Modulnamen ein');
      return;
    }

    if (questions.length === 0) {
      alert('Bitte fügen Sie mindestens eine Frage hinzu');
      return;
    }

    // Validate all questions have text
    const invalidQuestions = questions.filter(q => !q.questionText.trim());
    if (invalidQuestions.length > 0) {
      alert('Bitte füllen Sie alle Fragetexte aus');
      return;
    }

    setStep('review');
  };

  const handleSaveAndCreateAnother = () => {
    handleSaveAndClose();
    // Modal will close, then we would need to reopen - for now just saves and closes
    // TODO: Implement logic to reset form and stay open
  };

  const resetForm = () => {
    setStep('name');
    setModuleName('');
    setModuleDescription('');
    setQuestions([]);
    setEditingQuestionId(null);
  };

  const handleClose = () => {
    if (questions.length > 0 || moduleName) {
      if (!confirm('Möchten Sie wirklich abbrechen? Alle nicht gespeicherten Änderungen gehen verloren.')) {
        return;
      }
    }
    resetForm();
    onClose();
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={handleClose}>
        <div className={`${styles.modal} ${step === 'name' ? styles.modalNameStep : ''}`} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              {step === 'name' ? 'Neues Modul erstellen' : step === 'review' ? 'Zusammenfassung' : moduleName}
            </h2>
            <div className={styles.headerActions}>
              {step === 'questions' && (
                <button 
                  className={styles.importButton}
                  onClick={() => setIsImportModalOpen(true)}
                  title="Existierende Fragen hinzufügen"
                >
                  <Plus size={20} weight="bold" />
                </button>
              )}
              <button className={styles.closeButton} onClick={handleClose}>
                <X size={24} weight="bold" />
              </button>
            </div>
          </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {step === 'name' ? (
            <div className={styles.nameStep}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="moduleName">
                  Modulname <span className={styles.required}>*</span>
                </label>
                <input
                  id="moduleName"
                  type="text"
                  className={styles.input}
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="z.B. Kundenzufriedenheit"
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="moduleDescription">
                  Beschreibung (optional)
                </label>
                <textarea
                  id="moduleDescription"
                  className={styles.textarea}
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  placeholder="Kurze Beschreibung des Moduls..."
                  rows={3}
                />
              </div>

              <button
                className={styles.primaryButton}
                onClick={() => {
                  const isNameValid = moduleName.trim() && (!originalModuleName || moduleName.trim() !== originalModuleName);
                  if (isNameValid) {
                    setStep('questions');
                  }
                }}
                disabled={!moduleName.trim() || Boolean(originalModuleName && moduleName.trim() === originalModuleName)}
              >
                Weiter zu Fragen
              </button>
            </div>
          ) : step === 'review' ? (
            <div className={styles.reviewStep}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewModuleInfo}>
                  <h3 className={styles.reviewModuleName}>{moduleName}</h3>
                  {moduleDescription && (
                    <p className={styles.reviewModuleDescription}>{moduleDescription}</p>
                  )}
                  <div className={styles.reviewStats}>
                    <div className={styles.reviewStat}>
                      <Question size={20} weight="fill" />
                      <span>{questions.length} {questions.length === 1 ? 'Frage' : 'Fragen'}</span>
                    </div>
                    <div className={styles.reviewStat}>
                      <CheckCircleFilled size={20} weight="fill" />
                      <span>{questions.filter(q => q.required).length} Pflichtfragen</span>
                    </div>
                    <div 
                      className={`${styles.reviewStat} ${styles.reviewStatHoverable}`}
                      onMouseEnter={() => setHoveredHeaderRules(true)}
                      onMouseLeave={() => setHoveredHeaderRules(false)}
                    >
                      <GitBranch size={20} weight="fill" />
                      <span>{questions.reduce((sum, q) => sum + (q.conditions?.length || 0), 0)} Regeln</span>
                      
                      {hoveredHeaderRules && questions.some(q => q.conditions && q.conditions.length > 0) && (
                        <div className={styles.headerRuleHoverCard}>
                          <div className={styles.ruleHoverHeader}>
                            <GitBranch size={16} weight="bold" />
                            <span>Alle Regeln im Modul</span>
                          </div>
                          <div className={styles.ruleHoverBody}>
                            {questions.map((question) => {
                              if (!question.conditions || question.conditions.length === 0) return null;
                              
                              return (
                                <div key={question.id} className={styles.headerRuleSection}>
                                  <div className={styles.headerRuleSectionTitle}>
                                    Frage {question.order}: {question.questionText}
                                  </div>
                                  {question.conditions.map((condition, idx) => {
                                    const triggerQ = questions.find(q => q.id === condition.triggerQuestionId);
                                    const targetQuestions = questions.filter(q => condition.targetQuestionIds.includes(q.id));
                                    
                                    let operatorText = '';
                                    switch(condition.operator) {
                                      case 'equals': operatorText = 'gleich'; break;
                                      case 'not_equals': operatorText = 'ungleich'; break;
                                      case 'greater_than': operatorText = 'größer als'; break;
                                      case 'less_than': operatorText = 'kleiner als'; break;
                                      case 'between': operatorText = 'zwischen'; break;
                                      default: operatorText = condition.operator || 'gleich';
                                    }
                                    
                                    return (
                                      <div key={idx} className={styles.ruleHoverItem}>
                                        <div className={styles.ruleHoverItemNumber}>{idx + 1}</div>
                                        <div className={styles.ruleHoverItemContent}>
                                          <div className={styles.ruleHoverItemRow}>
                                            <span className={styles.ruleHoverLabel}>Wenn</span>
                                            <span className={styles.ruleHoverValue}>Frage {triggerQ?.order || '?'}</span>
                                            <span className={styles.ruleHoverOperator}>{operatorText}</span>
                                            <span className={styles.ruleHoverAnswer}>"{condition.triggerAnswer}"</span>
                                            {condition.triggerAnswerMax && (
                                              <>
                                                <span className={styles.ruleHoverOperator}>und</span>
                                                <span className={styles.ruleHoverAnswer}>"{condition.triggerAnswerMax}"</span>
                                              </>
                                            )}
                                          </div>
                                          <div className={styles.ruleHoverItemRow}>
                                            <span className={styles.ruleHoverLabel}>Dann</span>
                                            <span className={styles.ruleHoverAction}>
                                              {condition.action === 'hide' ? 'Verstecke' : 'Zeige'}
                                            </span>
                                            <span className={styles.ruleHoverTargets}>
                                              {targetQuestions.length > 0 
                                                ? targetQuestions.map(q => `Frage ${q.order}`).join(', ')
                                                : 'Keine Ziele'
                                              }
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.reviewQuestions}>
                {questions.map((question, _index) => {
                  const config = QUESTION_TYPES[question.type];
                  const Icon = config.icon;
                  
                  return (
                    <div key={question.id} className={styles.reviewQuestionCard}>
                      <div className={styles.reviewQuestionHeader}>
                        <div className={styles.reviewQuestionNumber}>{question.order}</div>
                        <div className={styles.reviewQuestionType} style={{ backgroundColor: config.color + '20', color: config.color }}>
                          <Icon size={14} weight="fill" />
                          <span>{config.label}</span>
                        </div>
                        {question.required && <span className={styles.reviewRequiredBadge}>Pflicht</span>}
                        {question.conditions && question.conditions.length > 0 && (
                          <div 
                            className={styles.reviewConditionBadgeWrapper}
                            onMouseEnter={() => setHoveredRuleBadge(question.id)}
                            onMouseLeave={() => setHoveredRuleBadge(null)}
                          >
                            <span className={styles.reviewConditionBadge}>
                              <GitBranch size={12} weight="bold" />
                              {question.conditions.length} {question.conditions.length === 1 ? 'Regel' : 'Regeln'}
                            </span>
                            
                            {hoveredRuleBadge === question.id && (
                              <div className={styles.ruleHoverCard}>
                                <div className={styles.ruleHoverHeader}>
                                  <GitBranch size={16} weight="bold" />
                                  <span>Bedingte Logik</span>
                                </div>
                                <div className={styles.ruleHoverBody}>
                                  {question.conditions.map((condition, idx) => {
                                    const triggerQ = questions.find(q => q.id === condition.triggerQuestionId);
                                    const targetQuestions = questions.filter(q => condition.targetQuestionIds.includes(q.id));
                                    
                                    let operatorText = '';
                                    switch(condition.operator) {
                                      case 'equals': operatorText = 'gleich'; break;
                                      case 'not_equals': operatorText = 'ungleich'; break;
                                      case 'greater_than': operatorText = 'größer als'; break;
                                      case 'less_than': operatorText = 'kleiner als'; break;
                                      case 'between': operatorText = 'zwischen'; break;
                                      default: operatorText = condition.operator || 'gleich';
                                    }
                                    
                                    return (
                                      <div key={idx} className={styles.ruleHoverItem}>
                                        <div className={styles.ruleHoverItemNumber}>{idx + 1}</div>
                                        <div className={styles.ruleHoverItemContent}>
                                          <div className={styles.ruleHoverItemRow}>
                                            <span className={styles.ruleHoverLabel}>Wenn</span>
                                            <span className={styles.ruleHoverValue}>Frage {triggerQ?.order || '?'}</span>
                                            <span className={styles.ruleHoverOperator}>{operatorText}</span>
                                            <span className={styles.ruleHoverAnswer}>"{condition.triggerAnswer}"</span>
                                            {condition.triggerAnswerMax && (
                                              <>
                                                <span className={styles.ruleHoverOperator}>und</span>
                                                <span className={styles.ruleHoverAnswer}>"{condition.triggerAnswerMax}"</span>
                                              </>
                                            )}
                                          </div>
                                          <div className={styles.ruleHoverItemRow}>
                                            <span className={styles.ruleHoverLabel}>Dann</span>
                                            <span className={styles.ruleHoverAction}>
                                              {condition.action === 'hide' ? 'Verstecke' : 'Zeige'}
                                            </span>
                                            <span className={styles.ruleHoverTargets}>
                                              {targetQuestions.length > 0 
                                                ? targetQuestions.map(q => `Frage ${q.order}`).join(', ')
                                                : 'Keine Ziele'
                                              }
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={styles.reviewQuestionBody}>
                        <p className={styles.reviewQuestionText}>{question.questionText}</p>

                        {(question.type === 'single_choice' || question.type === 'multiple_choice') && question.options && question.options.length > 0 && (
                          <div className={styles.reviewOptions}>
                            {question.options.map((option, idx) => (
                              <span key={idx} className={styles.reviewOption}>{option}</span>
                            ))}
                          </div>
                        )}

                        {question.type === 'likert' && question.likertScale && (
                          <div className={styles.reviewLikert}>
                            <span>{question.likertScale.min} ({question.likertScale.minLabel})</span>
                            <span>→</span>
                            <span>{question.likertScale.max} ({question.likertScale.maxLabel})</span>
                          </div>
                        )}

                        {question.type === 'matrix' && question.matrixRows && question.matrixColumns && (
                          <div className={styles.reviewMatrix}>
                            <div><strong>Zeilen:</strong> {question.matrixRows.join(', ')}</div>
                            <div><strong>Spalten:</strong> {question.matrixColumns.join(', ')}</div>
                          </div>
                        )}

                        {question.type === 'open_numeric' && question.numericConstraints && (
                          <div className={styles.reviewNumeric}>
                            {question.numericConstraints.min !== undefined && <span>Min: {question.numericConstraints.min}</span>}
                            {question.numericConstraints.max !== undefined && <span>Max: {question.numericConstraints.max}</span>}
                            {question.numericConstraints.decimals && <span>Dezimalzahlen erlaubt</span>}
                          </div>
                        )}

                        {question.type === 'slider' && question.sliderConfig && (
                          <div className={styles.reviewSlider}>
                            <span>{question.sliderConfig.min} - {question.sliderConfig.max}</span>
                            <span>Schritt: {question.sliderConfig.step}</span>
                            {question.sliderConfig.unit && <span>Einheit: {question.sliderConfig.unit}</span>}
                          </div>
                        )}

                        {question.type === 'photo_upload' && question.instruction && (
                          <div className={styles.reviewInstruction}>
                            <em>{question.instruction}</em>
                          </div>
                        )}

                        {question.conditions && question.conditions.length > 0 && (
                          <div className={styles.reviewConditions}>
                            {question.conditions.map((condition, idx) => {
                              const triggerQ = questions.find(q => q.id === condition.triggerQuestionId);
                              const targetQuestions = questions.filter(q => condition.targetQuestionIds.includes(q.id));
                              
                              return (
                                <div key={idx} className={styles.reviewConditionItem}>
                                  <GitBranch size={12} weight="bold" />
                                  <span>
                                    Wenn Frage {triggerQ?.order} {condition.operator === 'equals' ? '=' : condition.operator === 'greater_than' ? '>' : condition.operator === 'less_than' ? '<' : condition.operator === 'between' ? 'zwischen' : '≠'} "{condition.triggerAnswer}"
                                    {condition.triggerAnswerMax && ` und ${condition.triggerAnswerMax}`}
                                    → {condition.action === 'hide' ? 'Verstecke' : 'Zeige'} {targetQuestions.map(q => `Frage ${q.order}`).join(', ')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.questionsStep}>
              {/* Question Type Toolbar */}
              <div className={styles.questionToolbar}>
                <h3 className={styles.toolbarTitle}>Fragetypen</h3>
                <div className={styles.toolbarButtons}>
                  {(Object.keys(QUESTION_TYPES) as QuestionType[]).map((type) => {
                    const config = QUESTION_TYPES[type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        className={styles.toolbarButton}
                        style={{ borderColor: config.color + '40', color: config.color }}
                        onClick={() => handleAddQuestion(type)}
                        title={config.description}
                      >
                        <Icon size={20} weight="regular" />
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Questions List */}
              <div className={styles.questionsArea}>
                {questions.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Plus size={48} weight="regular" />
                    <p>Fügen Sie Fragen hinzu, indem Sie einen Fragetyp aus der linken Leiste auswählen</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={questions.map(q => q.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className={styles.questionsList}>
                        {questions.map((question) => (
                          <SortableQuestionCard
                            key={question.id}
                            question={question}
                            allQuestions={questions}
                            isEditing={editingQuestionId === question.id}
                            onEdit={() => setEditingQuestionId(editingQuestionId === question.id ? null : question.id)}
                            onUpdate={handleUpdateQuestion}
                            onDelete={handleDeleteQuestion}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - hide on name step since X or click outside works */}
        {step !== 'name' && (
        <div className={styles.modalFooter}>
          {step === 'review' ? (
            <>
              <button className={styles.secondaryButton} onClick={() => setStep('questions')}>
                <ArrowLeft size={18} weight="bold" />
                Zurück zur Bearbeitung
              </button>
              <div className={styles.footerActions}>
                <button className={styles.primaryButton} onClick={handleSaveAndClose}>
                  <Check size={18} weight="bold" />
                  Speichern & Schließen
                </button>
                <button className={styles.secondaryButton} onClick={handleSaveAndCreateAnother}>
                  Speichern & Weiteres Modul erstellen
                </button>
              </div>
            </>
          ) : (
            <>
              <button className={styles.secondaryButton} onClick={() => setStep('name')}>
                <ArrowLeft size={18} weight="bold" />
                Zurück
              </button>
              <div className={styles.footerActions}>
                <button className={styles.primaryButton} onClick={handleGoToReview}>
                  <Check size={18} weight="bold" />
                  Weiter zur Zusammenfassung
                </button>
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* Import Questions Modal */}
      {isImportModalOpen && (
        <div className={styles.importModalOverlay} onClick={() => setIsImportModalOpen(false)}>
          <div className={styles.importModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.importModalHeader}>
              <h3 className={styles.importModalTitle}>Existierende Fragen importieren</h3>
              <button className={styles.closeButton} onClick={() => setIsImportModalOpen(false)}>
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.importModalContent}>
              {/* Search Bar */}
              <input
                type="text"
                className={styles.importSearchInput}
                placeholder="Frage oder Antwort suchen..."
                value={importSearchTerm}
                onChange={(e) => setImportSearchTerm(e.target.value)}
                autoFocus
              />

              {/* Question Type Filter */}
              <div className={styles.importTypeFilter}>
                <div className={styles.typeDropdownWrapper}>
                  {(() => {
                    const selectedConfig = selectedQuestionType !== 'all' ? QUESTION_TYPES[selectedQuestionType] : null;
                    const accentColor = selectedConfig?.color || '#6B7280';
                    return (
                      <>
                        <button 
                          className={styles.typeDropdownButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTypeDropdownOpen(!isTypeDropdownOpen);
                          }}
                          style={selectedQuestionType !== 'all' ? {
                            borderColor: accentColor,
                            color: accentColor,
                            background: `${accentColor}08`,
                            boxShadow: `0 2px 8px ${accentColor}15`,
                          } : {}}
                        >
                          {selectedConfig && (
                            <selectedConfig.icon size={16} weight="regular" />
                          )}
                          <span>{selectedQuestionType === 'all' ? 'Alle Fragetypen' : getQuestionTypeLabel(selectedQuestionType)}</span>
                          <CaretDown size={14} weight="bold" style={{ 
                            transform: isTypeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }} />
                        </button>
                        {isTypeDropdownOpen && (
                          <div className={styles.typeDropdownMenu}>
                            <div
                              className={`${styles.typeDropdownOption} ${selectedQuestionType === 'all' ? styles.typeSelected : ''}`}
                              onClick={() => {
                                setSelectedQuestionType('all');
                                setIsTypeDropdownOpen(false);
                              }}
                            >
                              Alle Fragetypen
                            </div>
                            {(Object.keys(QUESTION_TYPES) as QuestionType[]).map((type) => {
                              const config = QUESTION_TYPES[type];
                              const Icon = config.icon;
                              const isSelected = selectedQuestionType === type;
                              return (
                                <div
                                  key={type}
                                  className={`${styles.typeDropdownOption} ${isSelected ? styles.typeSelected : ''}`}
                                  style={isSelected ? { 
                                    color: config.color,
                                    background: `${config.color}10`,
                                  } : {}}
                                  onClick={() => {
                                    setSelectedQuestionType(type);
                                    setIsTypeDropdownOpen(false);
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = `${config.color}12`;
                                      e.currentTarget.style.color = config.color;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = 'white';
                                      e.currentTarget.style.color = '#374151';
                                    }
                                  }}
                                >
                                  <Icon size={16} weight="regular" />
                                  {config.label}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Questions List */}
              <div className={styles.importQuestionsList}>
                {isLoadingQuestions ? (
                  <div className={styles.importEmptyState}>
                    <div className={styles.loadingSpinner} />
                    <p>Fragen werden geladen...</p>
                  </div>
                ) : filteredImportQuestions.length === 0 ? (
                  <div className={styles.importEmptyState}>
                    <Question size={48} weight="regular" />
                    <p>Keine Fragen gefunden</p>
                  </div>
                ) : (
                  filteredImportQuestions.map((question) => {
                    const config = QUESTION_TYPES[question.type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={question.id}
                        className={styles.importQuestionCard}
                        onClick={() => handleImportQuestion(question)}
                      >
                        <div 
                          className={styles.importQuestionType}
                          style={{ background: config.color }}
                        >
                          <Icon size={16} weight="fill" />
                        </div>
                        <div className={styles.importQuestionContent}>
                          <span className={styles.importQuestionText}>{question.questionText}</span>
                          {question.options && question.options.length > 0 && (
                            <span className={styles.importQuestionOptions}>
                              {question.options.filter(o => o.trim()).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

// Sortable Question Card Component
interface SortableQuestionCardProps {
  question: QuestionInterface;
  allQuestions: QuestionInterface[];
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (id: string, updates: Partial<QuestionInterface>) => void;
  onDelete: (id: string) => void;
}

const SortableQuestionCard: React.FC<SortableQuestionCardProps> = ({
  question,
  allQuestions,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = QUESTION_TYPES[question.type];
  const Icon = config.icon;

  const handleAddOption = () => {
    const newOption = ''; // Empty string instead of default text
    onUpdate(question.id, { options: [...(question.options || []), newOption] });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    onUpdate(question.id, { options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = question.options?.filter((_, i) => i !== index) || [];
    onUpdate(question.id, { options: newOptions });
  };

  const handleAddMatrixRow = () => {
    const newRow = ''; // Empty string instead of default text
    onUpdate(question.id, { matrixRows: [...(question.matrixRows || []), newRow] });
  };

  const handleAddMatrixColumn = () => {
    const newCol = ''; // Empty string instead of default text
    onUpdate(question.id, { matrixColumns: [...(question.matrixColumns || []), newCol] });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.questionCard} ${isEditing ? styles.questionCardEditing : ''}`}
    >
      {/* Collapsed View */}
      {!isEditing && (
        <div className={styles.questionCardCollapsed} onClick={onEdit}>
          <div className={styles.dragHandle} {...attributes} {...listeners}>
            <DotsSixVertical size={20} weight="bold" />
          </div>
          <div className={styles.questionNumber}>{question.order}</div>
          <div className={styles.questionPreview}>
            <div className={styles.questionTypeIndicator} style={{ backgroundColor: config.color + '20', color: config.color }}>
              <Icon size={14} weight="fill" />
              <span>{config.label}</span>
            </div>
            <span className={styles.questionTextPreview}>
              {question.questionText || 'Neue Frage (klicken zum Bearbeiten)'}
            </span>
            {question.conditions && question.conditions.length > 0 && (
              <span className={styles.conditionIndicator} title={`${question.conditions.length} Regel(n)`}>
                <GitBranch size={12} weight="bold" />
              </span>
            )}
          </div>
          {question.required && <span className={styles.requiredBadge}>Pflicht</span>}
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(question.id);
            }}
          >
            <Trash size={18} weight="bold" />
          </button>
        </div>
      )}

      {/* Expanded Edit View */}
      {isEditing && (
        <div className={styles.questionCardExpanded}>
          <div 
            className={styles.questionCardHeader}
            onClick={(e) => {
              // Don't collapse if clicking the delete button
              if (!(e.target as HTMLElement).closest(`.${styles.deleteButton}`)) {
                onEdit();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.dragHandle} {...attributes} {...listeners}>
              <DotsSixVertical size={20} weight="bold" />
            </div>
            <div className={styles.questionNumber}>{question.order}</div>
            <div className={styles.questionTypeIndicator} style={{ backgroundColor: config.color + '20', color: config.color }}>
              <Icon size={14} weight="fill" />
              <span>{config.label}</span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              className={styles.deleteButton}
              onClick={() => onDelete(question.id)}
            >
              <Trash size={18} weight="bold" />
            </button>
          </div>

          <div className={styles.questionEditor}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Fragetext <span className={styles.required}>*</span>
              </label>
              <textarea
                className={styles.textarea}
                value={question.questionText}
                onChange={(e) => onUpdate(question.id, { questionText: e.target.value })}
                placeholder="Geben Sie Ihre Frage ein..."
                rows={2}
                autoFocus
              />
            </div>

            <div className={styles.requiredToggle}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => onUpdate(question.id, { required: e.target.checked })}
                />
                <span>Pflichtfrage</span>
              </label>
            </div>

            {/* Type-specific fields */}
            {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
              <div className={styles.optionsEditor}>
                <label className={styles.label}>Antwortmöglichkeiten</label>
                {question.options?.map((option, index) => (
                  <div key={index} className={styles.optionRow}>
                    <input
                      type="text"
                      className={styles.input}
                      value={option}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    {question.options && question.options.length > 1 && (
                      <button
                        className={styles.removeOptionButton}
                        onClick={() => handleRemoveOption(index)}
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button className={styles.addOptionButton} onClick={handleAddOption}>
                  <Plus size={16} weight="bold" />
                  Option hinzufügen
                </button>
              </div>
            )}

            {question.type === 'likert' && (
              <div className={styles.likertEditor}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Min</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={question.likertScale?.min ?? ''}
                      onChange={(e) => onUpdate(question.id, { 
                        likertScale: { ...question.likertScale!, min: e.target.value ? parseInt(e.target.value) : undefined as any } 
                      })}
                      placeholder="z.B. 1"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Max</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={question.likertScale?.max ?? ''}
                      onChange={(e) => onUpdate(question.id, { 
                        likertScale: { ...question.likertScale!, max: e.target.value ? parseInt(e.target.value) : undefined as any } 
                      })}
                      placeholder="z.B. 5"
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Min Label</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={question.likertScale?.minLabel || ''}
                    onChange={(e) => onUpdate(question.id, { 
                      likertScale: { ...question.likertScale!, minLabel: e.target.value } 
                    })}
                    placeholder="z.B. Sehr schlecht"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Label</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={question.likertScale?.maxLabel || ''}
                    onChange={(e) => onUpdate(question.id, { 
                      likertScale: { ...question.likertScale!, maxLabel: e.target.value } 
                    })}
                    placeholder="z.B. Sehr gut"
                  />
                </div>
              </div>
            )}

            {question.type === 'photo_upload' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Anweisung</label>
                <textarea
                  className={styles.textarea}
                  value={question.instruction || ''}
                  onChange={(e) => onUpdate(question.id, { instruction: e.target.value })}
                  placeholder="z.B. Fotografieren Sie das Display von vorne..."
                  rows={2}
                />
              </div>
            )}

            {question.type === 'matrix' && (
              <div className={styles.matrixEditor}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Zeilen</label>
                  {question.matrixRows?.map((row, index) => (
                    <div key={index} className={styles.optionRow}>
                      <input
                        type="text"
                        className={styles.input}
                        value={row}
                        onChange={(e) => {
                          const newRows = [...(question.matrixRows || [])];
                          newRows[index] = e.target.value;
                          onUpdate(question.id, { matrixRows: newRows });
                        }}
                        placeholder={`Zeile ${index + 1}`}
                      />
                      {question.matrixRows && question.matrixRows.length > 1 && (
                        <button
                          className={styles.removeOptionButton}
                          onClick={() => {
                            const newRows = question.matrixRows?.filter((_, i) => i !== index) || [];
                            onUpdate(question.id, { matrixRows: newRows });
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className={styles.addOptionButton} onClick={handleAddMatrixRow}>
                    <Plus size={16} weight="bold" />
                    Zeile hinzufügen
                  </button>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Spalten</label>
                  {question.matrixColumns?.map((col, index) => (
                    <div key={index} className={styles.optionRow}>
                      <input
                        type="text"
                        className={styles.input}
                        value={col}
                        onChange={(e) => {
                          const newCols = [...(question.matrixColumns || [])];
                          newCols[index] = e.target.value;
                          onUpdate(question.id, { matrixColumns: newCols });
                        }}
                        placeholder={`Spalte ${index + 1}`}
                      />
                      {question.matrixColumns && question.matrixColumns.length > 1 && (
                        <button
                          className={styles.removeOptionButton}
                          onClick={() => {
                            const newCols = question.matrixColumns?.filter((_, i) => i !== index) || [];
                            onUpdate(question.id, { matrixColumns: newCols });
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className={styles.addOptionButton} onClick={handleAddMatrixColumn}>
                    <Plus size={16} weight="bold" />
                    Spalte hinzufügen
                  </button>
                </div>
              </div>
            )}

            {question.type === 'open_numeric' && (
              <div className={styles.numericEditor}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Min (optional)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={question.numericConstraints?.min || ''}
                      onChange={(e) => onUpdate(question.id, { 
                        numericConstraints: { 
                          ...question.numericConstraints, 
                          min: e.target.value ? parseFloat(e.target.value) : undefined 
                        } 
                      })}
                      placeholder="Minimalwert"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Max (optional)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={question.numericConstraints?.max || ''}
                      onChange={(e) => onUpdate(question.id, { 
                        numericConstraints: { 
                          ...question.numericConstraints, 
                          max: e.target.value ? parseFloat(e.target.value) : undefined 
                        } 
                      })}
                      placeholder="Maximalwert"
                    />
                  </div>
                </div>
                <div className={styles.requiredToggle}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={question.numericConstraints?.decimals || false}
                      onChange={(e) => onUpdate(question.id, { 
                        numericConstraints: { ...question.numericConstraints, decimals: e.target.checked } 
                      })}
                    />
                    <span>Dezimalzahlen erlauben</span>
                  </label>
                </div>
              </div>
            )}

            {question.type === 'slider' && (
              <div className={styles.sliderEditor}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Min</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={question.sliderConfig?.min ?? ''}
                      onChange={(e) => onUpdate(question.id, { 
                        sliderConfig: { ...question.sliderConfig!, min: e.target.value ? parseFloat(e.target.value) : undefined as any } 
                      })}
                      placeholder="z.B. 0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Max</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={question.sliderConfig?.max ?? ''}
                      onChange={(e) => onUpdate(question.id, { 
                        sliderConfig: { ...question.sliderConfig!, max: e.target.value ? parseFloat(e.target.value) : undefined as any } 
                      })}
                      placeholder="z.B. 100"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Schritt</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={question.sliderConfig?.step ?? ''}
                      onChange={(e) => onUpdate(question.id, { 
                        sliderConfig: { ...question.sliderConfig!, step: e.target.value ? parseFloat(e.target.value) : undefined as any } 
                      })}
                      placeholder="z.B. 1"
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Einheit (optional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={question.sliderConfig?.unit || ''}
                    onChange={(e) => onUpdate(question.id, { 
                      sliderConfig: { ...question.sliderConfig!, unit: e.target.value } 
                    })}
                    placeholder="z.B. %, €, kg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Conditional Logic Section */}
          <ConditionalLogicEditor
            question={question}
            allQuestions={allQuestions}
            onUpdate={onUpdate}
          />
        </div>
      )}
    </div>
  );
};

// Conditional Logic Editor Component
interface ConditionalLogicEditorProps {
  question: QuestionInterface;
  allQuestions: QuestionInterface[];
  onUpdate: (id: string, updates: Partial<QuestionInterface>) => void;
}

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, options, onChange, disabled, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={styles.customDropdown}>
      <button
        type="button"
        className={`${styles.customDropdownButton} ${isOpen ? styles.customDropdownButtonOpen : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={styles.customDropdownButtonText}>
          {selectedOption?.label || placeholder || 'Wählen...'}
        </span>
        <CaretDown size={14} weight="bold" className={`${styles.customDropdownIcon} ${isOpen ? styles.customDropdownIconOpen : ''}`} />
      </button>
      {isOpen && !disabled && (
        <>
          <div className={styles.customDropdownOverlay} onClick={() => setIsOpen(false)} />
          <div className={styles.customDropdownMenu}>
            {options.map((option) => (
              <div
                key={option.value}
                className={`${styles.customDropdownOption} ${option.value === value ? styles.customDropdownOptionSelected : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ConditionalLogicEditor: React.FC<ConditionalLogicEditorProps> = ({
  question,
  allQuestions,
  onUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get questions that can be used as triggers (questions with evaluable answers)
  // Include current question and all previous questions with selectable answer types
  const triggerableQuestions = allQuestions.filter(q => 
    q.order <= question.order && 
    (q.type === 'single_choice' || 
     q.type === 'yesno' || 
     q.type === 'multiple_choice' || 
     q.type === 'likert' ||
     q.type === 'matrix' ||
     q.type === 'open_numeric' ||
     q.type === 'slider')
  );

  // Get questions that can be targeted (only those after this question)
  const targetableQuestions = allQuestions.filter(q => q.order > question.order);

  const handleAddCondition = () => {
    const newCondition: QuestionCondition = {
      id: `cond-${Date.now()}`,
      triggerQuestionId: triggerableQuestions[0]?.id || '',
      triggerAnswer: '',
      operator: 'equals',
      action: 'hide',
      targetQuestionIds: [],
    };
    onUpdate(question.id, {
      conditions: [...(question.conditions || []), newCondition]
    });
    setIsExpanded(true);
  };

  const handleUpdateCondition = (conditionId: string, updates: Partial<QuestionCondition>) => {
    const updatedConditions = question.conditions?.map(c =>
      c.id === conditionId ? { ...c, ...updates } : c
    ) || [];
    onUpdate(question.id, { conditions: updatedConditions });
  };

  const handleRemoveCondition = (conditionId: string) => {
    const updatedConditions = question.conditions?.filter(c => c.id !== conditionId) || [];
    onUpdate(question.id, { conditions: updatedConditions });
  };

  const handleToggleTargetQuestion = (conditionId: string, targetId: string) => {
    const condition = question.conditions?.find(c => c.id === conditionId);
    if (!condition) return;

    const isSelected = condition.targetQuestionIds.includes(targetId);
    const newTargetIds = isSelected
      ? condition.targetQuestionIds.filter(id => id !== targetId)
      : [...condition.targetQuestionIds, targetId];

    handleUpdateCondition(conditionId, { targetQuestionIds: newTargetIds });
  };

  const getTriggerQuestionAnswers = (triggerQuestionId: string): string[] => {
    const triggerQ = allQuestions.find(q => q.id === triggerQuestionId);
    if (!triggerQ) return [];

    if (triggerQ.type === 'yesno') {
      return ['Ja', 'Nein'];
    } else if (triggerQ.type === 'single_choice' || triggerQ.type === 'multiple_choice') {
      return triggerQ.options || [];
    } else if (triggerQ.type === 'likert') {
      const scale = triggerQ.likertScale;
      if (!scale) return [];
      const answers = [];
      for (let i = scale.min; i <= scale.max; i++) {
        answers.push(i.toString());
      }
      return answers;
    } else if (triggerQ.type === 'matrix') {
      // For matrix, combine rows and columns as "Row: Column" format
      const rows = triggerQ.matrixRows || [];
      const cols = triggerQ.matrixColumns || [];
      const answers: string[] = [];
      rows.forEach(row => {
        cols.forEach(col => {
          if (row && col) {
            answers.push(`${row}: ${col}`);
          }
        });
      });
      return answers;
    }
    // For numeric and slider, we don't return predefined answers - they use operators
    return [];
  };

  const getAvailableOperators = (triggerQuestionId: string): Array<{value: string, label: string}> => {
    const triggerQ = allQuestions.find(q => q.id === triggerQuestionId);
    if (!triggerQ) return [{ value: 'equals', label: 'ist gleich' }];

    // Single choice, multiple choice, yesno, likert, matrix - use equals/not_equals
    if (triggerQ.type === 'single_choice' || 
        triggerQ.type === 'multiple_choice' || 
        triggerQ.type === 'yesno' || 
        triggerQ.type === 'likert' ||
        triggerQ.type === 'matrix') {
      return [
        { value: 'equals', label: 'ist gleich' },
        { value: 'not_equals', label: 'ist nicht gleich' }
      ];
    }

    // Numeric and slider - use numeric operators
    if (triggerQ.type === 'open_numeric' || triggerQ.type === 'slider') {
      return [
        { value: 'equals', label: 'ist gleich' },
        { value: 'not_equals', label: 'ist nicht gleich' },
        { value: 'greater_than', label: 'ist größer als' },
        { value: 'less_than', label: 'ist kleiner als' },
        { value: 'between', label: 'ist zwischen' }
      ];
    }

    return [{ value: 'equals', label: 'ist gleich' }];
  };

  const requiresAnswerInput = (triggerQuestionId: string, _operator: string): boolean => {
    const triggerQ = allQuestions.find(q => q.id === triggerQuestionId);
    if (!triggerQ) return false;
    
    // Numeric and slider always need manual input
    if (triggerQ.type === 'open_numeric' || triggerQ.type === 'slider') {
      return true;
    }
    
    return false;
  };

  const requiresSecondInput = (operator: string): boolean => {
    return operator === 'between';
  };

  const hasConditions = question.conditions && question.conditions.length > 0;

  return (
    <div className={styles.conditionalLogicSection}>
      <div className={styles.conditionalLogicHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.conditionalLogicTitle}>
          <GitBranch size={16} weight="bold" />
          <span>Bedingte Logik</span>
          {hasConditions && (
            <span className={styles.conditionBadge}>
              {question.conditions?.length} {question.conditions?.length === 1 ? 'Regel' : 'Regeln'}
            </span>
          )}
        </div>
        <span className={styles.expandIcon}>{isExpanded ? '−' : '+'}</span>
      </div>

      {isExpanded && (
        <div className={styles.conditionalLogicContent}>
          <p className={styles.conditionalLogicDescription}>
            Definieren Sie Regeln, um Folgefragen basierend auf Antworten anderer Fragen anzuzeigen oder zu verstecken.
          </p>

          {triggerableQuestions.length === 0 && (!question.conditions || question.conditions.length === 0) && (
            <div className={styles.noTriggerQuestionsMessage}>
              <GitBranch size={32} weight="regular" />
              <p>Fügen Sie zuerst Fragen mit auswählbaren Antworten hinzu (Single Choice, Multiple Choice, Ja/Nein, Likert-Skala) bevor diese Frage, um Regeln erstellen zu können.</p>
            </div>
          )}

          {question.conditions?.map((condition) => {
            const availableAnswers = getTriggerQuestionAnswers(condition.triggerQuestionId);
            const availableOperators = getAvailableOperators(condition.triggerQuestionId);
            const needsManualInput = requiresAnswerInput(condition.triggerQuestionId, condition.operator || 'equals');
            const needsSecondInput = requiresSecondInput(condition.operator || 'equals');

            return (
              <div key={condition.id} className={styles.conditionRule}>
                <div className={styles.conditionRuleHeader}>
                  <span className={styles.conditionRuleTitle}>Regel</span>
                  <button
                    className={styles.removeConditionButton}
                    onClick={() => handleRemoveCondition(condition.id)}
                    title="Regel löschen"
                  >
                    <Trash size={14} />
                  </button>
                </div>

                <div className={styles.conditionBuilder}>
                  <div className={styles.conditionRow}>
                    <label className={styles.conditionLabel}>Wenn Frage</label>
                    <CustomDropdown
                      value={condition.triggerQuestionId}
                      options={triggerableQuestions.length === 0 
                        ? [{ value: '', label: 'Keine Fragen verfügbar' }]
                        : triggerableQuestions.map(q => ({
                            value: q.id,
                            label: `Frage ${q.order}: ${q.questionText || 'Unbenannt'}`
                          }))
                      }
                      onChange={(value) => handleUpdateCondition(condition.id, { 
                        triggerQuestionId: value,
                        triggerAnswer: '',
                        operator: 'equals'
                      })}
                      disabled={triggerableQuestions.length === 0}
                      placeholder="Frage wählen"
                    />
                  </div>

                  {availableOperators.length > 1 && (
                    <div className={styles.conditionRow}>
                      <label className={styles.conditionLabel}>Operator</label>
                      <CustomDropdown
                        value={condition.operator || 'equals'}
                        options={availableOperators}
                        onChange={(value) => handleUpdateCondition(condition.id, { 
                          operator: value as any,
                          triggerAnswer: '',
                          triggerAnswerMax: undefined
                        })}
                      />
                    </div>
                  )}

                  <div className={styles.conditionRow}>
                    <label className={styles.conditionLabel}>
                      {needsSecondInput ? 'Wert von' : 'Antwort'}
                    </label>
                    {needsManualInput ? (
                      <input
                        type="number"
                        className={styles.conditionSelect}
                        value={condition.triggerAnswer}
                        onChange={(e) => handleUpdateCondition(condition.id, { triggerAnswer: e.target.value })}
                        placeholder="Wert eingeben"
                      />
                    ) : (
                      <CustomDropdown
                        value={String(condition.triggerAnswer ?? '')}
                        options={[
                          { value: '', label: '-- Antwort wählen --' },
                          ...availableAnswers.map(answer => ({ value: answer, label: answer }))
                        ]}
                        onChange={(value) => handleUpdateCondition(condition.id, { triggerAnswer: value })}
                        disabled={!condition.triggerQuestionId || availableAnswers.length === 0}
                        placeholder="Antwort wählen"
                      />
                    )}
                  </div>

                  {needsSecondInput && (
                    <div className={styles.conditionRow}>
                      <label className={styles.conditionLabel}>Wert bis</label>
                      <input
                        type="number"
                        className={styles.conditionSelect}
                        value={condition.triggerAnswerMax || ''}
                        onChange={(e) => handleUpdateCondition(condition.id, { triggerAnswerMax: parseFloat(e.target.value) })}
                        placeholder="Maximalwert"
                      />
                    </div>
                  )}

                  <div className={styles.conditionRow}>
                    <label className={styles.conditionLabel}>Dann</label>
                    <CustomDropdown
                      value={condition.action}
                      options={[
                        { value: 'hide', label: 'Verstecke Fragen' },
                        { value: 'show', label: 'Zeige Fragen' }
                      ]}
                      onChange={(value) => handleUpdateCondition(condition.id, { action: value as 'hide' | 'show' })}
                    />
                  </div>

                  <div className={styles.conditionTargets}>
                    <label className={styles.conditionLabel}>Betroffene Fragen:</label>
                    <div className={styles.targetQuestionsList}>
                      {targetableQuestions.length === 0 ? (
                        <span className={styles.noTargetsMessage}>
                          Keine Fragen verfügbar (Fragen müssen nach dieser Frage kommen)
                        </span>
                      ) : (
                        targetableQuestions.map(q => (
                          <label key={q.id} className={styles.targetQuestionItem}>
                            <input
                              type="checkbox"
                              checked={condition.targetQuestionIds.includes(q.id)}
                              onChange={() => handleToggleTargetQuestion(condition.id, q.id)}
                            />
                            <span>Frage {q.order}: {q.questionText || 'Unbenannt'}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {triggerableQuestions.length > 0 && (
            <button className={styles.addConditionButton} onClick={handleAddCondition}>
              <Plus size={16} weight="bold" />
              Regel hinzufügen
            </button>
          )}
        </div>
      )}
    </div>
  );
};

