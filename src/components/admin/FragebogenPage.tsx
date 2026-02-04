import React, { useState, useEffect } from 'react';
import { TrendUp, Clock, XCircle, Stack, PencilSimple, Calendar, Users, CheckCircle as CheckCircleFilled, Question, CircleNotch, Copy, Trash, Warning } from '@phosphor-icons/react';
import { FragebogenDetailModal } from './FragebogenDetailModal';
import { ModuleDetailModal } from './ModuleDetailModal';
import { CreateModuleModal } from './CreateModuleModal';
import { CreateFragebogenModal } from './CreateFragebogenModal';
import { QUESTION_TYPES } from './questionTypes';
import fragebogenService from '../../services/fragebogenService';
import type { Module as ApiModule } from '../../services/fragebogenService';
import styles from './FragebogenPage.module.css';

export type QuestionType = 
  | 'single_choice'      // Single Choice
  | 'yesno'              // Dichotomes Ja/Nein
  | 'likert'             // Likert-Skala (Sehr schlecht bis Sehr gut)
  | 'multiple_choice'    // Multiple Choice
  | 'photo_upload'       // Foto hochladen
  | 'matrix'             // Matrix (Fragezeilen mit Antwortspalten)
  | 'open_text'          // Offene Frage
  | 'open_numeric'       // Offene Frage numerisch
  | 'slider'             // Slider für Anteile
  | 'barcode_scanner';   // Barcode/QR-Code Scanner

export interface QuestionInterface {
  id: string;
  moduleId: string;
  type: QuestionType;
  questionText: string;
  instruction?: string;  // For photo_upload
  required: boolean;
  order: number;
  
  // For single/multiple choice, likert
  options?: string[];
  
  // For likert scale
  likertScale?: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
  
  // For matrix
  matrixRows?: string[];
  matrixColumns?: string[];
  
  // For numeric
  numericConstraints?: {
    min?: number;
    max?: number;
    decimals?: boolean;
  };
  
  // For slider
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
    unit?: string;
  };
  
  // Conditional logic
  conditions?: QuestionCondition[];
}

export interface QuestionCondition {
  id: string;
  triggerQuestionId: string;  // Which question's answer triggers this
  triggerAnswer: string | number;  // What answer triggers this
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';  // Comparison operator
  triggerAnswerMax?: number;  // For 'between' operator
  action: 'hide' | 'show';  // What to do
  targetQuestionIds: string[];  // Which questions to affect
}

export interface Module {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  questions: QuestionInterface[];
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
  marketIds: string[]; // Array of selected market IDs
  assignedGLCount: number;
  responseCount: number;
  createdAt: string;
}

interface FragebogenPageProps {
  isCreateModuleModalOpen: boolean;
  onCloseCreateModuleModal: () => void;
  isCreateFragebogenModalOpen: boolean;
  onCloseCreateFragebogenModal: () => void;
}

export const FragebogenPage: React.FC<FragebogenPageProps> = ({
  isCreateModuleModalOpen,
  onCloseCreateModuleModal,
  isCreateFragebogenModalOpen,
  onCloseCreateFragebogenModal
}) => {
  // Data states
  const [modules, setModules] = useState<Module[]>([]);
  const [fragebogenList, setFragebogenList] = useState<Fragebogen[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [selectedQuestionTypeFilter, setSelectedQuestionTypeFilter] = useState<QuestionType | 'all'>('all');
  const [isQuestionTypeDropdownOpen, setIsQuestionTypeDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load modules, fragebogen, and questions in parallel
        const [modulesResponse, fragebogenResponse, questionsResponse] = await Promise.all([
          fragebogenService.modules.getAll(),
          fragebogenService.fragebogen.getAll(),
          fragebogenService.questions.getAll()
        ]);

        // Transform modules from API format to component format
        const transformedModules: Module[] = modulesResponse.map((m: ApiModule) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          questionCount: m.question_count || 0,
          questions: (m.questions || []).map((mq: { question: { id: string; type: string; question_text: string; instruction?: string; options?: string[]; likert_scale?: any; matrix_config?: any; numeric_constraints?: any; slider_config?: any }; required: boolean; order_index: number }) => ({
            id: mq.question.id,
            moduleId: m.id,
            type: mq.question.type as QuestionType,
            questionText: mq.question.question_text,
            instruction: mq.question.instruction,
            required: mq.required,
            order: mq.order_index,
            options: mq.question.options,
            likertScale: mq.question.likert_scale,
            matrixRows: mq.question.matrix_config?.rows,
            matrixColumns: mq.question.matrix_config?.columns,
            numericConstraints: mq.question.numeric_constraints,
            sliderConfig: mq.question.slider_config
          })),
          createdAt: m.created_at
        }));

        // Transform fragebogen from API format to component format
        // The API now returns module_ids and market_ids arrays directly
        const transformedFragebogen: Fragebogen[] = fragebogenResponse.map((f: any) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          startDate: f.start_date,
          endDate: f.end_date,
          status: f.status,
          moduleIds: f.module_ids || [],
          marketIds: f.market_ids || [],
          assignedGLCount: f.market_count || (f.market_ids || []).length,
          responseCount: f.response_count || 0,
          createdAt: f.created_at
        }));

        setModules(transformedModules);
        setFragebogenList(transformedFragebogen);
        setAllQuestions(questionsResponse);
        console.log('Loaded questions:', questionsResponse.length, questionsResponse);
      } catch (err) {
        console.error('Failed to load fragebogen data:', err);
        setError('Fehler beim Laden der Daten. Bitte versuchen Sie es erneut.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const [selectedFragebogen, setSelectedFragebogen] = useState<Fragebogen | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [editingFragebogen, setEditingFragebogen] = useState<Fragebogen | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [duplicatingModule, setDuplicatingModule] = useState<Module | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; module: Module } | null>(null);
  const [fragebogenContextMenu, setFragebogenContextMenu] = useState<{ x: number; y: number; fragebogen: Fragebogen } | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [moduleUsageInfo, setModuleUsageInfo] = useState<{
    activeFragebogen: Array<{ id: string; name: string; status: string }>;
    inactiveFragebogen: Array<{ id: string; name: string; status: string }>;
    totalUsage: number;
  } | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [fragebogenToDelete, setFragebogenToDelete] = useState<Fragebogen | null>(null);
  const [moduleDeleteConfirmStep, setModuleDeleteConfirmStep] = useState<{ active: boolean; deleteQuestions: boolean }>({ active: false, deleteQuestions: false });

  const activeFragebogen = fragebogenList.filter(f => f.status === 'active');
  const scheduledFragebogen = fragebogenList.filter(f => f.status === 'scheduled');
  const inactiveFragebogen = fragebogenList.filter(f => f.status === 'inactive');

  // Handle market updates for a fragebogen
  const handleUpdateFragebogenMarkets = async (fragebogenId: string, marketIds: string[]) => {
    try {
      // Call the API to save market changes to database
      await fragebogenService.fragebogen.update(fragebogenId, { market_ids: marketIds });
      
      // Update local state
      setFragebogenList(prev => 
        prev.map(f => 
          f.id === fragebogenId 
            ? { ...f, marketIds }
            : f
        )
      );
      // Also update selected fragebogen if it's the one being edited
      if (selectedFragebogen && selectedFragebogen.id === fragebogenId) {
        setSelectedFragebogen(prev => prev ? { ...prev, marketIds } : null);
      }
      console.log(`✅ Updated markets for fragebogen ${fragebogenId}`);
    } catch (error) {
      console.error('Error updating fragebogen markets:', error);
      alert('Fehler beim Speichern der Märkte');
    }
  };

  // Handle archiving/activating a fragebogen
  const handleToggleArchiveFragebogen = async (fragebogenId: string) => {
    try {
      const fragebogen = fragebogenList.find(f => f.id === fragebogenId);
      if (!fragebogen) return;
      
      // Determine new archived state (toggle)
      const isCurrentlyArchived = fragebogen.status === 'inactive';
      const newArchivedState = !isCurrentlyArchived;
      
      // Call the API to archive/unarchive
      await fragebogenService.fragebogen.archive(fragebogenId, newArchivedState);
      
      // Update local state
      setFragebogenList(prev => 
        prev.map(f => {
          if (f.id === fragebogenId) {
            const newStatus = newArchivedState ? 'inactive' : 'active';
            return { ...f, status: newStatus };
          }
          return f;
        })
      );
      
      console.log(`${newArchivedState ? 'Archived' : 'Activated'} fragebogen: ${fragebogenId}`);
    } catch (error) {
      console.error('Failed to toggle fragebogen archive status:', error);
      alert('Fehler beim Ändern des Archivstatus. Bitte versuchen Sie es erneut.');
    }
  };

  const handleEditFragebogen = (fragebogen: Fragebogen) => {
    setEditingFragebogen(fragebogen);
    onCloseCreateFragebogenModal(); // Close if creation modal was open
  };

  const handleUpdateFragebogen = async (updatedFragebogen: Fragebogen) => {
    try {
      // Call the API to save changes to database
      await fragebogenService.fragebogen.update(updatedFragebogen.id, {
        name: updatedFragebogen.name,
        description: updatedFragebogen.description,
        start_date: updatedFragebogen.startDate,
        end_date: updatedFragebogen.endDate,
        status: updatedFragebogen.status,
        module_ids: updatedFragebogen.moduleIds,
        market_ids: updatedFragebogen.marketIds
      });
      
      // Update local state
      setFragebogenList(prev => 
        prev.map(f => f.id === updatedFragebogen.id ? updatedFragebogen : f)
      );
      setEditingFragebogen(null);
      console.log(`✅ Updated fragebogen ${updatedFragebogen.id}`);
    } catch (error) {
      console.error('Error updating fragebogen:', error);
      alert('Fehler beim Speichern des Fragebogens');
    }
  };

  const handleEditModule = async (module: Module) => {
    try {
      // Fetch full module data with questions
      const fullModule = await fragebogenService.modules.getById(module.id);
      
      // Transform API response to component format
      const localIdToQuestionId: Record<string, string> = {};
      (fullModule.questions || []).forEach((mq: any) => {
        if (mq.local_id && mq.question?.id) {
          localIdToQuestionId[mq.local_id] = mq.question.id;
        }
      });
      
      // Transform rules into conditions attached to questions
      const rulesByQuestion: Record<string, QuestionCondition[]> = {};
      (fullModule.rules || []).forEach((rule: any) => {
        const triggerQuestionId = localIdToQuestionId[rule.trigger_local_id] || '';
        const targetQuestionIds = (rule.target_local_ids || []).map((lid: string) => localIdToQuestionId[lid] || '');
        
        const condition: QuestionCondition = {
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
      
      const editableModule: Module = {
        id: fullModule.id,
        name: fullModule.name,
        description: fullModule.description,
        questionCount: (fullModule.questions || []).length,
        questions: (fullModule.questions || []).map((mq: any) => ({
          id: mq.question?.id || mq.id,
          moduleId: fullModule.id,
          type: mq.question?.type as QuestionType || 'open_text',
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
      
      setEditingModule(editableModule);
      onCloseCreateModuleModal(); // Close if creation modal was open
    } catch (error) {
      console.error('Failed to load module for editing:', error);
      alert('Fehler beim Laden des Moduls. Bitte versuchen Sie es erneut.');
    }
  };

  const handleUpdateModule = async (updatedModule: Module) => {
    try {
      // Helper to check if an ID is a temporary frontend ID (not from database)
      const isTempId = (id: string) => id.startsWith('q-') || id.startsWith('temp-');
      
      // Separate existing questions from new questions
      const existingQuestions = updatedModule.questions.filter(q => !isTempId(q.id));
      const newQuestions = updatedModule.questions.filter(q => isTempId(q.id));
      
      // Maps for tracking ID changes
      const newQuestionIdMap: Record<string, string> = {}; // Maps temp/old ID to new real ID
      
      // Step 1: Process existing questions with COPY-ON-WRITE logic
      // If a question is used by multiple modules, create a new copy instead of updating
      for (const question of existingQuestions) {
        // Check how many modules use this question
        const { moduleCount } = await fragebogenService.questions.getModuleCount(question.id);
        
        if (moduleCount > 1) {
          // Question is shared - create a NEW question (copy-on-write)
          const questionPayload = {
            type: question.type,
            question_text: question.questionText,
            instruction: question.instruction,
            is_template: false,
            options: question.options,
            likert_scale: question.likertScale,
            matrix_config: question.matrixRows && question.matrixColumns ? {
              rows: question.matrixRows,
              columns: question.matrixColumns
            } : undefined,
            numeric_constraints: question.numericConstraints,
            slider_config: question.sliderConfig
          };
          
          const createdQuestion = await fragebogenService.questions.create(questionPayload);
          newQuestionIdMap[question.id] = createdQuestion.id; // Map old ID to new ID
          console.log(`Copy-on-write: Question ${question.id} is used by ${moduleCount} modules, created new question ${createdQuestion.id}`);
        } else {
          // Question is only used by this module - update it in place
          await fragebogenService.questions.update(question.id, {
            type: question.type,
            question_text: question.questionText,
            instruction: question.instruction,
            options: question.options,
            likert_scale: question.likertScale,
            matrix_config: question.matrixRows && question.matrixColumns ? {
              rows: question.matrixRows,
              columns: question.matrixColumns
            } : undefined,
            numeric_constraints: question.numericConstraints,
            slider_config: question.sliderConfig
          });
        }
      }
      
      // Step 2: Create brand new questions (temp IDs)
      for (const question of newQuestions) {
        const questionPayload = {
          type: question.type,
          question_text: question.questionText,
          instruction: question.instruction,
          is_template: false,
          options: question.options,
          likert_scale: question.likertScale,
          matrix_config: question.matrixRows && question.matrixColumns ? {
            rows: question.matrixRows,
            columns: question.matrixColumns
          } : undefined,
          numeric_constraints: question.numericConstraints,
          slider_config: question.sliderConfig
        };
        
        const createdQuestion = await fragebogenService.questions.create(questionPayload);
        newQuestionIdMap[question.id] = createdQuestion.id;
      }
      
      // Step 3: Build question references for the module update
      // Check newQuestionIdMap for both temp IDs AND forked existing questions (copy-on-write)
      const questionRefs = updatedModule.questions.map((q, idx) => ({
        question_id: newQuestionIdMap[q.id] || q.id, // Use mapped ID if exists, otherwise original
        order_index: q.order || idx + 1,
        required: q.required,
        local_id: `local-${q.order || idx + 1}`
      }));
      
      // Step 4: Build a map for rule transformation
      const questionIdToLocalId: Record<string, string> = {};
      updatedModule.questions.forEach((q, idx) => {
        const realId = newQuestionIdMap[q.id] || q.id; // Use mapped ID if exists
        questionIdToLocalId[q.id] = `local-${q.order || idx + 1}`;
        questionIdToLocalId[realId] = `local-${q.order || idx + 1}`;
      });
      
      // Step 5: Transform rules/conditions
      type OperatorType = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
      const rules: Array<{
        trigger_local_id: string;
        trigger_answer: string;
        operator: OperatorType;
        trigger_answer_max?: string;
        action: 'hide' | 'show';
        target_local_ids: string[];
      }> = [];
      
      for (const question of updatedModule.questions) {
        if (question.conditions && question.conditions.length > 0) {
          for (const condition of question.conditions) {
            rules.push({
              trigger_local_id: questionIdToLocalId[condition.triggerQuestionId] || '',
              trigger_answer: String(condition.triggerAnswer),
              operator: (condition.operator || 'equals') as OperatorType,
              trigger_answer_max: condition.triggerAnswerMax ? String(condition.triggerAnswerMax) : undefined,
              action: condition.action,
              target_local_ids: condition.targetQuestionIds.map(id => questionIdToLocalId[id] || '')
            });
          }
        }
      }
      
      // Step 6: Update the module
      const modulePayload = {
        name: updatedModule.name,
        description: updatedModule.description,
        questions: questionRefs,
        rules: rules.length > 0 ? rules : []
      };
      
      await fragebogenService.modules.update(updatedModule.id, modulePayload);
      
      // Step 7: Update local state with the correct IDs
      // Use mapped ID if exists (for both temp IDs AND forked questions via copy-on-write)
      const finalModule: Module = {
        ...updatedModule,
        questions: updatedModule.questions.map((q) => ({
          ...q,
          id: newQuestionIdMap[q.id] || q.id, // Use new ID if forked, otherwise keep original
          moduleId: updatedModule.id
        }))
      };
      
      setModules(prev => 
        prev.map(m => m.id === finalModule.id ? finalModule : m)
      );
      setEditingModule(null);
      console.log('Module updated in database');
      
    } catch (error) {
      console.error('Failed to update module:', error);
      alert('Fehler beim Aktualisieren des Moduls. Bitte versuchen Sie es erneut.');
    }
  };

  const handleDuplicateModule = async (module: Module) => {
    try {
      // Fetch full module data with questions
      const fullModule = await fragebogenService.modules.getById(module.id);
      
      // Transform API response to component format
      const localIdToQuestionId: Record<string, string> = {};
      (fullModule.questions || []).forEach((mq: any) => {
        if (mq.local_id && mq.question?.id) {
          localIdToQuestionId[mq.local_id] = mq.question.id;
        }
      });
      
      // Transform rules into conditions attached to questions
      const rulesByQuestion: Record<string, QuestionCondition[]> = {};
      (fullModule.rules || []).forEach((rule: any) => {
        const triggerQuestionId = localIdToQuestionId[rule.trigger_local_id] || '';
        const targetQuestionIds = (rule.target_local_ids || []).map((lid: string) => localIdToQuestionId[lid] || '');
        
        const condition: QuestionCondition = {
          id: `temp-${Date.now()}-${Math.random()}`, // New temp ID for duplicate
          triggerQuestionId: `q-dup-${triggerQuestionId}`, // Reference to duplicated question
          triggerAnswer: rule.trigger_answer,
          operator: rule.operator || 'equals',
          triggerAnswerMax: rule.trigger_answer_max ? Number(rule.trigger_answer_max) : undefined,
          action: rule.action,
          targetQuestionIds: targetQuestionIds.map((id: string) => `q-dup-${id}`)
        };
        
        // Attach to the duplicated trigger question
        const dupTriggerId = `q-dup-${triggerQuestionId}`;
        if (!rulesByQuestion[dupTriggerId]) {
          rulesByQuestion[dupTriggerId] = [];
        }
        rulesByQuestion[dupTriggerId].push(condition);
      });
      
      // Create duplicated module with new temp IDs for questions (they'll be created as new)
      const duplicatedModule: Module = {
        id: '', // Will be set when saved
        name: `Kopie von ${fullModule.name}`,
        description: fullModule.description,
        questionCount: (fullModule.questions || []).length,
        questions: (fullModule.questions || []).map((mq: any, idx: number) => {
          const originalQuestionId = mq.question?.id || mq.id;
          const dupQuestionId = `q-dup-${originalQuestionId}`; // Temp ID for duplicate
          return {
            id: dupQuestionId,
            moduleId: '', // Will be set when saved
            type: mq.question?.type as QuestionType || 'open_text',
            questionText: mq.question?.question_text || '',
            instruction: mq.question?.instruction,
            required: mq.required || false,
            order: mq.order_index || idx,
            options: mq.question?.options,
            likertScale: mq.question?.likert_scale,
            matrixRows: mq.question?.matrix_config?.rows,
            matrixColumns: mq.question?.matrix_config?.columns,
            numericConstraints: mq.question?.numeric_constraints,
            sliderConfig: mq.question?.slider_config,
            conditions: rulesByQuestion[dupQuestionId] || []
          };
        }),
        createdAt: '' // Will be set when saved
      };
      
      setDuplicatingModule(duplicatedModule);
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to load module for duplication:', error);
      alert('Fehler beim Laden des Moduls. Bitte versuchen Sie es erneut.');
      setContextMenu(null);
    }
  };

  const [originalModuleName, setOriginalModuleName] = useState<string>('');

  const handleContextMenu = (e: React.MouseEvent, module: Module) => {
    e.preventDefault();
    e.stopPropagation();
    setOriginalModuleName(module.name); // Store original name for validation
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      module
    });
  };

  // Fragebogen context menu handler
  const handleFragebogenContextMenu = (e: React.MouseEvent, fragebogen: Fragebogen) => {
    e.preventDefault();
    e.stopPropagation();
    setFragebogenContextMenu({
      x: e.clientX,
      y: e.clientY,
      fragebogen
    });
  };

  // Duplicate fragebogen - creates copies of all modules and questions
  const handleDuplicateFragebogen = async (fragebogen: Fragebogen) => {
    try {
      setFragebogenContextMenu(null);
      
      // For each module in the fragebogen, we need to duplicate it
      const duplicatedModuleIds: string[] = [];
      
      for (const moduleId of fragebogen.moduleIds) {
        // Fetch full module data with questions
        const fullModule = await fragebogenService.modules.getById(moduleId);
        
        // Create new questions for this duplicated module
        const createdQuestionIds: Array<{ question_id: string; order_index: number; required: boolean; local_id: string }> = [];
        const questionLocalIdMap: Record<string, string> = {}; // Maps original local_id to question_id
        
        for (const mq of (fullModule.questions || [])) {
          const question = mq.question;
          const localId = mq.local_id || `local-${mq.order_index}`;
          
          // Create a new copy of the question
          const questionPayload = {
            type: question.type,
            question_text: question.question_text,
            instruction: question.instruction,
            is_template: false,
            options: question.options,
            likert_scale: question.likert_scale,
            matrix_config: question.matrix_config,
            numeric_constraints: question.numeric_constraints,
            slider_config: question.slider_config
          };
          
          const createdQuestion = await fragebogenService.questions.create(questionPayload);
          
          createdQuestionIds.push({
            question_id: createdQuestion.id,
            order_index: mq.order_index,
            required: mq.required,
            local_id: localId
          });
          
          questionLocalIdMap[localId] = createdQuestion.id;
        }
        
        // Transform rules for the duplicated module
        type OperatorType = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
        const rules: Array<{
          trigger_local_id: string;
          trigger_answer: string;
          operator: OperatorType;
          trigger_answer_max?: string;
          action: 'hide' | 'show';
          target_local_ids: string[];
        }> = [];
        
        for (const rule of (fullModule.rules || [])) {
          rules.push({
            trigger_local_id: rule.trigger_local_id,
            trigger_answer: rule.trigger_answer,
            operator: (rule.operator || 'equals') as OperatorType,
            trigger_answer_max: rule.trigger_answer_max,
            action: rule.action,
            target_local_ids: rule.target_local_ids
          });
        }
        
        // Create the duplicated module
        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        const modulePayload = {
          name: `Kopie ${dateStr} - ${fullModule.name}`,
          description: fullModule.description,
          questions: createdQuestionIds,
          rules: rules.length > 0 ? rules : undefined
        };
        
        const createdModule = await fragebogenService.modules.create(modulePayload);
        duplicatedModuleIds.push(createdModule.id);
      }
      
      // Create the duplicated fragebogen with the new module IDs
      const duplicatedFragebogen = await fragebogenService.fragebogen.create({
        name: `Kopie von ${fragebogen.name}`,
        description: fragebogen.description,
        start_date: fragebogen.startDate,
        end_date: fragebogen.endDate,
        module_ids: duplicatedModuleIds,
        market_ids: fragebogen.marketIds || []
      });
      
      // Add to local state
      const transformedFragebogen: Fragebogen = {
        id: duplicatedFragebogen.id,
        name: duplicatedFragebogen.name,
        description: duplicatedFragebogen.description,
        startDate: duplicatedFragebogen.start_date,
        endDate: duplicatedFragebogen.end_date,
        status: duplicatedFragebogen.status,
        moduleIds: duplicatedModuleIds,
        marketIds: fragebogen.marketIds || [],
        assignedGLCount: (fragebogen.marketIds || []).length,
        responseCount: 0,
        createdAt: duplicatedFragebogen.created_at
      };
      
      setFragebogenList(prev => [transformedFragebogen, ...prev]);
      
      // Also add the duplicated modules to the modules list
      // Reload modules to get the new ones
      const modulesResponse = await fragebogenService.modules.getAll();
      const transformedModules: Module[] = modulesResponse.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        questionCount: m.question_count || 0,
        questions: (m.questions || []).map((mq: any) => ({
          id: mq.question?.id || mq.id,
          moduleId: m.id,
          type: mq.question?.type as QuestionType || 'open_text',
          questionText: mq.question?.question_text || '',
          instruction: mq.question?.instruction,
          required: mq.required || false,
          order: mq.order_index || 0,
          options: mq.question?.options,
          likertScale: mq.question?.likert_scale,
          matrixRows: mq.question?.matrix_config?.rows,
          matrixColumns: mq.question?.matrix_config?.columns,
          numericConstraints: mq.question?.numeric_constraints,
          sliderConfig: mq.question?.slider_config
        })),
        createdAt: m.created_at
      }));
      setModules(transformedModules);
      
      console.log('Fragebogen duplicated successfully:', duplicatedFragebogen);
      
    } catch (error) {
      console.error('Failed to duplicate fragebogen:', error);
      alert('Fehler beim Duplizieren des Fragebogens. Bitte versuchen Sie es erneut.');
    }
  };

  // Open fragebogen delete confirmation modal
  const handleDeleteFragebogen = (fragebogen: Fragebogen) => {
    setFragebogenContextMenu(null);
    setFragebogenToDelete(fragebogen);
  };

  // Confirm and execute fragebogen deletion
  const confirmDeleteFragebogen = async () => {
    if (!fragebogenToDelete) return;
    
    try {
      await fragebogenService.fragebogen.deletePermanent(fragebogenToDelete.id);
      setFragebogenList(prev => prev.filter(f => f.id !== fragebogenToDelete.id));
      console.log('Fragebogen deleted:', fragebogenToDelete.id);
      setFragebogenToDelete(null);
    } catch (error) {
      console.error('Failed to delete fragebogen:', error);
      alert('Fehler beim Löschen des Fragebogens. Bitte versuchen Sie es erneut.');
    }
  };

  // Open module delete confirmation modal (shows usage info)
  const handleOpenDeleteModuleModal = async (module: Module) => {
    setContextMenu(null);
    setIsLoadingUsage(true);
    setModuleToDelete(module);
    
    try {
      const usage = await fragebogenService.modules.getUsage(module.id);
      setModuleUsageInfo(usage);
    } catch (error) {
      console.error('Failed to fetch module usage:', error);
      setModuleUsageInfo({ activeFragebogen: [], inactiveFragebogen: [], totalUsage: 0 });
    } finally {
      setIsLoadingUsage(false);
    }
  };

  // Show final confirmation before deleting module
  const handleDeleteModule = (deleteQuestions: boolean) => {
    setModuleDeleteConfirmStep({ active: true, deleteQuestions });
  };

  // Actually delete the module after confirmation
  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    
    try {
      await fragebogenService.modules.deletePermanent(moduleToDelete.id, moduleDeleteConfirmStep.deleteQuestions);
      setModules(prev => prev.filter(m => m.id !== moduleToDelete.id));
      
      // Also update fragebogen list to remove this module from their moduleIds
      setFragebogenList(prev => prev.map(f => ({
        ...f,
        moduleIds: f.moduleIds.filter(id => id !== moduleToDelete.id)
      })));
      
      setModuleToDelete(null);
      setModuleUsageInfo(null);
      setModuleDeleteConfirmStep({ active: false, deleteQuestions: false });
      console.log('Module deleted:', moduleToDelete.id, moduleDeleteConfirmStep.deleteQuestions ? '(with questions)' : '(questions kept)');
    } catch (error) {
      console.error('Failed to delete module:', error);
      alert('Fehler beim Löschen des Moduls. Bitte versuchen Sie es erneut.');
    }
  };

  // Go back to options from confirmation
  const cancelModuleDeleteConfirm = () => {
    setModuleDeleteConfirmStep({ active: false, deleteQuestions: false });
  };

  // Close context menus and dropdowns on click outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
      if (fragebogenContextMenu) {
        setFragebogenContextMenu(null);
      }
      if (isQuestionTypeDropdownOpen) {
        setIsQuestionTypeDropdownOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu, fragebogenContextMenu, isQuestionTypeDropdownOpen]);

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${startDate.toLocaleDateString('de-DE', options)} - ${endDate.toLocaleDateString('de-DE', options)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getTotalQuestions = (moduleIds: string[]) => {
    return moduleIds.reduce((total, moduleId) => {
      const module = modules.find(m => m.id === moduleId);
      return total + (module?.questionCount || 0);
    }, 0);
  };

  const getStatusConfig = (status: Fragebogen['status'], startDate?: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Aktiv',
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          icon: <TrendUp size={16} weight="bold" />
        };
      case 'scheduled':
        return {
          label: `Aktiv ab: ${startDate ? formatDate(startDate) : ''}`,
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: <Clock size={16} weight="bold" />
        };
      case 'inactive':
        return {
          label: 'Inaktiv',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          icon: <XCircle size={16} weight="bold" />
        };
    }
  };

  const getFragebogenUsingModule = (moduleId: string) => {
    return fragebogenList.filter(f => f.moduleIds.includes(moduleId)).length;
  };

  const toggleQuestionExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'single_choice': 'Single Choice',
      'yesno': 'Ja/Nein',
      'likert': 'Likert-Skala',
      'multiple_choice': 'Multiple Choice',
      'photo_upload': 'Foto hochladen',
      'matrix': 'Matrix',
      'open_text': 'Offene Frage',
      'open_numeric': 'Numerisch',
      'slider': 'Slider',
      'barcode_scanner': 'Barcode Scanner'
    };
    return labels[type] || type;
  };

  // Filter questions based on search term and type
  const filteredQuestions = allQuestions.filter(q => {
    const matchesSearch = questionSearchTerm.trim() === '' || 
      q.question_text.toLowerCase().includes(questionSearchTerm.toLowerCase()) ||
      (q.options && q.options.some((opt: string) => opt.toLowerCase().includes(questionSearchTerm.toLowerCase())));
    
    const matchesType = selectedQuestionTypeFilter === 'all' || q.type === selectedQuestionTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleSaveModule = async (newModule: Module) => {
    try {
      // Step 1: Create each question in the database first
      const createdQuestionIds: Array<{ question_id: string; order_index: number; required: boolean; local_id: string }> = [];
      
      for (const question of newModule.questions) {
        // Transform question from component format to API format
        const questionPayload = {
          type: question.type,
          question_text: question.questionText,
          instruction: question.instruction,
          is_template: false,
          options: question.options,
          likert_scale: question.likertScale,
          matrix_config: question.matrixRows && question.matrixColumns ? {
            rows: question.matrixRows,
            columns: question.matrixColumns
          } : undefined,
          numeric_constraints: question.numericConstraints,
          slider_config: question.sliderConfig
        };
        
        const createdQuestion = await fragebogenService.questions.create(questionPayload);
        
        createdQuestionIds.push({
          question_id: createdQuestion.id,
          order_index: question.order,
          required: question.required,
          local_id: `local-${question.order}` // Used for rule references
        });
      }
      
      // Step 2: Build a map from old question IDs to local_ids for rule transformation
      const questionIdToLocalId: Record<string, string> = {};
      newModule.questions.forEach((q, idx) => {
        questionIdToLocalId[q.id] = createdQuestionIds[idx].local_id;
      });
      
      // Step 3: Transform rules/conditions from questions
      type OperatorType = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
      const rules: Array<{
        trigger_local_id: string;
        trigger_answer: string;
        operator: OperatorType;
        trigger_answer_max?: string;
        action: 'hide' | 'show';
        target_local_ids: string[];
      }> = [];
      
      for (const question of newModule.questions) {
        if (question.conditions && question.conditions.length > 0) {
          for (const condition of question.conditions) {
            rules.push({
              trigger_local_id: questionIdToLocalId[condition.triggerQuestionId] || '',
              trigger_answer: String(condition.triggerAnswer),
              operator: (condition.operator || 'equals') as OperatorType,
              trigger_answer_max: condition.triggerAnswerMax ? String(condition.triggerAnswerMax) : undefined,
              action: condition.action,
              target_local_ids: condition.targetQuestionIds.map(id => questionIdToLocalId[id] || '')
            });
          }
        }
      }
      
      // Step 4: Create the module with the question references and rules
      const modulePayload = {
        name: newModule.name,
        description: newModule.description,
        questions: createdQuestionIds,
        rules: rules.length > 0 ? rules : undefined
      };
      
      const createdModule = await fragebogenService.modules.create(modulePayload);
      
      // Step 3: Transform back to component format and add to state
      const transformedModule: Module = {
        id: createdModule.id,
        name: createdModule.name,
        description: createdModule.description,
        questionCount: createdModule.question_count || newModule.questions.length,
        questions: newModule.questions.map((q, idx) => ({
          ...q,
          id: createdQuestionIds[idx].question_id,
          moduleId: createdModule.id
        })),
        createdAt: createdModule.created_at
      };
      
      setModules(prev => [transformedModule, ...prev]);
      console.log('Module saved to database:', createdModule);
      
    } catch (error) {
      console.error('Failed to save module:', error);
      alert('Fehler beim Speichern des Moduls. Bitte versuchen Sie es erneut.');
    }
  };

  const handleSaveFragebogen = async (newFragebogen: any) => {
    try {
      // Call the API to create the fragebogen
      const createdFragebogen = await fragebogenService.fragebogen.create({
        name: newFragebogen.name,
        description: newFragebogen.description,
        start_date: newFragebogen.startDate,
        end_date: newFragebogen.endDate,
        module_ids: newFragebogen.moduleIds,
        market_ids: newFragebogen.marketIds
      });
      
      // Transform API response to component format and add to state
      // Note: The API returns only the basic fragebogen record, not modules/markets
      // So we use the original input data for moduleIds and marketIds
      const transformedFragebogen: Fragebogen = {
        id: createdFragebogen.id,
        name: createdFragebogen.name,
        description: createdFragebogen.description,
        startDate: createdFragebogen.start_date,
        endDate: createdFragebogen.end_date,
        status: createdFragebogen.status,
        moduleIds: newFragebogen.moduleIds || [],  // Use original input
        marketIds: newFragebogen.marketIds || [],  // Use original input
        assignedGLCount: (newFragebogen.marketIds || []).length,
        responseCount: 0,
        createdAt: createdFragebogen.created_at
      };
      
      setFragebogenList(prev => [transformedFragebogen, ...prev]);
      console.log('Fragebogen saved to database:', createdFragebogen);
      
    } catch (error: any) {
      console.error('Failed to save fragebogen:', error);
      alert('Fehler beim Speichern des Fragebogens. Bitte versuchen Sie es erneut.');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.fragebogenPage}>
        <div className={styles.loadingState}>
          <CircleNotch size={48} weight="bold" className={styles.spinner} />
          <p>Lade Fragebögen...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.fragebogenPage}>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Erneut versuchen</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fragebogenPage}>
      {/* Active Fragebogen */}
      {activeFragebogen.length > 0 && (
        <div className={styles.fragebogenSection}>
          <h2 className={styles.sectionTitle}>Aktive Fragebögen</h2>
          <div className={styles.fragebogenGrid}>
            {activeFragebogen.map(fragebogen => {
              const statusConfig = getStatusConfig(fragebogen.status);
              return (
                <div 
                  key={fragebogen.id}
                  className={`${styles.fragebogenCard} ${styles.fragebogenCardActive}`}
                  onClick={() => setSelectedFragebogen(fragebogen)}
                  onContextMenu={(e) => handleFragebogenContextMenu(e, fragebogen)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.fragebogenHeader}>
                    <div className={styles.fragebogenStatus} style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color 
                    }}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                    <button 
                      className={styles.fragebogenEditButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFragebogen(fragebogen);
                      }}
                    >
                      <PencilSimple size={18} weight="bold" />
                    </button>
                  </div>

                  <div className={styles.fragebogenContent}>
                    <h3 className={styles.fragebogenName}>{fragebogen.name}</h3>
                    
                    <div className={styles.fragebogenDateRange}>
                      <Calendar size={16} weight="regular" />
                      <span>{formatDateRange(fragebogen.startDate, fragebogen.endDate)}</span>
                    </div>

                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <Stack size={14} weight="fill" />
                        <span>{fragebogen.moduleIds.length} Module</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Users size={14} weight="fill" />
                        <span>{fragebogen.marketIds?.length || 0} Märkte</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Question size={14} weight="fill" />
                        <span>{getTotalQuestions(fragebogen.moduleIds)} Fragen</span>
                      </div>
                      <div className={styles.infoItem}>
                        <CheckCircleFilled size={14} weight="fill" />
                        <span>{fragebogen.responseCount} Antworten</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled Fragebogen */}
      {scheduledFragebogen.length > 0 && (
        <div className={styles.fragebogenSection}>
          <h2 className={styles.sectionTitle}>Geplante Fragebögen</h2>
          <div className={styles.fragebogenGrid}>
            {scheduledFragebogen.map(fragebogen => {
              const statusConfig = getStatusConfig(fragebogen.status, fragebogen.startDate);
              return (
                <div 
                  key={fragebogen.id}
                  className={`${styles.fragebogenCard} ${styles.fragebogenCardScheduled}`}
                  onClick={() => setSelectedFragebogen(fragebogen)}
                  onContextMenu={(e) => handleFragebogenContextMenu(e, fragebogen)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.fragebogenHeader}>
                    <div className={styles.fragebogenStatus} style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color 
                    }}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                    <button 
                      className={styles.fragebogenEditButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFragebogen(fragebogen);
                      }}
                    >
                      <PencilSimple size={18} weight="bold" />
                    </button>
                  </div>

                  <div className={styles.fragebogenContent}>
                    <h3 className={styles.fragebogenName}>{fragebogen.name}</h3>
                    
                    <div className={styles.fragebogenDateRange}>
                      <Calendar size={16} weight="regular" />
                      <span>{formatDateRange(fragebogen.startDate, fragebogen.endDate)}</span>
                    </div>

                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <Stack size={14} weight="fill" />
                        <span>{fragebogen.moduleIds.length} Module</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Users size={14} weight="fill" />
                        <span>{fragebogen.marketIds?.length || 0} Märkte</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Question size={14} weight="fill" />
                        <span>{getTotalQuestions(fragebogen.moduleIds)} Fragen</span>
                      </div>
                      <div className={styles.infoItem}>
                        <CheckCircleFilled size={14} weight="fill" />
                        <span>{fragebogen.responseCount} Antworten</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inactive Fragebogen */}
      {inactiveFragebogen.length > 0 && (
        <div className={styles.fragebogenSection}>
          <h2 className={styles.sectionTitle}>Archivierte Fragebögen</h2>
          <div className={styles.fragebogenGrid}>
            {inactiveFragebogen.map(fragebogen => {
              const statusConfig = getStatusConfig(fragebogen.status);
              return (
                <div 
                  key={fragebogen.id}
                  className={`${styles.fragebogenCard} ${styles.fragebogenCardInactive}`}
                  onClick={() => setSelectedFragebogen(fragebogen)}
                  onContextMenu={(e) => handleFragebogenContextMenu(e, fragebogen)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.fragebogenHeader}>
                    <div className={styles.fragebogenStatus} style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color 
                    }}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                    <button 
                      className={styles.fragebogenEditButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFragebogen(fragebogen);
                      }}
                    >
                      <PencilSimple size={18} weight="bold" />
                    </button>
                  </div>

                  <div className={styles.fragebogenContent}>
                    <h3 className={styles.fragebogenName}>{fragebogen.name}</h3>
                    
                    <div className={styles.fragebogenDateRange}>
                      <Calendar size={16} weight="regular" />
                      <span>{formatDateRange(fragebogen.startDate, fragebogen.endDate)}</span>
                    </div>

                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <Stack size={14} weight="fill" />
                        <span>{fragebogen.moduleIds.length} Module</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Users size={14} weight="fill" />
                        <span>{fragebogen.marketIds?.length || 0} Märkte</span>
                      </div>
                      <div className={styles.infoItem}>
                        <Question size={14} weight="fill" />
                        <span>{getTotalQuestions(fragebogen.moduleIds)} Fragen</span>
                      </div>
                      <div className={styles.infoItem}>
                        <CheckCircleFilled size={14} weight="fill" />
                        <span>{fragebogen.responseCount} Antworten</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Module Library */}
      <div className={styles.moduleSection}>
        <h2 className={styles.sectionTitle}>Modul-Bibliothek</h2>
        <div className={styles.moduleGrid}>
          {modules.map(module => (
            <div 
              key={module.id}
              className={styles.moduleCard}
              onClick={() => setSelectedModule(module)}
              onContextMenu={(e) => handleContextMenu(e, module)}
              style={{ cursor: 'pointer' }}
            >
              <button 
                className={styles.moduleEditButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditModule(module);
                }}
              >
                <PencilSimple size={16} weight="bold" />
              </button>
              
              <div className={styles.moduleIcon}>
                <Stack size={40} weight="regular" />
              </div>
              
              <div className={styles.moduleContent}>
                <h3 className={styles.moduleName}>{module.name}</h3>
                <div className={styles.moduleQuestionCount}>
                  <Question size={14} weight="fill" />
                  <span>{module.questionCount} Fragen</span>
                </div>
              </div>

              <div className={styles.moduleFooter}>
                <span className={styles.moduleUsage}>
                  Verwendet in {getFragebogenUsingModule(module.id)} Fragebögen
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Questions Library */}
      <div className={styles.questionsSection}>
        <div className={styles.questionsHeader}>
          <h2 className={styles.sectionTitle}>Fragen-Bibliothek</h2>
          <div className={styles.questionsHeaderRight}>
            {/* Search Bar */}
            <div className={styles.questionSearchWrapper}>
              <Question size={16} weight="bold" className={styles.questionSearchIcon} />
              <input
                type="text"
                placeholder="Fragen oder Antworten durchsuchen..."
                className={styles.questionSearchInput}
                value={questionSearchTerm}
                onChange={(e) => setQuestionSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Type Filter Dropdown */}
            <div className={styles.questionTypeFilterWrapper}>
              <button 
                className={styles.questionTypeFilterButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQuestionTypeDropdownOpen(!isQuestionTypeDropdownOpen);
                }}
                style={selectedQuestionTypeFilter !== 'all' ? {
                  borderColor: QUESTION_TYPES[selectedQuestionTypeFilter]?.color,
                  color: QUESTION_TYPES[selectedQuestionTypeFilter]?.color,
                  background: `${QUESTION_TYPES[selectedQuestionTypeFilter]?.color}08`
                } : {}}
              >
                {(() => {
                  if (selectedQuestionTypeFilter !== 'all' && QUESTION_TYPES[selectedQuestionTypeFilter]) {
                    const SelectedIcon = QUESTION_TYPES[selectedQuestionTypeFilter].icon;
                    return <SelectedIcon size={18} weight="regular" />;
                  }
                  return <Stack size={18} weight="regular" />;
                })()}
              </button>
              {isQuestionTypeDropdownOpen && (
                <div className={styles.questionTypeDropdown} onClick={(e) => e.stopPropagation()}>
                  <div
                    className={`${styles.questionTypeOption} ${selectedQuestionTypeFilter === 'all' ? styles.questionTypeOptionSelected : ''}`}
                    onClick={() => {
                      setSelectedQuestionTypeFilter('all');
                      setIsQuestionTypeDropdownOpen(false);
                    }}
                  >
                    Alle Typen
                  </div>
                  {(Object.keys(QUESTION_TYPES) as QuestionType[]).map((type) => {
                    const config = QUESTION_TYPES[type];
                    const Icon = config.icon;
                    const isSelected = selectedQuestionTypeFilter === type;
                    return (
                      <div
                        key={type}
                        className={`${styles.questionTypeOption} ${isSelected ? styles.questionTypeOptionSelected : ''}`}
                        style={isSelected ? { 
                          color: config.color,
                          background: `${config.color}12`,
                        } : {}}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = `${config.color}08`;
                            e.currentTarget.style.color = config.color;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.color = '#374151';
                          }
                        }}
                        onClick={() => {
                          setSelectedQuestionTypeFilter(type);
                          setIsQuestionTypeDropdownOpen(false);
                        }}
                      >
                        <Icon size={16} weight="regular" />
                        {config.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={styles.questionsList}>
          {filteredQuestions.length === 0 ? (
            <div className={styles.emptyQuestions}>
              <Question size={48} weight="regular" />
              <p>{questionSearchTerm || selectedQuestionTypeFilter !== 'all' ? 'Keine Fragen gefunden' : 'Keine Fragen vorhanden'}</p>
            </div>
          ) : (
            filteredQuestions.map((question) => {
              const isExpanded = expandedQuestions.has(question.id);
              const hasOptions = question.options && question.options.length > 0;
              const hasLikert = question.likert_scale;
              const hasMatrix = question.matrix_config;
              const hasNumeric = question.numeric_constraints;
              const hasSlider = question.slider_config;
              
              const typeConfig = QUESTION_TYPES[question.type as QuestionType];
              const Icon = typeConfig?.icon || Question;
              const iconColor = typeConfig?.color || '#3B82F6';
              
              return (
                <div 
                  key={question.id} 
                  className={`${styles.questionRow} ${isExpanded ? styles.questionRowExpanded : ''}`}
                  onClick={() => toggleQuestionExpanded(question.id)}
                >
                  <div className={styles.questionRowHeader}>
                    <div className={styles.questionRowLeft}>
                      <div className={styles.questionRowIcon} style={{ background: `${iconColor}15`, color: iconColor }}>
                        <Icon size={18} weight="fill" />
                      </div>
                      <div className={styles.questionRowInfo}>
                        <span className={styles.questionRowText}>{question.question_text}</span>
                        <span className={styles.questionRowType} style={{ color: iconColor, background: `${iconColor}12` }}>
                          {typeConfig?.label || getQuestionTypeLabel(question.type)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.questionRowRight}>
                      <span className={styles.questionRowDate}>
                        {new Date(question.created_at).toLocaleDateString('de-DE')}
                      </span>
                      <div className={styles.expandIcon}>
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className={styles.questionRowDetails}>
                      {question.instruction && (
                        <div className={styles.questionDetail}>
                          <span className={styles.detailLabel}>Anweisung:</span>
                          <span className={styles.detailValue}>{question.instruction}</span>
                        </div>
                      )}
                      
                      {hasOptions && (
                        <div className={styles.questionDetail}>
                          <span className={styles.detailLabel}>Antwortoptionen:</span>
                          <div className={styles.optionsList}>
                            {question.options.map((option: string, idx: number) => (
                              <span key={idx} className={styles.optionChip}>{option}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {hasLikert && (
                        <div className={styles.questionDetail}>
                          <span className={styles.detailLabel}>Likert-Skala:</span>
                          <div className={styles.detailValue}>
                            {question.likert_scale.min} ({question.likert_scale.minLabel}) bis {question.likert_scale.max} ({question.likert_scale.maxLabel})
                          </div>
                        </div>
                      )}
                      
                      {hasMatrix && (
                        <div className={styles.questionDetail}>
                          <span className={styles.detailLabel}>Matrix:</span>
                          <div className={styles.matrixPreview}>
                            <div className={styles.matrixRows}>
                              <strong>Zeilen:</strong> {question.matrix_config.rows.join(', ')}
                            </div>
                            <div className={styles.matrixCols}>
                              <strong>Spalten:</strong> {question.matrix_config.columns.join(', ')}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {hasNumeric && (
                        <div className={styles.questionDetail}>
                          <span className={styles.detailLabel}>Numerische Einschränkungen:</span>
                          <div className={styles.detailValue}>
                            {question.numeric_constraints.min !== undefined && `Min: ${question.numeric_constraints.min}`}
                            {question.numeric_constraints.max !== undefined && `, Max: ${question.numeric_constraints.max}`}
                            {question.numeric_constraints.decimals && `, Dezimalzahlen erlaubt`}
                          </div>
                        </div>
                      )}
                      
                      {hasSlider && (
                        <div className={styles.questionDetail}>
                          <span className={styles.detailLabel}>Slider-Konfiguration:</span>
                          <div className={styles.detailValue}>
                            {question.slider_config.min} bis {question.slider_config.max} (Schritte: {question.slider_config.step})
                            {question.slider_config.unit && ` ${question.slider_config.unit}`}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Fragebogen Detail Modal */}
      {selectedFragebogen && (
        <FragebogenDetailModal 
          fragebogen={selectedFragebogen}
          modules={modules.filter(m => selectedFragebogen.moduleIds.includes(m.id))}
          onClose={() => setSelectedFragebogen(null)}
          onUpdateMarkets={(marketIds) => handleUpdateFragebogenMarkets(selectedFragebogen.id, marketIds)}
          onArchive={(fragebogenId) => handleToggleArchiveFragebogen(fragebogenId)}
          onEdit={(fragebogen) => handleEditFragebogen(fragebogen)}
        />
      )}

      {/* Module Detail Modal */}
      {selectedModule && (
        <ModuleDetailModal 
          module={selectedModule}
          usageCount={getFragebogenUsingModule(selectedModule.id)}
          onClose={() => setSelectedModule(null)}
          onEdit={(moduleWithQuestions) => {
            // Transform the module data to the format expected by CreateModuleModal
            const editableModule: Module = {
              id: moduleWithQuestions.id,
              name: moduleWithQuestions.name,
              description: moduleWithQuestions.description,
              questionCount: moduleWithQuestions.questions.length,
              questions: moduleWithQuestions.questions.map(q => ({
                id: q.id,
                moduleId: q.moduleId,
                type: q.type as QuestionType,
                questionText: q.questionText,
                instruction: q.instruction,
                required: q.required,
                order: q.order,
                options: q.options,
                likertScale: q.likertScale,
                matrixRows: q.matrixRows,
                matrixColumns: q.matrixColumns,
                numericConstraints: q.numericConstraints,
                sliderConfig: q.sliderConfig,
                conditions: q.conditions?.map(c => ({
                  id: c.id,
                  triggerQuestionId: c.triggerQuestionId,
                  triggerAnswer: c.triggerAnswer,
                  operator: c.operator,
                  triggerAnswerMax: c.triggerAnswerMax,
                  action: c.action,
                  targetQuestionIds: c.targetQuestionIds
                }))
              })),
              createdAt: moduleWithQuestions.createdAt
            };
            setSelectedModule(null);
            setEditingModule(editableModule);
          }}
        />
      )}

      {/* Create Module Modal */}
      {isCreateModuleModalOpen && (
        <CreateModuleModal
          isOpen={isCreateModuleModalOpen}
          onClose={onCloseCreateModuleModal}
          onSave={handleSaveModule}
          allModules={modules}
        />
      )}

      {/* Edit Module Modal */}
      {editingModule && (
        <CreateModuleModal
          isOpen={true}
          onClose={() => setEditingModule(null)}
          onSave={handleUpdateModule}
          editingModule={editingModule}
          allModules={modules}
        />
      )}

      {/* Create Fragebogen Modal */}
      {isCreateFragebogenModalOpen && (
        <CreateFragebogenModal
          isOpen={isCreateFragebogenModalOpen}
          onClose={onCloseCreateFragebogenModal}
          onSave={handleSaveFragebogen}
          availableModules={modules}
          existingFragebogen={fragebogenList}
        />
      )}

      {/* Edit Fragebogen Modal */}
      {editingFragebogen && (
        <CreateFragebogenModal
          isOpen={true}
          onClose={() => setEditingFragebogen(null)}
          onSave={handleUpdateFragebogen}
          availableModules={modules}
          existingFragebogen={fragebogenList}
          editingFragebogen={editingFragebogen}
        />
      )}

      {/* Duplicate Module Modal */}
      {duplicatingModule && (
        <CreateModuleModal
          isOpen={true}
          onClose={() => {
            setDuplicatingModule(null);
            setOriginalModuleName('');
          }}
          onSave={handleSaveModule}
          editingModule={duplicatingModule}
          originalModuleName={originalModuleName}
          allModules={modules}
        />
      )}

      {/* Context Menu for Modules */}
      {contextMenu && (
        <div 
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 100002
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className={styles.contextMenuItem}
            onClick={() => handleDuplicateModule(contextMenu.module)}
          >
            <Copy size={16} weight="bold" />
            <span>Modul duplizieren</span>
          </button>
          <button 
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            onClick={() => handleOpenDeleteModuleModal(contextMenu.module)}
          >
            <Trash size={16} weight="bold" />
            <span>Modul löschen</span>
          </button>
        </div>
      )}

      {/* Context Menu for Fragebogen */}
      {fragebogenContextMenu && (
        <div 
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            top: `${fragebogenContextMenu.y}px`,
            left: `${fragebogenContextMenu.x}px`,
            zIndex: 100002
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className={styles.contextMenuItem}
            onClick={() => handleDuplicateFragebogen(fragebogenContextMenu.fragebogen)}
          >
            <Copy size={16} weight="bold" />
            <span>Fragebogen duplizieren</span>
          </button>
          <button 
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            onClick={() => handleDeleteFragebogen(fragebogenContextMenu.fragebogen)}
          >
            <Trash size={16} weight="bold" />
            <span>Fragebogen löschen</span>
          </button>
        </div>
      )}

      {/* Module Delete Confirmation Modal */}
      {moduleToDelete && (
        <div className={styles.modalOverlay} onClick={() => { setModuleToDelete(null); setModuleUsageInfo(null); setModuleDeleteConfirmStep({ active: false, deleteQuestions: false }); }}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            {!moduleDeleteConfirmStep.active ? (
              <>
                <div className={styles.deleteModalHeader}>
                  <Warning size={32} weight="fill" className={styles.warningIcon} />
                  <h2>Modul löschen</h2>
                </div>
                
                <p className={styles.deleteModalText}>
                  Möchten Sie das Modul <strong>"{moduleToDelete.name}"</strong> wirklich löschen?
                </p>
                
                {isLoadingUsage ? (
                  <div className={styles.loadingUsage}>
                    <CircleNotch size={24} className={styles.spinner} />
                    <span>Lade Verwendungsinformationen...</span>
                  </div>
                ) : moduleUsageInfo && moduleUsageInfo.totalUsage > 0 ? (
                  <div className={styles.usageWarning}>
                    <p className={styles.usageWarningTitle}>
                      <Warning size={18} weight="fill" />
                      Dieses Modul wird in {moduleUsageInfo.totalUsage} Fragebogen verwendet:
                    </p>
                    
                    {moduleUsageInfo.activeFragebogen.length > 0 && (
                      <div className={styles.usageSection}>
                        <h4>Aktive Fragebögen ({moduleUsageInfo.activeFragebogen.length}):</h4>
                        <ul>
                          {moduleUsageInfo.activeFragebogen.map(f => (
                            <li key={f.id}>{f.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {moduleUsageInfo.inactiveFragebogen.length > 0 && (
                      <div className={styles.usageSection}>
                        <h4>Archivierte/Geplante Fragebögen ({moduleUsageInfo.inactiveFragebogen.length}):</h4>
                        <ul>
                          {moduleUsageInfo.inactiveFragebogen.map(f => (
                            <li key={f.id}>{f.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={styles.noUsageInfo}>Dieses Modul wird in keinem Fragebogen verwendet.</p>
                )}
                
                <div className={styles.deleteModalOptions}>
                  <p className={styles.optionsTitle}>Wie möchten Sie fortfahren?</p>
                  
                  <button 
                    className={styles.deleteOptionButton}
                    onClick={() => handleDeleteModule(false)}
                  >
                    <Trash size={18} weight="bold" />
                    <div>
                      <span className={styles.optionTitle}>Nur Modul löschen</span>
                      <span className={styles.optionDesc}>Fragen bleiben für spätere Verwendung erhalten</span>
                    </div>
                  </button>
                  
                  <button 
                    className={`${styles.deleteOptionButton} ${styles.deleteOptionButtonDanger}`}
                    onClick={() => handleDeleteModule(true)}
                  >
                    <Trash size={18} weight="fill" />
                    <div>
                      <span className={styles.optionTitle}>Modul und Fragen löschen</span>
                      <span className={styles.optionDesc}>Fragen werden ebenfalls gelöscht (wenn nicht anderweitig verwendet)</span>
                    </div>
                  </button>
                </div>
                
                <button 
                  className={styles.cancelButton}
                  onClick={() => { setModuleToDelete(null); setModuleUsageInfo(null); }}
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <>
                <div className={styles.deleteModalHeader}>
                  <Warning size={32} weight="fill" className={styles.dangerIcon} />
                  <h2>Bist du sicher?</h2>
                </div>
                
                <p className={styles.deleteModalText}>
                  Du bist dabei, das Modul <strong>"{moduleToDelete.name}"</strong> 
                  {moduleDeleteConfirmStep.deleteQuestions ? ' und alle zugehörigen Fragen' : ''} zu löschen.
                </p>
                
                <div className={styles.finalWarning}>
                  <Warning size={20} weight="fill" />
                  <span>Diese Aktion kann nicht rückgängig gemacht werden. Die Daten können nicht wiederhergestellt werden.</span>
                </div>
                
                <div className={styles.deleteModalActions}>
                  <button 
                    className={styles.cancelButton}
                    onClick={cancelModuleDeleteConfirm}
                  >
                    Zurück
                  </button>
                  <button 
                    className={styles.confirmDeleteButton}
                    onClick={confirmDeleteModule}
                  >
                    <Trash size={18} weight="bold" />
                    Endgültig löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fragebogen Delete Confirmation Modal */}
      {fragebogenToDelete && (
        <div className={styles.modalOverlay} onClick={() => setFragebogenToDelete(null)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalHeader}>
              <Warning size={32} weight="fill" className={styles.warningIcon} />
              <h2>Fragebogen löschen</h2>
            </div>
            
            <p className={styles.deleteModalText}>
              Möchten Sie den Fragebogen <strong>"{fragebogenToDelete.name}"</strong> wirklich löschen?
            </p>
            
            <p className={styles.noUsageInfo}>
              Module und Fragen bleiben erhalten und können weiterhin verwendet werden.
            </p>
            
            <div className={styles.deleteModalActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setFragebogenToDelete(null)}
              >
                Abbrechen
              </button>
              <button 
                className={styles.confirmDeleteButton}
                onClick={confirmDeleteFragebogen}
              >
                <Trash size={18} weight="bold" />
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

