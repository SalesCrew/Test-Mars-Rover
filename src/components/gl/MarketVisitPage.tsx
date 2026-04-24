import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  RadioButton,
  CheckSquare,
  TextT,
  Hash,
  SlidersHorizontal,
  Camera,
  Barcode,
  Table,
  ThumbsUp,
  ThumbsDown,
  Timer,
  Car,
  ChatText,
  ChartPie,
  DotsThree,
  CalendarCheck,
  Receipt,
  Calculator
} from '@phosphor-icons/react';
import Aurora from './Aurora';
import type { Market } from '../../types/market-types';
import { useAuth } from '../../contexts/AuthContext';
import fragebogenService from '../../services/fragebogenService';
import { saveActiveVisit, updateActiveVisit, updatePendingSync, clearActiveVisit, type PersistedVisit } from '../../services/visitPersistence';
import styles from './MarketVisitPage.module.css';

// Question types matching the fragebogen system
type QuestionType = 
  | 'single_choice'
  | 'yesno'
  | 'likert'
  | 'multiple_choice'
  | 'photo_upload'
  | 'matrix'
  | 'open_text'
  | 'open_numeric'
  | 'slider'
  | 'barcode_scanner';

interface Question {
  id: string;
  localId?: string;
  questionInstanceId?: string;
  type: QuestionType;
  questionText: string;
  instruction?: string;
  required: boolean;
  images?: string[];
  options?: { id: string; label: string }[];
  likertScale?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
  matrixRows?: { id: string; label: string }[];
  matrixColumns?: { id: string; label: string }[];
  numericConstraints?: {
    min?: number;
    max?: number;
    unit?: string;
  };
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
    unit?: string;
  };
}

interface ModuleRule {
  id?: string;
  trigger_local_id: string;
  trigger_answer: string;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
  trigger_answer_max?: string | number | null;
  action: 'hide' | 'show';
  target_local_ids: string[];
}

interface Module {
  id: string;
  moduleInstanceId?: string;
  fragebogenId?: string;
  fragebogenName?: string;
  name: string;
  rules?: ModuleRule[];
  questions: Question[];
}

type QuestionWithContext = Question & {
  moduleName: string;
  moduleId: string;
  moduleInstanceId?: string;
  fragebogenId?: string;
  fragebogenName?: string;
  localId: string;
  questionKey: string;
};

interface MarketVisitPageProps {
  market: Market;
  modules: Module[];
  fragebogenId?: string;
  fragebogenIds?: string[];
  zeiterfassungActive?: boolean;
  resumeData?: PersistedVisit;
  onClose: () => void;
  onComplete: (answers: Record<string, any>) => void;
  onOpenVorbesteller: () => void;
  onOpenVorverkauf: () => void;
  onOpenProduktrechner: () => void;
}

export const MarketVisitPage: React.FC<MarketVisitPageProps> = ({
  market,
  modules,
  fragebogenId,
  fragebogenIds,
  zeiterfassungActive = true,
  resumeData,
  onClose: _onClose,
  onComplete,
  onOpenVorbesteller,
  onOpenVorverkauf,
  onOpenProduktrechner
}) => {
  void _onClose;
  const { user } = useAuth();
  // Flatten all questions with module context
  const allQuestions = useMemo(
    () =>
      modules.flatMap((module, moduleIndex) =>
        module.questions.map((q, questionIndex) => {
          const localId = q.localId || `local-${questionIndex + 1}`;
          const questionKey =
            q.questionInstanceId ||
            `${module.fragebogenId || fragebogenId || fragebogenIds?.[0] || 'fb'}:${module.id}:${q.id}:${moduleIndex}:${questionIndex}`;
          return {
            ...q,
            moduleName: module.name,
            moduleId: module.id,
            moduleInstanceId: module.moduleInstanceId,
            fragebogenId: module.fragebogenId || fragebogenId || fragebogenIds?.[0],
            fragebogenName: module.fragebogenName,
            localId,
            questionKey
          };
        })
      ),
    [modules, fragebogenId, fragebogenIds]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Response IDs by Fragebogen — created lazily on first answer per Fragebogen.
  const [responseIdByFragebogenId, setResponseIdByFragebogenId] = useState<Record<string, string>>(
    resumeData?.responseIdByFragebogenId || {}
  );
  const responseCreationInFlightRef = useRef<Partial<Record<string, Promise<string | null>>>>({});

  // Pending answer sync queue — keyed by questionId, stores the latest un-synced value.
  // Navigation never waits for this; it is flushed in the background and before completion.
  const pendingAnswersRef = useRef<Map<string, { question: QuestionWithContext; value: any }>>(new Map());
  const isSyncingRef = useRef(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // UI states for completion feedback only (not used to block mid-question navigation)
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Determine if there are any questions/modules
  const hasFragebogen = modules.length > 0 && allQuestions.length > 0;
  
  // Zeiterfassung state - if no fragebogen, go directly to 'end' step
  const [zeiterfassungStep, setZeiterfassungStep] = useState<'start' | 'questions' | 'end' | null>(
    hasFragebogen ? 'questions' : 'end'
  );
  const [zeiterfassung, setZeiterfassung] = useState(() => ({
    fahrzeitVon: '',
    fahrzeitBis: '',
    besuchszeitVon: resumeData?.besuchszeitVon || '',
    besuchszeitBis: resumeData?.besuchszeitBis || '',
    kommentar: resumeData?.kommentar || '',
    foodProzent: resumeData?.foodProzent ?? 50,
    marketStartTime: resumeData?.besuchszeitVon || '',
    marketEndTime: resumeData?.besuchszeitBis || ''
  }));
  const [submissionId, setSubmissionId] = useState<string | null>(resumeData?.submissionId || null);
  const hasVonNoBis = !!(resumeData?.besuchszeitVon && !resumeData?.besuchszeitBis);
  const [fahrzeitRunning, setFahrzeitRunning] = useState(false);
  const [besuchszeitRunning, setBesuchszeitRunning] = useState(hasVonNoBis);
  const [visitStarted, setVisitStarted] = useState(!!resumeData?.besuchszeitVon);
  
  // Elapsed time: if resuming an ongoing visit, calculate elapsed from VON
  const [fahrzeitElapsed, setFahrzeitElapsed] = useState(0);
  const [besuchszeitElapsed, setBesuchszeitElapsed] = useState(() => {
    if (hasVonNoBis && resumeData?.besuchszeitVon) {
      const [h, m] = resumeData.besuchszeitVon.split(':').map(Number);
      const vonMs = new Date().setHours(h, m, 0, 0);
      return Math.max(0, Math.floor((Date.now() - vonMs) / 1000));
    }
    return 0;
  });
  
  // Quick actions button state
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoQuestionRef = useRef<QuestionWithContext | null>(null);
  const [photoUploadInProgressKey, setPhotoUploadInProgressKey] = useState<string | null>(null);
  const fahrzeitStartRef = useRef<number | null>(null);
  const besuchszeitStartRef = useRef<number | null>(null);
  const [prevFahrzeitDisplay, setPrevFahrzeitDisplay] = useState('--:--:--');

  // Timer effect for Fahrzeit
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (fahrzeitRunning) {
      if (fahrzeitStartRef.current === null) {
        fahrzeitStartRef.current = Date.now() - (fahrzeitElapsed * 1000);
      }
      
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - fahrzeitStartRef.current!) / 1000);
        setFahrzeitElapsed(elapsed);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fahrzeitRunning]);

  // Timer effect for Besuchszeit
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (besuchszeitRunning) {
      if (besuchszeitStartRef.current === null) {
        besuchszeitStartRef.current = Date.now() - (besuchszeitElapsed * 1000);
      }
      
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - besuchszeitStartRef.current!) / 1000);
        setBesuchszeitElapsed(elapsed);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [besuchszeitRunning]);

  // Click outside handler for quick actions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setQuickActionsExpanded(false);
      }
    };

    if (quickActionsExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [quickActionsExpanded]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startMarketVisit = async () => {
    const now = new Date();
    const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setZeiterfassung(prev => ({
      ...prev,
      marketStartTime: startTime,
      besuchszeitVon: startTime
    }));
    setVisitStarted(true);

    if (user?.id) {
      try {
        const result = await fragebogenService.zeiterfassung.submit({
          gebietsleiter_id: user.id,
          market_id: market.id,
          besuchszeit_von: startTime
        });
        setSubmissionId(result.id);
        saveActiveVisit({
          submissionId: result.id,
          glId: user.id,
          marketId: market.id,
          marketName: market.name,
          marketChain: market.chain || '',
          besuchszeitVon: startTime,
          besuchszeitBis: null,
          kommentar: '',
          foodProzent: 50,
          distanzKm: '',
          pendingSync: {},
          fragebogenIds: Array.from(new Set(modules.map(m => m.fragebogenId).filter(Boolean))) as string[],
          responseIdByFragebogenId,
          modules,
          savedAt: new Date().toISOString()
        });
      } catch {
        // Zeiterfassung failure is independent — response run is created separately
        saveActiveVisit({
          submissionId: null,
          glId: user.id,
          marketId: market.id,
          marketName: market.name,
          marketChain: market.chain || '',
          besuchszeitVon: startTime,
          besuchszeitBis: null,
          kommentar: '',
          foodProzent: 50,
          distanzKm: '',
          pendingSync: { create: true },
          fragebogenIds: Array.from(new Set(modules.map(m => m.fragebogenId).filter(Boolean))) as string[],
          responseIdByFragebogenId,
          modules,
          savedAt: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Ensure a fragebogen response run exists before saving answers.
   * Decoupled from zeiterfassung — can be called independently at first answer.
   * Returns the responseId on success, or null on failure (sets saveError).
   */
  const ensureResponseRun = async (targetFragebogenId?: string): Promise<string | null> => {
    const resolvedFragebogenId = targetFragebogenId || fragebogenId || fragebogenIds?.[0];
    if (!resolvedFragebogenId || !hasFragebogen || !user?.id) return null;
    if (responseIdByFragebogenId[resolvedFragebogenId]) return responseIdByFragebogenId[resolvedFragebogenId];
    if (responseCreationInFlightRef.current[resolvedFragebogenId]) {
      return responseCreationInFlightRef.current[resolvedFragebogenId];
    }

    const createPromise = (async () => {
      try {
        const result = await fragebogenService.responses.create({
          fragebogen_id: resolvedFragebogenId,
          gebietsleiter_id: user.id,
          market_id: market.id
        });
        setResponseIdByFragebogenId(prev => {
          const next = { ...prev, [resolvedFragebogenId]: result.id };
          updateActiveVisit({ responseIdByFragebogenId: next });
          return next;
        });
        return result.id;
      } catch {
        setSaveError('Antwort konnte nicht gespeichert werden. Bitte erneut versuchen.');
        return null;
      } finally {
        delete responseCreationInFlightRef.current[resolvedFragebogenId];
      }
    })();
    responseCreationInFlightRef.current[resolvedFragebogenId] = createPromise;
    return createPromise;
  };

  // Format elapsed seconds to HH:MM:SS
  const formatElapsed = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get the display value for Fahrzeit Dauer
  const getFahrzeitDauer = (): string => {
    if (fahrzeitRunning) {
      return formatElapsed(fahrzeitElapsed);
    }
    if (zeiterfassung.fahrzeitVon && zeiterfassung.fahrzeitBis) {
      return calculateTimeDiff(zeiterfassung.fahrzeitVon, zeiterfassung.fahrzeitBis);
    }
    if (fahrzeitElapsed > 0) {
      return formatElapsed(fahrzeitElapsed);
    }
    return '--:--:--';
  };

  // Update previous display for animation
  useEffect(() => {
    const current = getFahrzeitDauer();
    if (current !== prevFahrzeitDisplay) {
      setPrevFahrzeitDisplay(current);
    }
  }, [fahrzeitElapsed, fahrzeitRunning]);

  const moduleRulesByKey = useMemo(() => {
    const next = new Map<string, ModuleRule[]>();
    modules.forEach((module) => {
      const moduleKey = module.moduleInstanceId || module.id;
      next.set(moduleKey, Array.isArray(module.rules) ? module.rules : []);
    });
    return next;
  }, [modules]);

  const questionByModuleLocalId = useMemo(() => {
    const next = new Map<string, QuestionWithContext>();
    allQuestions.forEach((question) => {
      const moduleKey = question.moduleInstanceId || question.moduleId;
      next.set(`${moduleKey}:${question.localId}`, question);
    });
    return next;
  }, [allQuestions]);

  const normalizeBooleanLike = (value: any): string => {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    const raw = String(value ?? '').trim().toLowerCase();
    if (raw === '1' || raw === 'ja') return 'true';
    if (raw === '0' || raw === 'nein') return 'false';
    return raw;
  };

  const parseMatrixRuleTarget = (value: string): { rowId: string; colId: string } | null => {
    const parts = String(value || '').split(':');
    if (parts.length < 2) return null;
    const rowId = parts[0].trim();
    const colId = parts.slice(1).join(':').trim();
    if (!rowId || !colId) return null;
    return { rowId, colId };
  };

  const evaluateCondition = (rule: ModuleRule, triggerQuestion: QuestionWithContext, triggerAnswer: any): boolean => {
    const operator = rule.operator || 'equals';
    const ruleValueRaw = String(rule.trigger_answer ?? '');
    const ruleValueNormalized = ruleValueRaw.toLowerCase();
    const answerValue =
      triggerAnswer !== null && triggerAnswer !== undefined ? String(triggerAnswer).toLowerCase() : '';

    switch (operator) {
      case 'equals': {
        if (triggerQuestion.type === 'multiple_choice') {
          const selected = Array.isArray(triggerAnswer) ? triggerAnswer.map((v) => String(v)) : [];
          return selected.includes(String(rule.trigger_answer));
        }
        if (triggerQuestion.type === 'matrix') {
          const parsed = parseMatrixRuleTarget(String(rule.trigger_answer));
          if (!parsed || !triggerAnswer || typeof triggerAnswer !== 'object') return false;
          return String((triggerAnswer as Record<string, any>)[parsed.rowId] ?? '') === parsed.colId;
        }
        if (triggerQuestion.type === 'yesno') {
          return normalizeBooleanLike(triggerAnswer) === normalizeBooleanLike(rule.trigger_answer);
        }
        if (triggerQuestion.type === 'open_numeric' || triggerQuestion.type === 'slider' || triggerQuestion.type === 'likert') {
          return Number(triggerAnswer) === Number(rule.trigger_answer);
        }
        return answerValue === ruleValueNormalized;
      }

      case 'not_equals': {
        if (triggerQuestion.type === 'multiple_choice') {
          const selected = Array.isArray(triggerAnswer) ? triggerAnswer.map((v) => String(v)) : [];
          return !selected.includes(String(rule.trigger_answer));
        }
        if (triggerQuestion.type === 'matrix') {
          const parsed = parseMatrixRuleTarget(String(rule.trigger_answer));
          if (!parsed || !triggerAnswer || typeof triggerAnswer !== 'object') return false;
          return String((triggerAnswer as Record<string, any>)[parsed.rowId] ?? '') !== parsed.colId;
        }
        if (triggerQuestion.type === 'yesno') {
          return normalizeBooleanLike(triggerAnswer) !== normalizeBooleanLike(rule.trigger_answer);
        }
        if (triggerQuestion.type === 'open_numeric' || triggerQuestion.type === 'slider' || triggerQuestion.type === 'likert') {
          return Number(triggerAnswer) !== Number(rule.trigger_answer);
        }
        return answerValue !== ruleValueNormalized;
      }

      case 'greater_than':
        return Number(triggerAnswer) > Number(rule.trigger_answer);

      case 'less_than':
        return Number(triggerAnswer) < Number(rule.trigger_answer);

      case 'between': {
        const min = Number(rule.trigger_answer);
        const max = Number(rule.trigger_answer_max);
        const answerNum = Number(triggerAnswer);
        if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(answerNum)) return false;
        return answerNum >= min && answerNum <= max;
      }

      case 'contains': {
        if (Array.isArray(triggerAnswer)) {
          return triggerAnswer.map((v) => String(v)).includes(String(rule.trigger_answer));
        }
        return String(triggerAnswer ?? '').toLowerCase().includes(ruleValueNormalized);
      }

      default:
        return false;
    }
  };

  const isQuestionVisible = useCallback((question: QuestionWithContext, answerState: Record<string, any>): boolean => {
    const moduleKey = question.moduleInstanceId || question.moduleId;
    const moduleRules = moduleRulesByKey.get(moduleKey) || [];
    if (moduleRules.length === 0) return true;

    const targetRules = moduleRules.filter((rule) => (rule.target_local_ids || []).includes(question.localId));
    if (targetRules.length === 0) return true;

    let hasShowRule = false;
    let showMatched = false;
    let hideMatched = false;

    for (const rule of targetRules) {
      const triggerQuestion = questionByModuleLocalId.get(`${moduleKey}:${rule.trigger_local_id}`);
      if (!triggerQuestion) continue;

      const triggerAnswer = answerState[triggerQuestion.questionKey];
      if (triggerAnswer === undefined || triggerAnswer === null || triggerAnswer === '') {
        if (rule.action === 'show') {
          hasShowRule = true;
        }
        continue;
      }

      const conditionMet = evaluateCondition(rule, triggerQuestion, triggerAnswer);
      if (rule.action === 'hide' && conditionMet) {
        hideMatched = true;
      } else if (rule.action === 'show') {
        hasShowRule = true;
        if (conditionMet) {
          showMatched = true;
        }
      }
    }

    if (hideMatched) return false;
    if (hasShowRule && !showMatched) return false;
    return true;
  }, [moduleRulesByKey, questionByModuleLocalId]);

  const findNextVisibleIndex = useCallback((fromIndex: number, answerState: Record<string, any>): number => {
    for (let i = fromIndex + 1; i < allQuestions.length; i += 1) {
      if (isQuestionVisible(allQuestions[i], answerState)) return i;
    }
    return -1;
  }, [allQuestions, isQuestionVisible]);

  const findPrevVisibleIndex = useCallback((fromIndex: number, answerState: Record<string, any>): number => {
    for (let i = fromIndex - 1; i >= 0; i -= 1) {
      if (isQuestionVisible(allQuestions[i], answerState)) return i;
    }
    return -1;
  }, [allQuestions, isQuestionVisible]);

  const currentQuestion = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;
  const visibleQuestionIndices = useMemo(
    () => allQuestions.map((question, index) => (isQuestionVisible(question, answers) ? index : -1)).filter((i) => i >= 0),
    [allQuestions, answers, isQuestionVisible]
  );
  const visibleQuestionCount = visibleQuestionIndices.length;
  const currentVisiblePosition = visibleQuestionIndices.findIndex((i) => i === currentIndex);

  // Calculate progress
  const zeitSteps = zeiterfassungActive ? 2 : 0;
  const totalSteps = Math.max(visibleQuestionCount + zeitSteps, 1);
  const currentStep = zeiterfassungStep === 'start'
    ? 1
    : zeiterfassungStep === 'end'
      ? totalSteps
      : Math.max((currentVisiblePosition >= 0 ? currentVisiblePosition + 1 : 1) + (zeiterfassungActive ? 1 : 0), 1);
  const progress = (currentStep / totalSteps) * 100;
  const hasNextVisibleQuestion =
    zeiterfassungStep === 'questions' &&
    !!currentQuestion &&
    findNextVisibleIndex(currentIndex, answers) >= 0;
  const hasPrevVisibleQuestion =
    zeiterfassungStep === 'questions' && findPrevVisibleIndex(currentIndex, answers) >= 0;

  useEffect(() => {
    if (zeiterfassungStep !== 'questions') return;
    if (totalQuestions === 0) return;

    if (visibleQuestionCount === 0) {
      if (zeiterfassungActive) {
        setZeiterfassungStep('end');
      } else {
        setIsCompleted(true);
      }
      return;
    }

    if (currentQuestion && !isQuestionVisible(currentQuestion, answers)) {
      const nextVisible = findNextVisibleIndex(currentIndex - 1, answers);
      if (nextVisible >= 0) {
        setCurrentIndex(nextVisible);
        return;
      }

      const prevVisible = findPrevVisibleIndex(currentIndex + 1, answers);
      if (prevVisible >= 0) {
        setCurrentIndex(prevVisible);
      }
    }
  }, [
    zeiterfassungStep,
    totalQuestions,
    visibleQuestionCount,
    zeiterfassungActive,
    currentQuestion,
    currentIndex,
    answers,
    isQuestionVisible,
    findNextVisibleIndex,
    findPrevVisibleIndex
  ]);

  // Time helpers
  const getCurrentTime = (): string => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const calculateTimeDiff = (von: string, bis: string): string => {
    if (!von || !bis) return '--:--:--';
    const [vonH, vonM] = von.split(':').map(Number);
    const [bisH, bisM] = bis.split(':').map(Number);
    let diffMinutes = (bisH * 60 + bisM) - (vonH * 60 + vonM);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  // Reserved for future use when Fahrzeit UI is restored
  const _toggleFahrzeitTimer = () => {
    const currentTime = getCurrentTime();
    if (!fahrzeitRunning) {
      setZeiterfassung(prev => ({ ...prev, fahrzeitVon: currentTime }));
      setFahrzeitRunning(true);
    } else {
      setZeiterfassung(prev => ({ ...prev, fahrzeitBis: currentTime }));
      setFahrzeitRunning(false);
    }
  };
  void _toggleFahrzeitTimer;

  const toggleBesuchszeitTimer = async () => {
    const currentTime = getCurrentTime();
    if (!besuchszeitRunning) {
      if (!visitStarted) {
        await startMarketVisit();
      } else {
        setZeiterfassung(prev => ({ ...prev, besuchszeitVon: prev.besuchszeitVon || currentTime }));
      }
      setBesuchszeitRunning(true);
    } else {
      setZeiterfassung(prev => ({ ...prev, besuchszeitBis: currentTime, marketEndTime: currentTime }));
      setBesuchszeitRunning(false);

      if (submissionId) {
        try {
          await fragebogenService.zeiterfassung.update(submissionId, { besuchszeit_bis: currentTime });
          updateActiveVisit({ besuchszeitBis: currentTime, pendingSync: {} });
        } catch {
          updateActiveVisit({ besuchszeitBis: currentTime });
          updatePendingSync({ bis: true });
        }
      } else {
        updateActiveVisit({ besuchszeitBis: currentTime });
        updatePendingSync({ bis: true });
      }
    }
  };

  const handleAnswer = (value: any) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.questionKey]: value }));
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Foto konnte nicht gelesen werden.'));
      reader.readAsDataURL(file);
    });

  const uploadPhotoAnswer = async (question: QuestionWithContext, file: File): Promise<string> => {
    if (!user?.id) {
      throw new Error('Benutzer nicht erkannt. Bitte neu anmelden.');
    }
    const resolvedFragebogenId = question.fragebogenId || fragebogenId;
    if (!resolvedFragebogenId) {
      throw new Error('Fragebogen-Kontext fehlt.');
    }

    const responseId = await ensureResponseRun(resolvedFragebogenId);
    if (!responseId) {
      throw new Error('Antwortlauf konnte nicht gestartet werden.');
    }

    const image = await readFileAsDataUrl(file);
    const uploaded = await fragebogenService.responses.uploadPhoto({
      image,
      fragebogen_id: resolvedFragebogenId,
      market_id: market.id,
      gebietsleiter_id: user.id,
      response_id: responseId,
      question_id: question.id,
      filename: file.name
    });

    if (!uploaded?.url) {
      throw new Error('Upload erfolgreich, aber keine URL erhalten.');
    }
    return uploaded.url;
  };

  const openPhotoPicker = (question: QuestionWithContext) => {
    photoQuestionRef.current = question;
    photoInputRef.current?.click();
  };

  const handlePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!selectedFile) return;

    const question = photoQuestionRef.current;
    if (!question) return;

    setSaveError(null);
    setSyncError(null);
    setPhotoUploadInProgressKey(question.questionKey);
    try {
      const uploadedUrl = await uploadPhotoAnswer(question, selectedFile);
      setAnswers(prev => ({ ...prev, [question.questionKey]: uploadedUrl }));
    } catch (error: any) {
      setSaveError(error?.message || 'Foto konnte nicht hochgeladen werden.');
    } finally {
      setPhotoUploadInProgressKey(null);
    }
  };

  /** Build a typed AnswerPayload from a raw answer value */
  const buildAnswerPayload = (question: QuestionWithContext, value: any) => {
    if (value === undefined || value === null) return null;
    const base = { question_id: question.id, module_id: question.moduleId, question_type: question.type as any };
    switch (question.type) {
      case 'yesno':
        return { ...base, answer_boolean: value === true };
      case 'open_numeric':
      case 'slider':
      case 'likert':
        return { ...base, answer_numeric: typeof value === 'number' ? value : parseFloat(value) };
      case 'single_choice':
      case 'barcode_scanner':
        return { ...base, answer_text: String(value) };
      case 'open_text':
        return { ...base, answer_text: String(value) };
      case 'multiple_choice':
        return { ...base, answer_json: Array.isArray(value) ? value : [value] };
      case 'matrix':
        return { ...base, answer_json: value };
      case 'photo_upload':
        return { ...base, answer_file_url: String(value) };
      default:
        return { ...base, answer_text: String(value) };
    }
  };

  /** Add a question answer to the pending sync queue (overwrites any prior queued value for the same question). */
  const enqueueAnswer = (question: QuestionWithContext, value: any) => {
    pendingAnswersRef.current.set(question.questionKey, { question, value });
    setPendingSyncCount(pendingAnswersRef.current.size);
  };

  /**
   * Flush all queued answers to the backend.
   * Returns true when the queue is fully drained, false if any items remain.
   * Re-entrant-safe: a concurrent flush is skipped and the caller gets an accurate empty-check result.
   */
  const flushPendingAnswers = async (): Promise<boolean> => {
    if (isSyncingRef.current) return pendingAnswersRef.current.size === 0;
    if (pendingAnswersRef.current.size === 0) return true;
    if (!hasFragebogen) {
      pendingAnswersRef.current.clear();
      setPendingSyncCount(0);
      return true;
    }

    isSyncingRef.current = true;
    try {
      for (const [questionKey, { question, value }] of Array.from(pendingAnswersRef.current.entries())) {
        const payload = buildAnswerPayload(question, value);
        if (!payload) {
          pendingAnswersRef.current.delete(questionKey);
          continue;
        }
        const questionFragebogenId = question.fragebogenId || fragebogenId;
        const currentResponseId = await ensureResponseRun(questionFragebogenId);
        if (!currentResponseId) {
          continue;
        }
        try {
          await fragebogenService.responses.update(currentResponseId, [payload]);
          pendingAnswersRef.current.delete(questionKey);
        } catch {
          // Keep failed item in queue; next flush will retry it.
        }
      }
    } finally {
      isSyncingRef.current = false;
    }

    setPendingSyncCount(pendingAnswersRef.current.size);
    const allSynced = pendingAnswersRef.current.size === 0;
    if (!allSynced) {
      setSyncError('Einige Antworten konnten nicht gespeichert werden.');
    } else {
      setSyncError(null);
    }
    return allSynced;
  };

  const completeAllResponseRuns = async (): Promise<boolean> => {
    const responseIds = Object.values(responseIdByFragebogenId);
    if (responseIds.length === 0) return true;
    for (const id of responseIds) {
      try {
        await fragebogenService.responses.complete(id);
      } catch {
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    // 'start' step is no longer used - Fahrzeit is auto-calculated by day tracking
    if (zeiterfassungStep === 'start') {
      if (totalQuestions === 0) {
        if (zeiterfassungActive) {
          setZeiterfassungStep('end');
        } else {
          setIsCompleted(true);
        }
      } else {
        setZeiterfassungStep('questions');
      }
      return;
    }
    
    if (zeiterfassungStep === 'questions') {
      // Enqueue the current answer for background sync — navigation never waits for this.
      if (currentQuestion && answers[currentQuestion.questionKey] !== undefined) {
        enqueueAnswer(currentQuestion as QuestionWithContext, answers[currentQuestion.questionKey]);
      }

      setSaveError(null);
      setSyncError(null);

      const nextVisibleIndex = findNextVisibleIndex(currentIndex, answers);
      if (nextVisibleIndex >= 0) {
        // Advance immediately to next visible question; flush runs in background
        setCurrentIndex(nextVisibleIndex);
        void flushPendingAnswers();
      } else if (zeiterfassungActive) {
        // Move to end step; flush runs in background
        setZeiterfassungStep('end');
        void flushPendingAnswers();
      } else {
        // Last question with no Zeiterfassung — must fully flush before completing
        setIsSavingAnswer(true);
        const allFlushed = await flushPendingAnswers();
        if (!allFlushed) {
          setIsSavingAnswer(false);
          setSaveError('Antworten konnten nicht gespeichert werden. Bitte erneut versuchen.');
          return;
        }
        if (hasFragebogen) {
          const allCompleted = await completeAllResponseRuns();
          if (!allCompleted) {
            setIsSavingAnswer(false);
            setSaveError('Abschluss konnte nicht gespeichert werden. Bitte erneut versuchen.');
            return;
          }
          setIsSavingAnswer(false);
        }
        setIsCompleted(true);
      }
      return;
    }
    
    if (zeiterfassungStep === 'end') {
      // Flush any pending answers before completing the response run
      if (hasFragebogen) {
        setIsSavingAnswer(true);
        const allFlushed = await flushPendingAnswers();
        if (!allFlushed) {
          setIsSavingAnswer(false);
          setSaveError('Antworten konnten nicht gespeichert werden. Bitte erneut versuchen.');
          return;
        }
        const allCompleted = await completeAllResponseRuns();
        if (!allCompleted) {
          setIsSavingAnswer(false);
          setSaveError('Abschluss konnte nicht gespeichert werden. Bitte erneut versuchen.');
          return;
        }
        setIsSavingAnswer(false);
      }

      const now = new Date();
      const endTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const needsBis = !zeiterfassung.besuchszeitBis;
      setZeiterfassung(prev => ({
        ...prev,
        marketEndTime: endTime,
        besuchszeitBis: prev.besuchszeitBis || endTime
      }));

      setSaveError(null);
      setIsCompleted(true);

      if (needsBis && submissionId) {
        try {
          await fragebogenService.zeiterfassung.update(submissionId, { besuchszeit_bis: endTime });
          updateActiveVisit({ besuchszeitBis: endTime, pendingSync: {} });
        } catch {
          updateActiveVisit({ besuchszeitBis: endTime });
          updatePendingSync({ bis: true });
        }
      }
    }
  };
  
  const debouncedPatch = useCallback((field: string, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const localKey = field === 'besuchszeit_von' ? 'besuchszeitVon'
        : field === 'besuchszeit_bis' ? 'besuchszeitBis'
        : field;
      updateActiveVisit({ [localKey]: value } as Partial<PersistedVisit>);
      if (submissionId) {
        try {
          await fragebogenService.zeiterfassung.update(submissionId, { [field]: value });
        } catch {
          if (field === 'besuchszeit_von') updatePendingSync({ von: true });
          else if (field === 'besuchszeit_bis') updatePendingSync({ bis: true });
          else updatePendingSync({ final: true });
        }
      }
    }, 500);
  }, [submissionId]);

  const handleCompleteAndClose = async () => {
    if (submissionId) {
      try {
        await fragebogenService.zeiterfassung.update(submissionId, {
          besuchszeit_von: zeiterfassung.besuchszeitVon,
          besuchszeit_bis: zeiterfassung.besuchszeitBis,
          kommentar: zeiterfassung.kommentar,
          food_prozent: zeiterfassung.foodProzent
        });
        clearActiveVisit();
      } catch {
        updateActiveVisit({
          besuchszeitVon: zeiterfassung.besuchszeitVon,
          besuchszeitBis: zeiterfassung.besuchszeitBis || null,
          kommentar: zeiterfassung.kommentar,
          foodProzent: zeiterfassung.foodProzent
        });
        updatePendingSync({ final: true });
      }
    } else {
      clearActiveVisit();
    }
    onComplete({ ...answers, zeiterfassung, submissionId, responseIdByFragebogenId });
  };

  const handlePrev = () => {
    if (zeiterfassungStep === 'end') {
      // Go back to questions (no longer going to 'start' - Fahrzeit is auto-calculated)
      if (totalQuestions > 0) {
        const lastVisibleIndex = visibleQuestionIndices[visibleQuestionIndices.length - 1];
        if (lastVisibleIndex !== undefined) {
          setZeiterfassungStep('questions');
          setCurrentIndex(lastVisibleIndex);
        }
      }
      // If no questions, stay on 'end' (can't go back further)
      return;
    }
    
    if (zeiterfassungStep === 'questions' && currentIndex > 0) {
      const prevVisibleIndex = findPrevVisibleIndex(currentIndex, answers);
      if (prevVisibleIndex >= 0) {
        setCurrentIndex(prevVisibleIndex);
      }
      return;
    }
    
    // At first question - can't go back further (no 'start' step anymore)
    // User can only close the visit
  };

  const canProceed = () => {
    // Block navigation while a save is in flight
    if (isSavingAnswer) return false;
    // 'start' step is no longer used - always allow proceeding
    if (zeiterfassungStep === 'start') {
      return true;
    }
    if (zeiterfassungStep === 'end') {
      return !!(zeiterfassung.besuchszeitVon && zeiterfassung.besuchszeitBis);
    }
    // If in 'questions' step but no questions exist, allow proceeding
    if (zeiterfassungStep === 'questions' && totalQuestions === 0) {
      return true;
    }
    if (!currentQuestion) return false;
    if (!isQuestionVisible(currentQuestion, answers)) return true;
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.questionKey];
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  // Render question based on type
  const renderQuestionInput = () => {
    if (!currentQuestion) return null;
    const answer = answers[currentQuestion.questionKey];

    switch (currentQuestion.type) {
      case 'single_choice':
        return (
          <div className={styles.optionsGrid}>
            {currentQuestion.options?.map((option) => (
              <button
                key={option.id}
                className={`${styles.optionButton} ${answer === option.id ? styles.optionButtonSelected : ''}`}
                onClick={() => handleAnswer(option.id)}
              >
                <RadioButton size={20} weight={answer === option.id ? 'fill' : 'regular'} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        );

      case 'multiple_choice':
        const selectedOptions = answer || [];
        return (
          <div className={styles.optionsGrid}>
            {currentQuestion.options?.map((option) => {
              const isSelected = selectedOptions.includes(option.id);
              return (
                <button
                  key={option.id}
                  className={`${styles.optionButton} ${isSelected ? styles.optionButtonSelected : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      handleAnswer(selectedOptions.filter((id: string) => id !== option.id));
                    } else {
                      handleAnswer([...selectedOptions, option.id]);
                    }
                  }}
                >
                  <RadioButton size={20} weight={isSelected ? 'fill' : 'regular'} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        );

      case 'yesno':
        return (
          <div className={styles.yesnoGrid}>
            <button
              className={`${styles.yesnoButton} ${styles.yesButton} ${answer === true ? styles.yesnoButtonSelected : ''}`}
              onClick={() => handleAnswer(true)}
            >
              <ThumbsUp size={32} weight={answer === true ? 'fill' : 'regular'} />
              <span>Ja</span>
            </button>
            <button
              className={`${styles.yesnoButton} ${styles.noButton} ${answer === false ? styles.yesnoButtonSelected : ''}`}
              onClick={() => handleAnswer(false)}
            >
              <ThumbsDown size={32} weight={answer === false ? 'fill' : 'regular'} />
              <span>Nein</span>
            </button>
          </div>
        );

      case 'likert':
        const scale = currentQuestion.likertScale || { min: 1, max: 5 };
        const scaleValues = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
        const getLikertColorClass = (val: number, isSelected: boolean) => {
          if (!isSelected) return '';
          const total = scaleValues.length;
          const index = scaleValues.indexOf(val);
          if (index === 0) return styles.likertRed;
          if (index === total - 1) return styles.likertGreen;
          if (index === 1 && total >= 4) return styles.likertOrange;
          if (index === total - 2 && total >= 4) return styles.likertLightGreen;
          return styles.likertYellow;
        };
        return (
          <div className={styles.likertContainer}>
            <div className={styles.likertScale}>
              {scale.minLabel && <span className={styles.likertLabelLeft}>{scale.minLabel}</span>}
              {scaleValues.map(val => (
                <button
                  key={val}
                  className={`${styles.likertButton} ${answer === val ? styles.likertButtonSelected : ''} ${getLikertColorClass(val, answer === val)}`}
                  onClick={() => handleAnswer(val)}
                >
                  {val}
                </button>
              ))}
              {scale.maxLabel && <span className={styles.likertLabelRight}>{scale.maxLabel}</span>}
            </div>
          </div>
        );

      case 'open_text':
        return (
          <textarea
            className={styles.textInput}
            value={answer || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Ihre Antwort..."
            rows={4}
          />
        );

      case 'open_numeric':
        return (
          <div className={styles.numericContainer}>
            <input
              type="number"
              className={styles.numericInput}
              value={answer || ''}
              onChange={(e) => handleAnswer(e.target.value ? Number(e.target.value) : '')}
              placeholder="0"
              min={currentQuestion.numericConstraints?.min}
              max={currentQuestion.numericConstraints?.max}
            />
            {currentQuestion.numericConstraints?.unit && (
              <span className={styles.numericUnit}>{currentQuestion.numericConstraints.unit}</span>
            )}
          </div>
        );

      case 'slider':
        const sliderConfig = currentQuestion.sliderConfig || { min: 0, max: 100, step: 1 };
        const sliderValue = answer !== undefined ? answer : sliderConfig.min;
        const sliderValueStr = String(sliderValue);
        return (
          <div className={styles.sliderContainer}>
            <div className={styles.sliderValueWrapper}>
              {sliderValueStr.split('').map((char, idx) => (
                <span 
                  key={idx}
                  className={styles.sliderValueDigit}
                >
                  {char}
                </span>
              ))}
              {sliderConfig.unit && <span className={styles.sliderUnit}>{sliderConfig.unit}</span>}
            </div>
            <div className={styles.sliderWrapper}>
              <div className={styles.sliderLabels}>
                <span>{sliderConfig.min}</span>
                <span>{sliderConfig.max}</span>
              </div>
              <input
                type="range"
                className={styles.sliderInput}
                value={sliderValue}
                onChange={(e) => handleAnswer(Number(e.target.value))}
                min={sliderConfig.min}
                max={sliderConfig.max}
                step={sliderConfig.step}
              />
            </div>
          </div>
        );

      case 'photo_upload':
        const photoUploading = photoUploadInProgressKey === currentQuestion.questionKey;
        const photoAnswerUrl = typeof answer === 'string' ? answer : '';
        return (
          <div className={styles.photoUpload}>
            <Camera size={48} weight="regular" />
            <p>Tippen um Foto aufzunehmen oder auszuwählen</p>
            <button 
              type="button"
              className={styles.photoButton}
              onClick={() => openPhotoPicker(currentQuestion as QuestionWithContext)}
              disabled={photoUploading}
            >
              <Camera size={20} />
              <span>{photoUploading ? 'Foto wird hochgeladen…' : 'Foto aufnehmen'}</span>
            </button>
            {photoAnswerUrl && (
              <>
                <img src={photoAnswerUrl} alt="Hochgeladenes Foto" className={styles.photoPreview} />
                <span className={styles.photoConfirm}>Foto hochgeladen</span>
              </>
            )}
          </div>
        );

      case 'barcode_scanner':
        return (
          <div className={styles.barcodeScanner}>
            <Barcode size={48} weight="regular" />
            <p>Barcode scannen</p>
            <button 
              className={styles.barcodeButton}
              onClick={() => handleAnswer('4012345678901')}
            >
              <Barcode size={20} />
              <span>Scanner öffnen</span>
            </button>
            {answer && <span className={styles.barcodeResult}>{answer}</span>}
          </div>
        );

      case 'matrix':
        return (
          <div className={styles.matrixContainer}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th></th>
                  {currentQuestion.matrixColumns?.map((col) => (
                    <th key={col.id}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentQuestion.matrixRows?.map((row) => {
                  const matrixAnswers = answer || {};
                  const isSelected = (colId: string) => matrixAnswers[row.id] === colId;
                  return (
                    <tr key={row.id}>
                      <td className={styles.matrixRowLabel}>{row.label}</td>
                      {currentQuestion.matrixColumns?.map((col) => (
                        <td key={col.id}>
                          <button
                            className={`${styles.matrixCell} ${isSelected(col.id) ? styles.matrixCellSelected : ''}`}
                            onClick={() => handleAnswer({ ...matrixAnswers, [row.id]: col.id })}
                          >
                            {isSelected(col.id) && <Check size={16} weight="bold" />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      default:
        return <p>Unbekannter Fragetyp</p>;
    }
  };

  // Get question type icon
  const getQuestionIcon = (type: QuestionType) => {
    switch (type) {
      case 'single_choice': return <RadioButton size={24} weight="fill" />;
      case 'multiple_choice': return <CheckSquare size={24} weight="fill" />;
      case 'yesno': return <ThumbsUp size={24} weight="fill" />;
      case 'likert': return <SlidersHorizontal size={24} weight="fill" />;
      case 'open_text': return <TextT size={24} weight="fill" />;
      case 'open_numeric': return <Hash size={24} weight="fill" />;
      case 'slider': return <SlidersHorizontal size={24} weight="fill" />;
      case 'photo_upload': return <Camera size={24} weight="fill" />;
      case 'barcode_scanner': return <Barcode size={24} weight="fill" />;
      case 'matrix': return <Table size={24} weight="fill" />;
      default: return <TextT size={24} weight="fill" />;
    }
  };

  // Get question type label
  const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
      case 'single_choice': return 'Single Choice';
      case 'multiple_choice': return 'Multiple Choice';
      case 'yesno': return 'Ja/Nein';
      case 'likert': return 'Likert-Skala';
      case 'open_text': return 'Freitext';
      case 'open_numeric': return 'Numerisch';
      case 'slider': return 'Slider';
      case 'photo_upload': return 'Foto Upload';
      case 'barcode_scanner': return 'Barcode Scanner';
      case 'matrix': return 'Matrix';
      default: return 'Frage';
    }
  };

  // Render Zeiterfassung Start (Legacy - no longer used, Fahrzeit is auto-calculated)
  const renderZeiterfassungStart = () => (
    <div className={styles.zeitContainer}>
      <div className={styles.zeitHeader}>
        <div className={styles.zeitIcon}>
          <Timer size={28} weight="fill" />
        </div>
        <h3 className={styles.zeitTitle}>Marktbesuch gestartet</h3>
        <p className={styles.zeitSubtitle}>Fahrzeit wird automatisch berechnet</p>
      </div>
      
      <div className={styles.zeitFields}>
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <Car size={18} weight="fill" />
            <span>Fahrzeit</span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-lg)' }}>
            Fahrzeit wird automatisch aus der Tageserfassung berechnet.
          </p>
        </div>
      </div>
    </div>
  );

  // Render Zeiterfassung End
  const renderZeiterfassungEnd = () => (
    <div className={styles.zeitContainer}>
      <div className={styles.zeitHeaderWrapper}>
        <div className={styles.zeitHeader}>
          <div className={styles.zeitIcon}>
            <Timer size={28} weight="fill" />
          </div>
          <h3 className={styles.zeitTitle}>Abschluss</h3>
          <p className={styles.zeitSubtitle}>Besuchszeit und Aufteilung</p>
        </div>
        
        {/* Quick Actions Button */}
        <div 
          ref={quickActionsRef}
          className={`${styles.quickActionsBtn} ${quickActionsExpanded ? styles.expanded : ''}`}
        >
          <button
            type="button"
            className={styles.quickActionsToggle}
            onClick={() => setQuickActionsExpanded(!quickActionsExpanded)}
          >
            <DotsThree 
              size={26} 
              weight="bold" 
              className={`${styles.dotsIcon} ${quickActionsExpanded ? styles.spinning : ''}`} 
            />
          </button>
          <div className={styles.quickActionsPill}>
            <button
              type="button"
              className={styles.quickActionItem}
              onClick={(e) => {
                e.stopPropagation();
                setQuickActionsExpanded(false);
                onOpenVorbesteller();
              }}
              title="Vorbesteller"
            >
              <CalendarCheck size={24} weight="fill" />
            </button>
            <button
              type="button"
              className={styles.quickActionItem}
              onClick={(e) => {
                e.stopPropagation();
                setQuickActionsExpanded(false);
                onOpenVorverkauf();
              }}
              title="Vorverkauf"
            >
              <Receipt size={24} weight="fill" />
            </button>
            <button
              type="button"
              className={styles.quickActionItem}
              onClick={(e) => {
                e.stopPropagation();
                setQuickActionsExpanded(false);
                onOpenProduktrechner();
              }}
              title="Produkttausch"
            >
              <Calculator size={24} weight="fill" />
            </button>
          </div>
        </div>
      </div>
      
      <div className={styles.zeitFields}>
        {/* Besuchszeit Section */}
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <Timer size={18} weight="fill" />
            <span>Besuchszeit</span>
          </div>
          
          <div className={styles.timeRow}>
            <div className={styles.timeField}>
              <span className={styles.timeLabel}>Von</span>
              <input
                type="text"
                className={styles.timeInput}
                value={zeiterfassung.besuchszeitVon}
                onChange={(e) => {
                  const val = e.target.value;
                  setZeiterfassung(prev => ({ ...prev, besuchszeitVon: val }));
                  debouncedPatch('besuchszeit_von', val);
                }}
                placeholder="--:--"
                maxLength={5}
              />
            </div>
            <div className={styles.timeField}>
              <span className={styles.timeLabel}>Bis</span>
              <input
                type="text"
                className={styles.timeInput}
                value={zeiterfassung.besuchszeitBis}
                onChange={(e) => {
                  const val = e.target.value;
                  setZeiterfassung(prev => ({ ...prev, besuchszeitBis: val }));
                  debouncedPatch('besuchszeit_bis', val);
                }}
                placeholder="--:--"
                maxLength={5}
              />
            </div>
            <div className={styles.timeFieldNarrow}>
              <span className={styles.timeLabel}>Dauer</span>
              <div className={styles.timeDuration}>
                {besuchszeitRunning ? formatElapsed(besuchszeitElapsed) : calculateTimeDiff(zeiterfassung.besuchszeitVon, zeiterfassung.besuchszeitBis)}
              </div>
            </div>
          </div>
        </div>

        {/* Kommentar */}
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <ChatText size={18} weight="fill" />
            <span>Kommentar</span>
            <span className={styles.optionalBadge}>Optional</span>
          </div>
          <textarea
            className={styles.kommentarInput}
            value={zeiterfassung.kommentar}
            onChange={(e) => setZeiterfassung(prev => ({ ...prev, kommentar: e.target.value }))}
            placeholder="Anmerkungen zum Besuch..."
            rows={2}
          />
        </div>

        {/* Food/Pets */}
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <ChartPie size={18} weight="fill" />
            <span>Zeitaufteilung Food / Pets</span>
          </div>
          <div className={styles.foodSliderContainer}>
            <input
              type="range"
              className={styles.foodSlider}
              value={zeiterfassung.foodProzent}
              onChange={(e) => setZeiterfassung(prev => ({ ...prev, foodProzent: Number(e.target.value) }))}
              min="0"
              max="100"
              step="5"
            />
            <div className={styles.foodLabels}>
              <div className={styles.foodLabel}>
                <span>Food</span>
                <span className={styles.foodValue}>{zeiterfassung.foodProzent}%</span>
              </div>
              <div className={styles.petsLabel}>
                <span>Pets</span>
                <span className={styles.petsValue}>{100 - zeiterfassung.foodProzent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Marktbesuch Button at bottom */}
        <div className={styles.timerButtonWrapper}>
          {zeiterfassung.besuchszeitVon && zeiterfassung.besuchszeitBis ? (
            <button type="button" className={styles.marktbesuchButtonDone}>
              <span>Marktbesuch beendet</span>
              <span className={styles.marktbesuchButtonDoneHint}>Besuchszeit oben noch änderbar</span>
            </button>
          ) : zeiterfassung.besuchszeitVon && !zeiterfassung.besuchszeitBis ? (
            <button 
              type="button"
              className={styles.marktbesuchButtonStop}
              onClick={toggleBesuchszeitTimer}
            >
              <span>Marktbesuch beenden</span>
              <span className={styles.marktbesuchTimer}>
                {formatElapsed(besuchszeitElapsed).split('').map((char, idx) => (
                  <span key={`${idx}-${char}`} className={styles.timerDigit}>{char}</span>
                ))}
              </span>
            </button>
          ) : (
            <button 
              type="button"
              className={styles.marktbesuchButtonStart}
              onClick={toggleBesuchszeitTimer}
            >
              <span>Marktbesuch starten</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Completed screen
  if (isCompleted) {
    const answeredQuestions = Object.keys(answers).length;
    const fahrzeitSummary = calculateTimeDiff(zeiterfassung.fahrzeitVon, zeiterfassung.fahrzeitBis);
    const besuchszeitSummary = calculateTimeDiff(zeiterfassung.besuchszeitVon, zeiterfassung.besuchszeitBis);
    
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.auroraBackground}>
          <Aurora
            colorStops={["#34D399", "#10B981", "#059669"]}
            blend={0.6}
            amplitude={0.8}
            speed={0.3}
          />
        </div>
        
        <div className={styles.completedScreen}>
          <div className={styles.completedIcon}>
            <Check size={48} weight="bold" />
          </div>
          <h2>Marktbesuch abgeschlossen</h2>
          <p>Alle Daten wurden erfolgreich gespeichert.</p>
          
          {/* Summary Section */}
          <div className={styles.completedSummary}>
            {/* Zeiterfassung Summary */}
            {zeiterfassungActive && (
              <>
                <div className={styles.summaryRow}>
                  <div className={styles.summaryItem}>
                    <Car size={20} weight="fill" className={styles.summaryIcon} />
                    <div className={styles.summaryContent}>
                      <span className={styles.summaryLabel}>Fahrzeit</span>
                      <span className={styles.summaryValue}>{fahrzeitSummary !== '--:--' ? fahrzeitSummary : '00:00'}</span>
                    </div>
                  </div>
                  <div className={styles.summaryItem}>
                    <Timer size={20} weight="fill" className={styles.summaryIcon} />
                    <div className={styles.summaryContent}>
                      <span className={styles.summaryLabel}>Besuchszeit</span>
                      <span className={styles.summaryValue}>{besuchszeitSummary !== '--:--' ? besuchszeitSummary : '00:00'}</span>
                    </div>
                  </div>
                </div>
                
                <div className={styles.summaryRow}>
                  <div className={styles.summaryItem}>
                    <ChartPie size={20} weight="fill" className={styles.summaryIcon} />
                    <div className={styles.summaryContent}>
                      <span className={styles.summaryLabel}>Food / Pets</span>
                      <span className={styles.summaryValue}>{zeiterfassung.foodProzent}% / {100 - zeiterfassung.foodProzent}%</span>
                    </div>
                  </div>
                  <div className={styles.summaryItem}>
                    <CheckSquare size={20} weight="fill" className={styles.summaryIcon} />
                    <div className={styles.summaryContent}>
                      <span className={styles.summaryLabel}>Fragen beantwortet</span>
                      <span className={styles.summaryValue}>{answeredQuestions} / {totalQuestions}</span>
                    </div>
                  </div>
                </div>
                
                {zeiterfassung.kommentar && (
                  <div className={styles.summaryComment}>
                    <ChatText size={18} weight="fill" className={styles.summaryIcon} />
                    <div className={styles.summaryContent}>
                      <span className={styles.summaryLabel}>Kommentar</span>
                      <span className={styles.summaryCommentText}>{zeiterfassung.kommentar}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {!zeiterfassungActive && (
              <div className={styles.summaryRow}>
                <div className={styles.summaryItem}>
                  <CheckSquare size={20} weight="fill" className={styles.summaryIcon} />
                  <div className={styles.summaryContent}>
                    <span className={styles.summaryLabel}>Fragen beantwortet</span>
                    <span className={styles.summaryValue}>{answeredQuestions} / {totalQuestions}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button className={styles.closeButton} onClick={handleCompleteAndClose}>
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Aurora Background */}
      <div className={styles.auroraBackground}>
        <Aurora
          colorStops={["#60A5FA", "#3B82F6", "#1E40AF"]}
          blend={0.6}
          amplitude={0.8}
          speed={0.3}
        />
      </div>

      {/* Main container with max-width like TourPage */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Progress Bar */}
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressText}>{currentStep} / {totalSteps}</span>
          </div>

          {/* Module Indicator */}
          <div className={styles.moduleIndicator}>
            {zeiterfassungStep === 'start' && 'Marktbesuch gestartet'}
            {zeiterfassungStep === 'end' && 'Zeiterfassung - Abschluss'}
            {zeiterfassungStep === 'questions' && currentQuestion && currentQuestion.moduleName}
            {zeiterfassungStep === 'questions' && !currentQuestion && totalQuestions === 0 && 'Marktbesuch'}
          </div>

          {/* Content - no card container */}
          <div className={styles.content}>
            {zeiterfassungStep === 'start' ? (
              renderZeiterfassungStart()
            ) : zeiterfassungStep === 'end' ? (
              renderZeiterfassungEnd()
            ) : currentQuestion ? (
              <div className={styles.questionContent}>
                <div className={styles.questionHeader}>
                  <div className={styles.questionTypeIcon}>
                    {getQuestionIcon(currentQuestion.type)}
                  </div>
                  <span className={styles.questionTypeLabel}>
                    {getQuestionTypeLabel(currentQuestion.type)}
                  </span>
                </div>
                
                <h2 className={styles.questionText}>{currentQuestion.questionText}</h2>
                
                {currentQuestion.instruction && (
                  <p className={styles.questionInstruction}>{currentQuestion.instruction}</p>
                )}

                {/* Question images — shown between text/instruction and answer controls */}
                {Array.isArray(currentQuestion.images) && currentQuestion.images.filter(Boolean).length > 0 && (
                  <div className={`${styles.questionImagesSection} ${currentQuestion.images.filter(Boolean).length === 1 ? styles.questionImagesSingle : styles.questionImagesMulti}`}>
                    {currentQuestion.images.filter(Boolean).map((url, idx) => (
                      <div key={idx} className={styles.questionImageCard}>
                        <img
                          src={url}
                          alt={`Fragebild ${idx + 1}`}
                          className={styles.questionImage}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={styles.inputArea}>
                  {renderQuestionInput()}
                </div>
              </div>
            ) : null}
            
            {/* Marktbesuch Timer Button - fixed at bottom above footer */}
            {zeiterfassungStep === 'questions' && zeiterfassungActive && (
              <div className={styles.marktbesuchButtonWrapper}>
                {zeiterfassung.besuchszeitVon && zeiterfassung.besuchszeitBis ? (
                  <button className={styles.marktbesuchButtonDone}>
                    <span>Marktbesuch beendet</span>
                    <span className={styles.marktbesuchButtonDoneHint}>Besuchszeit oben noch änderbar</span>
                  </button>
                ) : zeiterfassung.besuchszeitVon && !zeiterfassung.besuchszeitBis ? (
                  <button 
                    className={styles.marktbesuchButtonStop}
                    onClick={toggleBesuchszeitTimer}
                  >
                    <span>Marktbesuch beenden</span>
                    <span className={styles.marktbesuchTimer}>
                      {formatElapsed(besuchszeitElapsed).split('').map((char, idx) => (
                        <span key={`${idx}-${char}`} className={styles.timerDigit}>{char}</span>
                      ))}
                    </span>
                  </button>
                ) : (
                  <button 
                    className={styles.marktbesuchButtonStart}
                    onClick={toggleBesuchszeitTimer}
                  >
                    <span>Marktbesuch starten</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed Navigation Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          {syncError && !saveError && (
            <div className={styles.syncErrorBanner}>
              <span>{syncError}</span>
              <button
                className={styles.saveErrorRetry}
                onClick={() => {
                  setSyncError(null);
                  void flushPendingAnswers();
                }}
              >
                Erneut versuchen
              </button>
            </div>
          )}
          {saveError && (
            <div className={styles.saveErrorBanner}>
              <span>{saveError}</span>
              <button
                className={styles.saveErrorRetry}
                onClick={() => {
                  setSaveError(null);
                  handleNext();
                }}
              >
                Erneut versuchen
              </button>
            </div>
          )}
          {pendingSyncCount > 0 && !syncError && !saveError && !isSavingAnswer && (
            <div className={styles.syncingIndicator}>
              <span>Antworten werden synchronisiert…</span>
            </div>
          )}
          <div className={styles.footerButtons}>
          <button 
            className={styles.navButton}
            onClick={handlePrev}
            disabled={zeiterfassungStep === 'start' || (zeiterfassungStep === 'questions' && !hasPrevVisibleQuestion)}
          >
            <ArrowLeft size={20} />
            <span>Zurück</span>
          </button>
          
          <button 
            className={styles.navButtonPrimary}
            onClick={handleNext}
            disabled={!canProceed()}
          >
            <span>
              {zeiterfassungStep === 'end' || (!zeiterfassungActive && !hasNextVisibleQuestion) 
                ? 'Abschließen' 
                : isSavingAnswer ? 'Speichern…' : 'Weiter'}
            </span>
            {zeiterfassungStep === 'end' || (!zeiterfassungActive && !hasNextVisibleQuestion) 
              ? <Check size={20} />
              : <ArrowRight size={20} />}
          </button>
          </div>
        </div>
      </footer>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoFileChange}
      />
    </div>
  );
};
