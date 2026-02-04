import React, { useState, useMemo } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Camera, Barcode, RadioButton, CheckSquare, TextT, Hash, SlidersHorizontal, Table, ToggleRight, Timer, Car, MapPin, ChatText, ChartPie, Play, Stop } from '@phosphor-icons/react';
import styles from './FragebogenPreviewModal.module.css';

interface QuestionCondition {
  id: string;
  triggerQuestionId: string;
  triggerAnswer: string | number;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
  triggerAnswerMax?: number;
  action: 'hide' | 'show';
  targetQuestionIds: string[];
}

interface Question {
  id: string;
  moduleId: string;
  type: 'single_choice' | 'yesno' | 'likert' | 'multiple_choice' | 'photo_upload' | 'matrix' | 'open_text' | 'open_numeric' | 'slider' | 'barcode_scanner';
  questionText: string;
  required: boolean;
  order: number;
  options?: string[];
  likertScale?: { min: number; max: number; minLabel: string; maxLabel: string };
  matrixRows?: string[];
  matrixColumns?: string[];
  numericConstraints?: { min?: number; max?: number; decimals?: boolean };
  sliderConfig?: { min: number; max: number; step: number; unit?: string };
  instruction?: string;
  conditions?: QuestionCondition[];
}

interface Module {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
}

interface ZeiterfassungData {
  fahrzeitVon: string;
  fahrzeitBis: string;
  distanzKm: string;
  besuchszeitVon: string;
  besuchszeitBis: string;
  kommentar: string;
  foodProzent: number;
}

interface FragebogenPreviewModalProps {
  title: string;
  modules: Module[];
  onClose: () => void;
  onComplete?: (answers: Record<string, any>, zeiterfassung?: ZeiterfassungData) => void;
  zeiterfassungActive?: boolean;
}

export const FragebogenPreviewModal: React.FC<FragebogenPreviewModalProps> = ({
  title,
  modules,
  onClose,
  onComplete,
  zeiterfassungActive = true
}) => {
  // Flatten all questions with module context
  const allQuestions = modules.flatMap(module => 
    module.questions.map(q => ({ ...q, moduleName: module.name, moduleId: module.id }))
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Zeiterfassung state
  const [zeiterfassungStep, setZeiterfassungStep] = useState<'start' | 'questions' | 'end' | null>(
    zeiterfassungActive ? 'start' : 'questions'
  );
  const [zeiterfassung, setZeiterfassung] = useState<ZeiterfassungData>({
    fahrzeitVon: '',
    fahrzeitBis: '',
    distanzKm: '',
    besuchszeitVon: '',
    besuchszeitBis: '',
    kommentar: '',
    foodProzent: 50
  });
  
  // Track if timers are running
  const [fahrzeitRunning, setFahrzeitRunning] = useState(false);
  const [besuchszeitRunning, setBesuchszeitRunning] = useState(false);
  
  // Get current time in HH:MM format
  const getCurrentTime = (): string => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Toggle fahrzeit timer
  const toggleFahrzeitTimer = () => {
    const currentTime = getCurrentTime();
    if (!fahrzeitRunning) {
      setZeiterfassung(prev => ({ ...prev, fahrzeitVon: currentTime }));
      setFahrzeitRunning(true);
    } else {
      setZeiterfassung(prev => ({ ...prev, fahrzeitBis: currentTime }));
      setFahrzeitRunning(false);
    }
  };
  
  // Toggle besuchszeit timer
  const toggleBesuchszeitTimer = () => {
    const currentTime = getCurrentTime();
    if (!besuchszeitRunning) {
      setZeiterfassung(prev => ({ ...prev, besuchszeitVon: currentTime }));
      setBesuchszeitRunning(true);
    } else {
      setZeiterfassung(prev => ({ ...prev, besuchszeitBis: currentTime }));
      setBesuchszeitRunning(false);
    }
  };

  // Calculate time difference in HH:MM format
  const calculateTimeDiff = (von: string, bis: string): string => {
    if (!von || !bis) return '--:--';
    const [vonH, vonM] = von.split(':').map(Number);
    const [bisH, bisM] = bis.split(':').map(Number);
    let diffMinutes = (bisH * 60 + bisM) - (vonH * 60 + vonM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const fahrzeitDiff = useMemo(() => 
    calculateTimeDiff(zeiterfassung.fahrzeitVon, zeiterfassung.fahrzeitBis), 
    [zeiterfassung.fahrzeitVon, zeiterfassung.fahrzeitBis]
  );
  
  const besuchszeitDiff = useMemo(() => 
    calculateTimeDiff(zeiterfassung.besuchszeitVon, zeiterfassung.besuchszeitBis), 
    [zeiterfassung.besuchszeitVon, zeiterfassung.besuchszeitBis]
  );

  const currentQuestion = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;
  
  // Calculate progress including zeiterfassung steps
  const totalSteps = zeiterfassungActive ? totalQuestions + 2 : totalQuestions;
  const currentStep = zeiterfassungStep === 'start' ? 1 : 
                      zeiterfassungStep === 'questions' ? currentIndex + (zeiterfassungActive ? 2 : 1) :
                      totalSteps;
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  // Handle case when there are no questions
  if (totalQuestions === 0) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.completedScreen}>
            <div className={styles.completedIcon} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              <X size={64} weight="bold" />
            </div>
            <h2>Keine Fragen vorhanden</h2>
            <p>Dieses Modul enthält noch keine Fragen.</p>
            <button className={styles.closeButtonLarge} onClick={onClose}>
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getQuestionIcon = (type: Question['type']) => {
    switch (type) {
      case 'single_choice': return RadioButton;
      case 'multiple_choice': return CheckSquare;
      case 'yesno': return ToggleRight;
      case 'likert': return SlidersHorizontal;
      case 'open_text': return TextT;
      case 'open_numeric': return Hash;
      case 'slider': return SlidersHorizontal;
      case 'photo_upload': return Camera;
      case 'barcode_scanner': return Barcode;
      case 'matrix': return Table;
      default: return TextT;
    }
  };

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  // Check if a question should be hidden based on conditions and current answers
  const isQuestionHidden = (questionId: string, currentAnswers: Record<string, any>): boolean => {
    // Find all conditions that target this question
    for (const question of allQuestions) {
      if (question.conditions) {
        for (const condition of question.conditions) {
          if (condition.targetQuestionIds.includes(questionId)) {
            const triggerAnswer = currentAnswers[condition.triggerQuestionId];
            if (triggerAnswer === undefined) continue;
            
            let conditionMet = false;
            const operator = condition.operator || 'equals';
            
            switch (operator) {
              case 'equals':
                conditionMet = String(triggerAnswer) === String(condition.triggerAnswer);
                break;
              case 'not_equals':
                conditionMet = String(triggerAnswer) !== String(condition.triggerAnswer);
                break;
              case 'greater_than':
                conditionMet = Number(triggerAnswer) > Number(condition.triggerAnswer);
                break;
              case 'less_than':
                conditionMet = Number(triggerAnswer) < Number(condition.triggerAnswer);
                break;
              case 'between':
                conditionMet = Number(triggerAnswer) >= Number(condition.triggerAnswer) && 
                               Number(triggerAnswer) <= Number(condition.triggerAnswerMax);
                break;
              case 'contains':
                conditionMet = String(triggerAnswer).includes(String(condition.triggerAnswer));
                break;
            }
            
            if (conditionMet && condition.action === 'hide') {
              return true; // Question should be hidden
            }
            if (!conditionMet && condition.action === 'show') {
              return true; // Question should be hidden (show condition not met)
            }
          }
        }
      }
    }
    return false;
  };

  // Find next visible question index
  const findNextVisibleIndex = (fromIndex: number, currentAnswers: Record<string, any>): number => {
    for (let i = fromIndex + 1; i < totalQuestions; i++) {
      if (!isQuestionHidden(allQuestions[i].id, currentAnswers)) {
        return i;
      }
    }
    return -1; // No more visible questions
  };

  // Find previous visible question index
  const findPrevVisibleIndex = (fromIndex: number, currentAnswers: Record<string, any>): number => {
    for (let i = fromIndex - 1; i >= 0; i--) {
      if (!isQuestionHidden(allQuestions[i].id, currentAnswers)) {
        return i;
      }
    }
    return -1; // No previous visible questions
  };

  const handleNext = () => {
    if (zeiterfassungStep === 'start') {
      // Move from zeiterfassung start to questions
      if (totalQuestions > 0) {
        setZeiterfassungStep('questions');
        setCurrentIndex(0);
      } else if (zeiterfassungActive) {
        // No questions, go directly to end
        setZeiterfassungStep('end');
      } else {
        setIsCompleted(true);
      }
      return;
    }
    
    if (zeiterfassungStep === 'end') {
      // Complete the preview
      setIsCompleted(true);
      if (onComplete) {
        onComplete(answers, zeiterfassungActive ? zeiterfassung : undefined);
      }
      return;
    }
    
    // Include current answer in the check
    const updatedAnswers = { ...answers, [currentQuestion.id]: answers[currentQuestion.id] };
    const nextIndex = findNextVisibleIndex(currentIndex, updatedAnswers);
    
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
    } else {
      // No more visible questions
      if (zeiterfassungActive) {
        setZeiterfassungStep('end');
      } else {
        setIsCompleted(true);
        if (onComplete) {
          onComplete(answers);
        }
      }
    }
  };

  const handlePrev = () => {
    if (zeiterfassungStep === 'end') {
      // Go back to last question
      if (totalQuestions > 0) {
        setZeiterfassungStep('questions');
        // Find last visible question
        for (let i = totalQuestions - 1; i >= 0; i--) {
          if (!isQuestionHidden(allQuestions[i].id, answers)) {
            setCurrentIndex(i);
            return;
          }
        }
      } else if (zeiterfassungActive) {
        setZeiterfassungStep('start');
      }
      return;
    }
    
    if (zeiterfassungStep === 'questions' && currentIndex === 0) {
      // Go back to zeiterfassung start if active
      if (zeiterfassungActive) {
        setZeiterfassungStep('start');
      }
      return;
    }
    
    const prevIndex = findPrevVisibleIndex(currentIndex, answers);
    if (prevIndex !== -1) {
      setCurrentIndex(prevIndex);
    } else if (zeiterfassungActive) {
      setZeiterfassungStep('start');
    }
  };

  const canProceed = () => {
    if (zeiterfassungStep === 'start') {
      // Fahrzeit and Distanz are required
      return zeiterfassung.fahrzeitVon && zeiterfassung.fahrzeitBis && zeiterfassung.distanzKm;
    }
    if (zeiterfassungStep === 'end') {
      // Besuchszeit is required, comment is optional
      return zeiterfassung.besuchszeitVon && zeiterfassung.besuchszeitBis;
    }
    if (!currentQuestion) return true;
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const canGoPrev = () => {
    if (zeiterfassungStep === 'start') return false;
    if (zeiterfassungStep === 'questions' && currentIndex === 0 && !zeiterfassungActive) return false;
    return true;
  };

  const renderZeiterfassungStart = () => (
    <div className={styles.zeiterfassungContainer}>
      <div className={styles.zeiterfassungHeader}>
        <div className={styles.zeiterfassungIconLarge}>
          <Timer size={28} weight="fill" />
        </div>
        <h3 className={styles.zeiterfassungTitle}>Zeiterfassung</h3>
        <p className={styles.zeiterfassungSubtitle}>Fahrzeit und Distanz erfassen</p>
      </div>
      
      <div className={styles.zeiterfassungFields}>
        {/* Fahrzeit Section */}
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <Car size={18} weight="fill" />
            <span>Fahrzeit</span>
          </div>
          
          {/* Timer Button */}
          <button 
            type="button"
            className={`${styles.timerButton} ${fahrzeitRunning ? styles.timerButtonActive : ''}`}
            onClick={toggleFahrzeitTimer}
          >
            {fahrzeitRunning ? (
              <>
                <Stop size={18} weight="fill" />
                <span>Stoppen</span>
              </>
            ) : (
              <>
                <Play size={18} weight="fill" />
                <span>{zeiterfassung.fahrzeitVon ? 'Fortsetzen' : 'Starten'}</span>
              </>
            )}
          </button>
          
          {/* Time Inputs Row */}
          <div className={styles.timeRow}>
            <div className={styles.timeField}>
              <span className={styles.timeLabel}>Von</span>
              <input
                type="text"
                className={styles.timeInputClean}
                value={zeiterfassung.fahrzeitVon}
                onChange={(e) => setZeiterfassung(prev => ({ ...prev, fahrzeitVon: e.target.value }))}
                placeholder="--:--"
                maxLength={5}
              />
            </div>
            <div className={styles.timeField}>
              <span className={styles.timeLabel}>Bis</span>
              <input
                type="text"
                className={styles.timeInputClean}
                value={zeiterfassung.fahrzeitBis}
                onChange={(e) => setZeiterfassung(prev => ({ ...prev, fahrzeitBis: e.target.value }))}
                placeholder="--:--"
                maxLength={5}
              />
            </div>
            <div className={styles.timeField}>
              <span className={styles.timeLabel}>Dauer</span>
              <div className={styles.timeDuration}>{fahrzeitDiff}</div>
            </div>
          </div>
        </div>

        {/* Distanz Section */}
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <MapPin size={18} weight="fill" />
            <span>Distanz</span>
          </div>
          <div className={styles.distanzRow}>
            <input
              type="text"
              inputMode="decimal"
              className={styles.distanzInputClean}
              value={zeiterfassung.distanzKm}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.,]/g, '');
                setZeiterfassung(prev => ({ ...prev, distanzKm: val }));
              }}
              placeholder="0"
            />
            <span className={styles.distanzLabel}>km</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderZeiterfassungEnd = () => (
    <div className={styles.zeiterfassungContainer}>
      <div className={styles.zeiterfassungHeader}>
        <div className={styles.zeiterfassungIconLarge}>
          <Timer size={28} weight="fill" />
        </div>
        <h3 className={styles.zeiterfassungTitle}>Abschluss</h3>
        <p className={styles.zeiterfassungSubtitle}>Besuchszeit und Aufteilung</p>
      </div>
      
      <div className={styles.zeiterfassungFields}>
        {/* Besuchszeit Section */}
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <Timer size={18} weight="fill" />
            <span>Besuchszeit</span>
          </div>
          
          {/* Timer Button */}
          <button 
            type="button"
            className={`${styles.timerButton} ${besuchszeitRunning ? styles.timerButtonActive : ''}`}
            onClick={toggleBesuchszeitTimer}
          >
            {besuchszeitRunning ? (
              <>
                <Stop size={18} weight="fill" />
                <span>Stoppen</span>
              </>
            ) : (
              <>
                <Play size={18} weight="fill" />
                <span>{zeiterfassung.besuchszeitVon ? 'Fortsetzen' : 'Starten'}</span>
              </>
            )}
          </button>
          
          {/* Time Inputs Row */}
          <div className={styles.timeRow}>
            <div className={styles.timeField}>
              <span className={styles.timeLabel}>Von</span>
              <input
                type="text"
                className={styles.timeInputClean}
                value={zeiterfassung.besuchszeitVon}
                onChange={(e) => setZeiterfassung(prev => ({ ...prev, besuchszeitVon: e.target.value }))}
                placeholder="--:--"
                maxLength={5}
              />
            </div>
            <div className={styles.timeField}>
              <span className={styles.timeLabel}>Bis</span>
              <input
                type="text"
                className={styles.timeInputClean}
                value={zeiterfassung.besuchszeitBis}
                onChange={(e) => setZeiterfassung(prev => ({ ...prev, besuchszeitBis: e.target.value }))}
                placeholder="--:--"
                maxLength={5}
              />
            </div>
            <div className={styles.timeField}>
              <span className={styles.timeLabel}>Dauer</span>
              <div className={styles.timeDuration}>{besuchszeitDiff}</div>
            </div>
          </div>
        </div>

        {/* Kommentar Section */}
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <ChatText size={18} weight="fill" />
            <span>Kommentar</span>
            <span className={styles.optionalBadge}>Optional</span>
          </div>
          <textarea
            className={styles.kommentarInputClean}
            value={zeiterfassung.kommentar}
            onChange={(e) => setZeiterfassung(prev => ({ ...prev, kommentar: e.target.value }))}
            placeholder="Anmerkungen zum Besuch..."
            rows={2}
          />
        </div>

        {/* Food/Pets Aufteilung */}
        <div className={styles.zeitSection}>
          <div className={styles.zeitSectionHeader}>
            <ChartPie size={18} weight="fill" />
            <span>Zeitaufteilung Food / Pets</span>
          </div>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              className={styles.sliderClean}
              value={zeiterfassung.foodProzent}
              onChange={(e) => setZeiterfassung(prev => ({ ...prev, foodProzent: Number(e.target.value) }))}
              min="0"
              max="100"
              step="5"
            />
            <div className={styles.sliderLabels}>
              <div className={styles.sliderLabelLeft}>
                <span className={styles.sliderLabelText}>Food</span>
                <span className={styles.sliderLabelValue}>{zeiterfassung.foodProzent}%</span>
              </div>
              <div className={styles.sliderLabelRight}>
                <span className={styles.sliderLabelText}>Pets</span>
                <span className={styles.sliderLabelValue}>{100 - zeiterfassung.foodProzent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestionInput = () => {
    const answer = answers[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'single_choice':
        return (
          <div className={styles.optionsGrid}>
            {currentQuestion.options?.map((option, idx) => (
              <button
                key={idx}
                className={`${styles.optionButton} ${answer === option ? styles.optionButtonSelected : ''}`}
                onClick={() => handleAnswer(option)}
              >
                <RadioButton size={20} weight={answer === option ? 'fill' : 'regular'} />
                <span>{option}</span>
              </button>
            ))}
          </div>
        );

      case 'multiple_choice':
        const selectedOptions = (answer as string[]) || [];
        return (
          <div className={styles.optionsGrid}>
            {currentQuestion.options?.map((option, idx) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <button
                  key={idx}
                  className={`${styles.optionButton} ${isSelected ? styles.optionButtonSelected : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      handleAnswer(selectedOptions.filter(o => o !== option));
                    } else {
                      handleAnswer([...selectedOptions, option]);
                    }
                  }}
                >
                  <CheckSquare size={20} weight={isSelected ? 'fill' : 'regular'} />
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        );

      case 'yesno':
        return (
          <div className={styles.yesnoGrid}>
            <button
              className={`${styles.yesnoButton} ${styles.yesButton} ${answer === 'Ja' ? styles.yesnoButtonSelected : ''}`}
              onClick={() => handleAnswer('Ja')}
            >
              <Check size={24} weight="bold" />
              <span>Ja</span>
            </button>
            <button
              className={`${styles.yesnoButton} ${styles.noButton} ${answer === 'Nein' ? styles.yesnoButtonSelected : ''}`}
              onClick={() => handleAnswer('Nein')}
            >
              <X size={24} weight="bold" />
              <span>Nein</span>
            </button>
          </div>
        );

      case 'likert':
        const scale = currentQuestion.likertScale;
        if (!scale) return null;
        const values = [];
        for (let i = scale.min; i <= scale.max; i++) values.push(i);
        return (
          <div className={styles.likertContainer}>
            <div className={styles.likertLabels}>
              <span>{scale.minLabel}</span>
              <span>{scale.maxLabel}</span>
            </div>
            <div className={styles.likertScale}>
              {values.map(val => (
                <button
                  key={val}
                  className={`${styles.likertButton} ${answer === val ? styles.likertButtonSelected : ''}`}
                  onClick={() => handleAnswer(val)}
                >
                  {val}
                </button>
              ))}
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
          <input
            type="number"
            className={styles.numericInput}
            value={answer || ''}
            onChange={(e) => handleAnswer(e.target.value ? Number(e.target.value) : '')}
            placeholder="Zahl eingeben..."
            min={currentQuestion.numericConstraints?.min}
            max={currentQuestion.numericConstraints?.max}
            step={currentQuestion.numericConstraints?.decimals ? 0.01 : 1}
          />
        );

      case 'slider':
        const sliderConfig = currentQuestion.sliderConfig;
        if (!sliderConfig) return null;
        return (
          <div className={styles.sliderContainer}>
            <input
              type="range"
              className={styles.sliderInput}
              value={answer || sliderConfig.min}
              onChange={(e) => handleAnswer(Number(e.target.value))}
              min={sliderConfig.min}
              max={sliderConfig.max}
              step={sliderConfig.step}
            />
            <div className={styles.sliderValue}>
              {answer ?? sliderConfig.min}{sliderConfig.unit || ''}
            </div>
            <div className={styles.sliderLabels}>
              <span>{sliderConfig.min}{sliderConfig.unit || ''}</span>
              <span>{sliderConfig.max}{sliderConfig.unit || ''}</span>
            </div>
          </div>
        );

      case 'photo_upload':
        return (
          <div className={styles.photoUpload}>
            <Camera size={48} weight="regular" />
            <p>{currentQuestion.instruction || 'Foto aufnehmen'}</p>
            <button 
              className={styles.photoButton}
              onClick={() => handleAnswer('photo_simulated_' + Date.now())}
            >
              <Camera size={20} weight="bold" />
              Foto simulieren
            </button>
            {answer && <span className={styles.photoConfirm}>✓ Foto aufgenommen</span>}
          </div>
        );

      case 'barcode_scanner':
        return (
          <div className={styles.barcodeScanner}>
            <Barcode size={48} weight="regular" />
            <p>Barcode scannen</p>
            <button 
              className={styles.barcodeButton}
              onClick={() => handleAnswer('BARCODE_' + Math.random().toString(36).substring(7).toUpperCase())}
            >
              <Barcode size={20} weight="bold" />
              Scan simulieren
            </button>
            {answer && <span className={styles.barcodeResult}>{answer}</span>}
          </div>
        );

      case 'matrix':
        const rows = currentQuestion.matrixRows || [];
        const cols = currentQuestion.matrixColumns || [];
        const matrixAnswers = (answer as Record<string, string>) || {};
        return (
          <div className={styles.matrixContainer}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th></th>
                  {cols.map((col, idx) => (
                    <th key={idx}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className={styles.matrixRowLabel}>{row}</td>
                    {cols.map((col, colIdx) => (
                      <td key={colIdx}>
                        <button
                          className={`${styles.matrixCell} ${matrixAnswers[row] === col ? styles.matrixCellSelected : ''}`}
                          onClick={() => handleAnswer({ ...matrixAnswers, [row]: col })}
                        >
                          {matrixAnswers[row] === col && <Check size={16} weight="bold" />}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return <div>Unbekannter Fragetyp</div>;
    }
  };

  if (isCompleted) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.completedScreen}>
            <div className={styles.completedIcon}>
              <Check size={64} weight="bold" />
            </div>
            <h2>Vorschau abgeschlossen!</h2>
            <p>{totalQuestions} Fragen beantwortet</p>
            <div className={styles.answersPreview}>
              <h4>Ihre Antworten:</h4>
              <div className={styles.answersList}>
                {allQuestions.map((q, idx) => (
                  <div key={q.id} className={styles.answerItem}>
                    <span className={styles.answerNumber}>{idx + 1}</span>
                    <span className={styles.answerQuestion}>{q.questionText.substring(0, 50)}...</span>
                    <span className={styles.answerValue}>
                      {typeof answers[q.id] === 'object' 
                        ? JSON.stringify(answers[q.id])
                        : String(answers[q.id] ?? '-')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button className={styles.closeButtonLarge} onClick={onClose}>
              Vorschau schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = zeiterfassungStep === 'questions' && currentQuestion 
    ? getQuestionIcon(currentQuestion.type) 
    : Timer;

  // Determine if this is the last step
  const isLastStep = () => {
    if (zeiterfassungStep === 'end') return true;
    if (zeiterfassungStep === 'questions' && currentQuestion) {
      const nextIndex = findNextVisibleIndex(currentIndex, { ...answers, [currentQuestion.id]: answers[currentQuestion.id] });
      return nextIndex === -1 && !zeiterfassungActive;
    }
    return false;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.previewBadge}>VORSCHAU</span>
            <h2 className={styles.title}>{title}</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Progress */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressText}>{currentStep} / {totalSteps}</span>
        </div>

        {/* Module indicator */}
        <div className={`${styles.moduleIndicator} ${zeiterfassungStep !== 'questions' ? styles.moduleIndicatorZeit : ''}`}>
          {zeiterfassungStep === 'start' ? 'Zeiterfassung - Anfahrt' : 
           zeiterfassungStep === 'end' ? 'Zeiterfassung - Abschluss' :
           (currentQuestion as any)?.moduleName || ''}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {zeiterfassungStep === 'start' ? (
            renderZeiterfassungStart()
          ) : zeiterfassungStep === 'end' ? (
            renderZeiterfassungEnd()
          ) : currentQuestion ? (
            <>
              <div className={styles.questionHeader}>
                <div className={styles.questionTypeIcon}>
                  <Icon size={24} weight="fill" />
                </div>
                {currentQuestion.required && (
                  <span className={styles.requiredBadge}>Pflichtfrage</span>
                )}
              </div>

              <h3 className={styles.questionText}>{currentQuestion.questionText}</h3>

              <div className={styles.inputArea}>
                {renderQuestionInput()}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button 
            className={styles.navButton}
            onClick={handlePrev}
            disabled={!canGoPrev()}
          >
            <ArrowLeft size={20} weight="bold" />
            Zurück
          </button>

          <button 
            className={`${styles.navButton} ${styles.navButtonPrimary}`}
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {isLastStep() ? (
              <>
                <Check size={20} weight="bold" />
                Abschließen
              </>
            ) : (
              <>
                Weiter
                <ArrowRight size={20} weight="bold" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
