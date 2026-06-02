import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaretDown, Camera, Check, CircleNotch, FloppyDisk, PencilSimple, X } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import fragebogenService, {
  type AnswerPayload,
  type GLHistoryQuestion,
  type GLHistoryRun,
  type ModuleRule,
  type Question,
  type QuestionType
} from '../../services/fragebogenService';
import styles from './VorbestellerHistoryPage.module.css';

type DraftMap = Record<string, any>;

interface HistoryQuestionContext {
  moduleId: string;
  moduleName: string;
  localId: string;
  required: boolean;
  question: Question;
}

const getAnswerKey = (moduleId: string, questionId: string): string => `${moduleId}:${questionId}`;

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

const extractAnswerValue = (answer: any): any => {
  if (typeof answer?.answer_boolean === 'boolean') return answer.answer_boolean;
  if (typeof answer?.answer_numeric === 'number') return answer.answer_numeric;
  if (answer?.answer_json !== undefined && answer?.answer_json !== null) return answer.answer_json;
  if (typeof answer?.answer_file_url === 'string' && answer.answer_file_url.length > 0) return answer.answer_file_url;
  if (typeof answer?.answer_text === 'string') return answer.answer_text;
  return null;
};

const normalizePhotoUrls = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => typeof entry === 'string')
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
};

const buildDraftFromRun = (run: GLHistoryRun): DraftMap => {
  const next: DraftMap = {};
  (run.answers || []).forEach((answer: any) => {
    next[getAnswerKey(answer.module_id, answer.question_id)] = extractAnswerValue(answer);
  });
  return next;
};

const deepEqual = (a: any, b: any): boolean => JSON.stringify(a) === JSON.stringify(b);
const isAnswerEmpty = (value: any): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

const evaluateCondition = (rule: ModuleRule, triggerQuestion: HistoryQuestionContext, triggerAnswer: any): boolean => {
  const operator = rule.operator || 'equals';
  const normalizedRuleValue = String(rule.trigger_answer ?? '').toLowerCase();
  const normalizedAnswerValue = triggerAnswer !== null && triggerAnswer !== undefined
    ? String(triggerAnswer).toLowerCase()
    : '';

  switch (operator) {
    case 'equals': {
      if (triggerQuestion.question.type === 'multiple_choice') {
        const selected = Array.isArray(triggerAnswer) ? triggerAnswer.map((value) => String(value)) : [];
        return selected.includes(String(rule.trigger_answer));
      }
      if (triggerQuestion.question.type === 'matrix') {
        const parsed = parseMatrixRuleTarget(String(rule.trigger_answer));
        if (!parsed || !triggerAnswer || typeof triggerAnswer !== 'object') return false;
        return String((triggerAnswer as Record<string, any>)[parsed.rowId] ?? '') === parsed.colId;
      }
      if (triggerQuestion.question.type === 'yesno') {
        return normalizeBooleanLike(triggerAnswer) === normalizeBooleanLike(rule.trigger_answer);
      }
      if (triggerQuestion.question.type === 'open_numeric' || triggerQuestion.question.type === 'slider' || triggerQuestion.question.type === 'likert') {
        return Number(triggerAnswer) === Number(rule.trigger_answer);
      }
      return normalizedAnswerValue === normalizedRuleValue;
    }
    case 'not_equals': {
      if (triggerQuestion.question.type === 'multiple_choice') {
        const selected = Array.isArray(triggerAnswer) ? triggerAnswer.map((value) => String(value)) : [];
        if (selected.length === 0) return false;
        return !selected.includes(String(rule.trigger_answer));
      }
      if (triggerQuestion.question.type === 'matrix') {
        const parsed = parseMatrixRuleTarget(String(rule.trigger_answer));
        if (!parsed || !triggerAnswer || typeof triggerAnswer !== 'object') return false;
        return String((triggerAnswer as Record<string, any>)[parsed.rowId] ?? '') !== parsed.colId;
      }
      if (triggerQuestion.question.type === 'yesno') {
        return normalizeBooleanLike(triggerAnswer) !== normalizeBooleanLike(rule.trigger_answer);
      }
      if (triggerQuestion.question.type === 'open_numeric' || triggerQuestion.question.type === 'slider' || triggerQuestion.question.type === 'likert') {
        return Number(triggerAnswer) !== Number(rule.trigger_answer);
      }
      return normalizedAnswerValue !== normalizedRuleValue;
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
        const selected = triggerAnswer.map((value) => String(value));
        if (selected.length === 0) return false;
        return selected.includes(String(rule.trigger_answer));
      }
      return String(triggerAnswer ?? '').toLowerCase().includes(normalizedRuleValue);
    }
    default:
      return false;
  }
};

const buildPayload = (questionContext: HistoryQuestionContext, value: any): AnswerPayload | null => {
  const base = {
    question_id: questionContext.question.id,
    module_id: questionContext.moduleId,
    question_type: questionContext.question.type as QuestionType
  };
  if (isAnswerEmpty(value)) {
    return { ...base, clear: true };
  }

  switch (questionContext.question.type) {
    case 'yesno':
      return { ...base, answer_boolean: value === true };
    case 'single_choice':
    case 'barcode_scanner':
    case 'open_text':
      return { ...base, answer_text: String(value) };
    case 'multiple_choice':
      return { ...base, answer_json: Array.isArray(value) ? value : [value] };
    case 'open_numeric':
    case 'slider':
    case 'likert': {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) return null;
      return { ...base, answer_numeric: parsed };
    }
    case 'matrix':
      return { ...base, answer_json: value };
    case 'photo_upload': {
      const urls = normalizePhotoUrls(value);
      if (urls.length === 0) return { ...base, clear: true };
      return { ...base, answer_json: urls, answer_file_url: urls[0] };
    }
    default:
      return { ...base, answer_text: String(value) };
  }
};

const formatRunDate = (value?: string): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatAnswerDisplay = (question: Question, value: any): string => {
  if (value === undefined || value === null || value === '') return '-';
  if (question.type === 'yesno') return value === true ? 'Ja' : 'Nein';
  if (question.type === 'single_choice') {
    const option = (question.options || []).find((entry) => entry.id === value);
    return option?.label || String(value);
  }
  if (question.type === 'multiple_choice' && Array.isArray(value)) {
    return value
      .map((entry: string) => (question.options || []).find((option) => option.id === entry)?.label || entry)
      .join(', ');
  }
  if (question.type === 'matrix' && typeof value === 'object') {
    const rows = question.matrix_config?.rows || [];
    const columns = question.matrix_config?.columns || [];
    return Object.entries(value)
      .map(([rowId, colId]) => {
        const row = rows.find((entry) => entry.id === rowId)?.label || rowId;
        const column = columns.find((entry) => entry.id === colId)?.label || String(colId);
        return `${row}: ${column}`;
      })
      .join(' | ');
  }
  if (question.type === 'photo_upload') {
    const urls = normalizePhotoUrls(value);
    if (urls.length === 0) return '-';
    return urls.length === 1 ? '1 Foto hinterlegt' : `${urls.length} Fotos hinterlegt`;
  }
  return String(value);
};

const FragebogenHistorySection: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoTargetRef = useRef<{ runId: string; questionKey: string; questionId: string; fragebogenId: string; marketId: string } | null>(null);

  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<GLHistoryRun[]>([]);

  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [draftByRun, setDraftByRun] = useState<Record<string, DraftMap>>({});
  const [savingRunId, setSavingRunId] = useState<string | null>(null);
  const [uploadingQuestionKey, setUploadingQuestionKey] = useState<string | null>(null);
  const [successRunId, setSuccessRunId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const history = await fragebogenService.responses.getGLHistory(user.id);
      setRuns(history || []);
      const groupedKeys = new Set((history || []).map((run) => run.market?.id || run.market_id || 'unbekannt'));
      setExpandedMarkets(groupedKeys);
    } catch (err: any) {
      setError(err?.message || 'Fragebogen-Historie konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const runsByMarket = useMemo(() => {
    const grouped = new Map<string, { marketKey: string; market: any; runs: GLHistoryRun[] }>();
    runs.forEach((run) => {
      const marketKey = run.market?.id || run.market_id || 'unbekannt';
      if (!grouped.has(marketKey)) {
        grouped.set(marketKey, { marketKey, market: run.market, runs: [] });
      }
      grouped.get(marketKey)!.runs.push(run);
    });
    return Array.from(grouped.values()).map((group) => ({
      ...group,
      runs: [...group.runs].sort((a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime())
    }));
  }, [runs]);

  const runLookupById = useMemo(() => {
    const lookup = new Map<string, {
      questions: HistoryQuestionContext[];
      byModuleAndLocalId: Map<string, Map<string, HistoryQuestionContext>>;
    }>();
    runs.forEach((run) => {
      const sortedModules = [...(run.modules || [])].sort((a, b) => a.order_index - b.order_index);
      const questions: HistoryQuestionContext[] = [];
      const byModuleAndLocalId = new Map<string, Map<string, HistoryQuestionContext>>();
      sortedModules.forEach((module) => {
        const sortedQuestions = [...(module.questions || [])].sort((a: GLHistoryQuestion, b: GLHistoryQuestion) => a.order_index - b.order_index);
        const localMap = new Map<string, HistoryQuestionContext>();
        sortedQuestions.forEach((entry) => {
          const questionContext: HistoryQuestionContext = {
            moduleId: module.id,
            moduleName: module.name,
            localId: entry.local_id,
            required: entry.required,
            question: entry.question
          };
          questions.push(questionContext);
          localMap.set(entry.local_id, questionContext);
        });
        byModuleAndLocalId.set(module.id, localMap);
      });
      lookup.set(run.id, { questions, byModuleAndLocalId });
    });
    return lookup;
  }, [runs]);

  const getQuestionsForRun = useCallback((run: GLHistoryRun): HistoryQuestionContext[] => {
    return runLookupById.get(run.id)?.questions || [];
  }, [runLookupById]);

  const isQuestionVisible = useCallback((run: GLHistoryRun, questionContext: HistoryQuestionContext, answerState: DraftMap): boolean => {
    const module = (run.modules || []).find((entry) => entry.id === questionContext.moduleId);
    const moduleRules = module?.rules || [];
    if (moduleRules.length === 0) return true;
    const targetRules = moduleRules.filter((rule) => (rule.target_local_ids || []).includes(questionContext.localId));
    if (targetRules.length === 0) return true;

    const questionsByLocalId = runLookupById.get(run.id)?.byModuleAndLocalId.get(questionContext.moduleId) || new Map<string, HistoryQuestionContext>();

    let hasShowRule = false;
    let showMatched = false;
    let hideMatched = false;

    for (const rule of targetRules) {
      const triggerQuestion = questionsByLocalId.get(rule.trigger_local_id);
      if (!triggerQuestion) continue;

      const triggerAnswer = answerState[getAnswerKey(triggerQuestion.moduleId, triggerQuestion.question.id)];
      if (isAnswerEmpty(triggerAnswer)) {
        if (rule.action === 'show') hasShowRule = true;
        continue;
      }

      const conditionMet = evaluateCondition(rule, triggerQuestion, triggerAnswer);
      if (rule.action === 'hide' && conditionMet) {
        hideMatched = true;
      } else if (rule.action === 'show') {
        hasShowRule = true;
        if (conditionMet) showMatched = true;
      }
    }

    if (hideMatched) return false;
    if (hasShowRule && !showMatched) return false;
    return true;
  }, [runLookupById]);

  const toggleMarket = (marketKey: string) => {
    setExpandedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(marketKey)) next.delete(marketKey);
      else next.add(marketKey);
      return next;
    });
  };

  const toggleRun = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  };

  const startEditing = (run: GLHistoryRun) => {
    setEditingRunId(run.id);
    setSuccessRunId(null);
    setDraftByRun((prev) => ({ ...prev, [run.id]: buildDraftFromRun(run) }));
  };

  const cancelEditing = () => {
    setEditingRunId(null);
    setSavingRunId(null);
  };

  const updateDraftValue = (runId: string, key: string, value: any) => {
    setDraftByRun((prev) => ({
      ...prev,
      [runId]: {
        ...(prev[runId] || {}),
        [key]: value
      }
    }));
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Foto konnte nicht gelesen werden.'));
      reader.readAsDataURL(file);
    });

  const openPhotoPicker = (
    run: GLHistoryRun,
    questionContext: HistoryQuestionContext,
    questionKey: string
  ) => {
    if (!user?.id) return;
    photoTargetRef.current = {
      runId: run.id,
      questionKey,
      questionId: questionContext.question.id,
      fragebogenId: run.fragebogen_id,
      marketId: run.market_id
    };
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.currentTarget.value = '';
    if (files.length === 0 || !user?.id) return;
    const target = photoTargetRef.current;
    if (!target) return;

    try {
      setUploadingQuestionKey(target.questionKey);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const image = await readFileAsDataUrl(file);
        const uploaded = await fragebogenService.responses.uploadPhoto({
          image,
          fragebogen_id: target.fragebogenId,
          market_id: target.marketId,
          gebietsleiter_id: user.id,
          response_id: target.runId,
          question_id: target.questionId,
          filename: file.name
        });
        if (uploaded?.url) uploadedUrls.push(uploaded.url);
      }

      if (uploadedUrls.length > 0) {
        const currentRunDraft = draftByRun[target.runId] || {};
        const existingUrls = normalizePhotoUrls(currentRunDraft[target.questionKey]);
        updateDraftValue(target.runId, target.questionKey, [...existingUrls, ...uploadedUrls]);
      }
    } catch (err: any) {
      setError(err?.message || 'Foto konnte nicht hochgeladen werden.');
    } finally {
      setUploadingQuestionKey(null);
    }
  };

  const saveRun = async (run: GLHistoryRun) => {
    const questions = getQuestionsForRun(run);
    const original = buildDraftFromRun(run);
    const current = draftByRun[run.id] || original;

    const payloads: AnswerPayload[] = [];
    questions.forEach((questionContext) => {
      const key = getAnswerKey(questionContext.moduleId, questionContext.question.id);
      if (!deepEqual(original[key], current[key])) {
        const payload = buildPayload(questionContext, current[key]);
        if (payload) payloads.push(payload);
      }
    });

    if (payloads.length === 0) {
      setEditingRunId(null);
      return;
    }

    setSavingRunId(run.id);
    setError(null);
    try {
      await fragebogenService.responses.update(run.id, payloads, user?.id);
      setSuccessRunId(run.id);
      setEditingRunId(null);
      await loadHistory();
    } catch (err: any) {
      setError(err?.message || 'Antworten konnten nicht gespeichert werden.');
    } finally {
      setSavingRunId(null);
    }
  };

  const renderEditor = (
    run: GLHistoryRun,
    questionContext: HistoryQuestionContext,
    value: any
  ) => {
    const question = questionContext.question;
    const questionKey = getAnswerKey(questionContext.moduleId, question.id);

    switch (question.type) {
      case 'yesno':
        return (
          <div className={styles.fbYesNoRow}>
            <button
              type="button"
              className={`${styles.fbChipButton} ${value === true ? styles.fbChipButtonActive : ''}`}
              onClick={() => updateDraftValue(run.id, questionKey, true)}
            >
              Ja
            </button>
            <button
              type="button"
              className={`${styles.fbChipButton} ${value === false ? styles.fbChipButtonActive : ''}`}
              onClick={() => updateDraftValue(run.id, questionKey, false)}
            >
              Nein
            </button>
          </div>
        );
      case 'single_choice':
        return (
          <div className={styles.fbChoiceWrap}>
            {(question.options || []).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.fbChipButton} ${value === option.id ? styles.fbChipButtonActive : ''}`}
                onClick={() => updateDraftValue(run.id, questionKey, option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        );
      case 'multiple_choice': {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className={styles.fbChoiceWrap}>
            {(question.options || []).map((option) => {
              const isActive = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.fbChipButton} ${isActive ? styles.fbChipButtonActive : ''}`}
                  onClick={() => {
                    if (isActive) {
                      updateDraftValue(run.id, questionKey, selected.filter((id: string) => id !== option.id));
                    } else {
                      updateDraftValue(run.id, questionKey, [...selected, option.id]);
                    }
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      }
      case 'open_text':
        return (
          <textarea
            className={styles.fbTextArea}
            rows={3}
            value={value || ''}
            onChange={(event) => updateDraftValue(run.id, questionKey, event.target.value)}
          />
        );
      case 'barcode_scanner':
        return (
          <input
            type="text"
            className={styles.fbTextInput}
            value={value || ''}
            onChange={(event) => updateDraftValue(run.id, questionKey, event.target.value)}
            placeholder="Barcode eingeben"
          />
        );
      case 'open_numeric':
        return (
          <input
            type="number"
            className={styles.fbTextInput}
            value={value ?? ''}
            min={question.numeric_constraints?.min}
            max={question.numeric_constraints?.max}
            onChange={(event) => updateDraftValue(run.id, questionKey, event.target.value === '' ? '' : Number(event.target.value))}
          />
        );
      case 'slider': {
        const slider = question.slider_config || { min: 0, max: 100, step: 1 };
        const numericValue = typeof value === 'number' ? value : slider.min;
        return (
          <div className={styles.fbSliderWrap}>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={numericValue}
              onChange={(event) => updateDraftValue(run.id, questionKey, Number(event.target.value))}
            />
            <span className={styles.fbSliderValue}>
              {numericValue}
              {slider.unit ? ` ${slider.unit}` : ''}
            </span>
          </div>
        );
      }
      case 'likert': {
        const scale = question.likert_scale || { min: 1, max: 5, minLabel: '', maxLabel: '' };
        const values = Array.from({ length: scale.max - scale.min + 1 }, (_, index) => scale.min + index);
        return (
          <div className={styles.fbLikertRow}>
            {values.map((entry) => (
              <button
                key={entry}
                type="button"
                className={`${styles.fbLikertButton} ${value === entry ? styles.fbLikertButtonActive : ''}`}
                onClick={() => updateDraftValue(run.id, questionKey, entry)}
              >
                {entry}
              </button>
            ))}
          </div>
        );
      }
      case 'matrix': {
        const matrixValue = value && typeof value === 'object' ? value : {};
        return (
          <div className={styles.fbMatrixWrap}>
            <table className={styles.fbMatrixTable}>
              <thead>
                <tr>
                  <th />
                  {(question.matrix_config?.columns || []).map((column) => (
                    <th key={column.id}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(question.matrix_config?.rows || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    {(question.matrix_config?.columns || []).map((column) => {
                      const active = matrixValue[row.id] === column.id;
                      return (
                        <td key={column.id}>
                          <button
                            type="button"
                            className={`${styles.fbMatrixCell} ${active ? styles.fbMatrixCellActive : ''}`}
                            onClick={() => updateDraftValue(run.id, questionKey, { ...matrixValue, [row.id]: column.id })}
                          >
                            {active ? <Check size={12} weight="bold" /> : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case 'photo_upload': {
        const urls = normalizePhotoUrls(value);
        const uploading = uploadingQuestionKey === questionKey;
        return (
          <div className={styles.fbPhotoWrap}>
            <button
              type="button"
              className={styles.fbPhotoButton}
              onClick={() => openPhotoPicker(run, questionContext, questionKey)}
              disabled={uploading}
            >
              <Camera size={16} weight="bold" />
              {uploading ? 'Wird hochgeladen…' : 'Foto(s) hinzufügen'}
            </button>
            {urls.length > 0
              ? urls.map((url, index) => (
                  <img key={`${url}-${index}`} src={url} alt={`Antwort Foto ${index + 1}`} className={styles.fbPhotoPreview} />
                ))
              : <span className={styles.fbMuted}>Kein Foto</span>}
          </div>
        );
      }
      default:
        return (
          <input
            type="text"
            className={styles.fbTextInput}
            value={value || ''}
            onChange={(event) => updateDraftValue(run.id, questionKey, event.target.value)}
          />
        );
    }
  };

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen((prev) => !prev)}>
        <div className={`${styles.sectionIcon} ${styles.sectionIconIndigo}`}>
          <PencilSimple size={20} weight="duotone" />
        </div>
        <div className={styles.sectionInfo}>
          <h3 className={styles.sectionTitle}>Fragebogen Historie</h3>
          <span className={styles.sectionCount}>
            {loading ? 'Laden...' : `${runs.length} Einreichungen in ${runsByMarket.length} Märkten`}
          </span>
        </div>
        <CaretDown size={16} className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
      </div>

      <div className={`${styles.sectionBody} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sectionBodyInner}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <CircleNotch size={32} weight="bold" className={styles.spinner} />
              <span>Lade Fragebogen-Historie...</span>
            </div>
          ) : error ? (
            <div className={styles.fbErrorBox}>{error}</div>
          ) : runsByMarket.length === 0 ? (
            <div className={styles.emptyState}>
              <PencilSimple size={48} weight="regular" />
              <span>Keine Fragebogen-Einreichungen gefunden</span>
            </div>
          ) : (
            runsByMarket.map((group) => {
              const marketExpanded = expandedMarkets.has(group.marketKey);
              return (
                <div key={group.marketKey} className={styles.fbMarketCard}>
                  <button type="button" className={styles.fbMarketHeader} onClick={() => toggleMarket(group.marketKey)}>
                    <div className={styles.fbMarketInfo}>
                      <div className={styles.fbMarketName}>{group.market?.name || 'Unbekannter Markt'}</div>
                      <div className={styles.fbMarketMeta}>
                        {[group.market?.chain, group.market?.address, group.market?.city].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className={styles.fbHeaderRight}>
                      <span className={styles.fbRunCount}>{group.runs.length}</span>
                      <CaretDown size={14} className={`${styles.fbRunChevron} ${marketExpanded ? styles.open : ''}`} />
                    </div>
                  </button>

                  <div className={`${styles.fbMarketBody} ${marketExpanded ? styles.open : ''}`}>
                    <div className={styles.fbMarketBodyInner}>
                      {group.runs.map((run) => {
                        const runExpanded = expandedRuns.has(run.id);
                        const isEditing = editingRunId === run.id;
                        const sourceAnswers = isEditing ? (draftByRun[run.id] || buildDraftFromRun(run)) : buildDraftFromRun(run);
                        const allQuestions = getQuestionsForRun(run);
                        const visibleQuestions = allQuestions.filter((questionContext) => isQuestionVisible(run, questionContext, sourceAnswers));

                        return (
                          <div key={run.id} className={styles.fbRunCard}>
                            <button type="button" className={styles.fbRunHeader} onClick={() => toggleRun(run.id)}>
                              <div className={styles.fbRunInfo}>
                                <span className={styles.fbRunTitle}>{run.fragebogen?.name || 'Fragebogen'}</span>
                                <span className={styles.fbRunMeta}>
                                  Gestartet: {formatRunDate(run.started_at)}
                                  {run.completed_at ? ` · Abgeschlossen: ${formatRunDate(run.completed_at)}` : ''}
                                </span>
                              </div>
                              <div className={styles.fbHeaderRight}>
                                <span className={`${styles.fbRunStatus} ${run.status === 'completed' ? styles.fbRunStatusDone : styles.fbRunStatusOpen}`}>
                                  {run.status === 'completed' ? 'Completed' : 'In Progress'}
                                </span>
                                <CaretDown size={14} className={`${styles.fbRunChevron} ${runExpanded ? styles.open : ''}`} />
                              </div>
                            </button>

                            <div className={`${styles.fbRunBody} ${runExpanded ? styles.open : ''}`}>
                              <div className={styles.fbRunBodyInner}>
                                <div className={styles.fbRunActions}>
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        className={styles.fbSaveButton}
                                        onClick={() => saveRun(run)}
                                        disabled={savingRunId === run.id}
                                      >
                                        {savingRunId === run.id ? <CircleNotch size={14} weight="bold" className={styles.spinner} /> : <FloppyDisk size={14} weight="bold" />}
                                        Speichern
                                      </button>
                                      <button type="button" className={styles.fbCancelButton} onClick={cancelEditing}>
                                        <X size={14} weight="bold" />
                                        Abbrechen
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className={styles.fbEditButton}
                                      onClick={() => startEditing(run)}
                                      disabled={run.gebietsleiter_id !== user?.id}
                                    >
                                      <PencilSimple size={14} weight="bold" />
                                      Antworten bearbeiten
                                    </button>
                                  )}
                                  {successRunId === run.id ? <span className={styles.fbSuccess}>Gespeichert</span> : null}
                                </div>

                                <div className={styles.fbQuestionList}>
                                  {visibleQuestions.map((questionContext) => {
                                    const questionKey = getAnswerKey(questionContext.moduleId, questionContext.question.id);
                                    const value = sourceAnswers[questionKey];

                                    return (
                                      <div key={questionKey} className={styles.fbQuestionRow}>
                                        <div className={styles.fbQuestionHead}>
                                          <span className={styles.fbModulePill}>{questionContext.moduleName}</span>
                                          {questionContext.required ? <span className={styles.fbRequired}>Pflicht</span> : null}
                                        </div>
                                        <div className={styles.fbQuestionText}>{questionContext.question.question_text}</div>
                                        {isEditing ? (
                                          <div className={styles.fbEditorWrap}>
                                            {renderEditor(run, questionContext, value)}
                                          </div>
                                        ) : questionContext.question.type === 'photo_upload' && normalizePhotoUrls(value).length > 0 ? (
                                          <div className={styles.fbPhotoWrap}>
                                            {normalizePhotoUrls(value).map((url, index) => (
                                              <img key={`${url}-${index}`} src={url} alt={`Antwort Foto ${index + 1}`} className={styles.fbPhotoPreview} />
                                            ))}
                                          </div>
                                        ) : (
                                          <div className={styles.fbAnswerText}>{formatAnswerDisplay(questionContext.question, value)}</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handlePhotoFileChange}
      />
    </div>
  );
};

export default FragebogenHistorySection;
