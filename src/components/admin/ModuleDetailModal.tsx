import React, { useState, useEffect } from 'react';
import { X, PencilSimple, Stack, Question, CheckCircle, Eye, CircleNotch } from '@phosphor-icons/react';
import { FragebogenPreviewModal } from './FragebogenPreviewModal';
import fragebogenService from '../../services/fragebogenService';
import styles from './ModuleDetailModal.module.css';

interface QuestionCondition {
  id: string;
  triggerQuestionId: string;
  triggerAnswer: string | number;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
  triggerAnswerMax?: number;
  action: 'hide' | 'show';
  targetQuestionIds: string[];
}

interface QuestionData {
  id: string;
  moduleId: string;
  type: 'text' | 'textarea' | 'multiple_choice' | 'checkbox' | 'rating' | 'yesno' | 'slider' | 'image' | 'open_numeric' | 'dropdown' | 'single_choice' | 'likert' | 'photo_upload' | 'matrix' | 'open_text' | 'barcode_scanner';
  questionText: string;
  instruction?: string;
  required: boolean;
  order: number;
  options?: string[];
  likertScale?: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
  matrixRows?: string[];
  matrixColumns?: string[];
  numericConstraints?: {
    min?: number;
    max?: number;
    decimals?: boolean;
  };
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
    unit?: string;
  };
  conditions?: QuestionCondition[];
}

interface Module {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  questions: QuestionData[];
  createdAt: string;
}

interface ModuleDetailModalProps {
  module: Module;
  usageCount: number;
  onClose: () => void;
  onEdit?: (module: Module) => void;
}

export const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({ 
  module: initialModule, 
  usageCount,
  onClose,
  onEdit
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [module, setModule] = useState<Module>(initialModule);

  // Load full module data with questions
  useEffect(() => {
    const loadModuleDetails = async () => {
      setIsLoading(true);
      try {
        const fullModule = await fragebogenService.modules.getById(initialModule.id);
        
        // Build a map from local_id to question_id for rule transformation
        const localIdToQuestionId: Record<string, string> = {};
        const questionIdFromLocalId: Record<string, string> = {};
        (fullModule.questions || []).forEach((mq: any) => {
          if (mq.local_id && mq.question?.id) {
            localIdToQuestionId[mq.local_id] = mq.question.id;
            questionIdFromLocalId[mq.question.id] = mq.local_id;
          }
        });
        
        // Transform rules into conditions attached to the first target question
        const rulesByQuestion: Record<string, QuestionCondition[]> = {};
        (fullModule.rules || []).forEach((rule: any) => {
          const triggerQuestionId = localIdToQuestionId[rule.trigger_local_id] || '';
          const targetQuestionIds = (rule.target_local_ids || []).map((lid: string) => localIdToQuestionId[lid] || '');
          
          // Attach the condition to the first target question (for display purposes)
          // But the condition affects all target questions
          const condition: QuestionCondition = {
            id: rule.id,
            triggerQuestionId,
            triggerAnswer: rule.trigger_answer,
            operator: rule.operator || 'equals',
            triggerAnswerMax: rule.trigger_answer_max ? Number(rule.trigger_answer_max) : undefined,
            action: rule.action,
            targetQuestionIds
          };
          
          // Attach to the trigger question (that's where rules are defined)
          if (!rulesByQuestion[triggerQuestionId]) {
            rulesByQuestion[triggerQuestionId] = [];
          }
          rulesByQuestion[triggerQuestionId].push(condition);
        });
        
        // Transform API response to component format
        const transformedModule: Module = {
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
        };
        
        setModule(transformedModule);
      } catch (error) {
        console.error('Failed to load module details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModuleDetails();
  }, [initialModule.id]);

  const getQuestionTypeLabel = (type: QuestionData['type']) => {
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

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.moduleIcon}>
              <Stack size={24} weight="fill" />
            </div>
            <div className={styles.headerInfo}>
              <h2 className={styles.modalTitle}>{module.name}</h2>
              <span className={styles.questionCount}>
                <Question size={14} weight="fill" />
                {module.questions.length} {module.questions.length === 1 ? 'Frage' : 'Fragen'}
              </span>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <CircleNotch size={32} weight="bold" className={styles.spinner} />
              <span>Lade Fragen...</span>
            </div>
          ) : (
            <>
              {module.description && (
                <div className={styles.moduleDescription}>
                  {module.description}
                </div>
              )}

              <div className={styles.questionsList}>
                {module.questions.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Question size={48} weight="regular" />
                    <p>Keine Fragen in diesem Modul</p>
                  </div>
                ) : (
                  module.questions.map((question, index) => (
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
            ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.usageInfo}>
            <CheckCircle size={16} weight="fill" />
            <span>Verwendet in {usageCount} {usageCount === 1 ? 'Fragebogen' : 'Fragebögen'}</span>
          </div>
          <div className={styles.footerButtons}>
            <button className={styles.previewButton} onClick={() => setIsPreviewOpen(true)}>
              <Eye size={18} weight="bold" />
              Vorschau
            </button>
            <button 
              className={styles.editButton}
              onClick={() => {
                if (onEdit && !isLoading) {
                  onEdit(module);
                  onClose();
                }
              }}
              disabled={isLoading}
            >
              <PencilSimple size={18} weight="bold" />
              Modul bearbeiten
            </button>
            <button className={styles.secondaryButton} onClick={onClose}>
              Schließen
            </button>
          </div>
        </div>

        {/* Preview Modal */}
        {isPreviewOpen && (
          <FragebogenPreviewModal
            title={module.name}
            modules={[{
              id: module.id,
              name: module.name,
              description: module.description,
              questions: module.questions.map(q => ({
                ...q,
                type: q.type as any
              }))
            }]}
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

