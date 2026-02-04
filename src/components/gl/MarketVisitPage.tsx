import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ChartPie
} from '@phosphor-icons/react';
import Aurora from './Aurora';
import type { Market } from '../../types/market-types';
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
  type: QuestionType;
  questionText: string;
  instruction?: string;
  required: boolean;
  options?: string[];
  likertScale?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
  matrixRows?: string[];
  matrixColumns?: string[];
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

interface Module {
  id: string;
  name: string;
  questions: Question[];
}

interface MarketVisitPageProps {
  market: Market;
  modules: Module[];
  zeiterfassungActive?: boolean;
  onClose: () => void;
  onComplete: (answers: Record<string, any>) => void;
  onOpenVorbesteller: () => void;
  onOpenVorverkauf: () => void;
  onOpenProduktrechner: () => void;
}

export const MarketVisitPage: React.FC<MarketVisitPageProps> = ({
  market: _market,
  modules,
  zeiterfassungActive = true,
  onClose: _onClose,
  onComplete,
  onOpenVorbesteller: _onOpenVorbesteller,
  onOpenVorverkauf: _onOpenVorverkauf,
  onOpenProduktrechner: _onOpenProduktrechner
}) => {
  // Props prefixed with _ are available for future use (action buttons, header)
  void _market;
  void _onClose;
  void _onOpenVorbesteller;
  void _onOpenVorverkauf;
  void _onOpenProduktrechner;
  // Flatten all questions with module context
  const allQuestions = useMemo(() => 
    modules.flatMap(module => 
      module.questions.map(q => ({ ...q, moduleName: module.name, moduleId: module.id }))
    ), [modules]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Determine if there are any questions/modules
  const hasFragebogen = modules.length > 0 && allQuestions.length > 0;
  
  // Zeiterfassung state - if no fragebogen, go directly to 'end' step
  const [zeiterfassungStep, setZeiterfassungStep] = useState<'start' | 'questions' | 'end' | null>(
    hasFragebogen ? 'questions' : 'end' // Go directly to end if no fragebogen
  );
  const [zeiterfassung, setZeiterfassung] = useState({
    fahrzeitVon: '', // Kept for backward compatibility
    fahrzeitBis: '', // Kept for backward compatibility
    distanzKm: '',
    besuchszeitVon: '',
    besuchszeitBis: '',
    kommentar: '',
    foodProzent: 50,
    marketStartTime: '', // Auto-recorded when visit starts
    marketEndTime: ''    // Auto-recorded when visit ends
  });
  const [fahrzeitRunning, setFahrzeitRunning] = useState(false);
  const [besuchszeitRunning, setBesuchszeitRunning] = useState(false);
  const [visitStarted, setVisitStarted] = useState(false); // Track if visit has been started
  
  // Elapsed time in seconds for live counter
  const [fahrzeitElapsed, setFahrzeitElapsed] = useState(0);
  const [besuchszeitElapsed, setBesuchszeitElapsed] = useState(0);
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

  // TEMPORARILY DISABLED - Enhanced day tracking integration
  // Will be reactivated in 2 days after GL training
  // Function to start the market visit (records timestamp)
  // const startMarketVisit = () => {
  //   const now = new Date();
  //   const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  //   setZeiterfassung(prev => ({
  //     ...prev,
  //     marketStartTime: startTime,
  //     besuchszeitVon: startTime
  //   }));
  //   setVisitStarted(true);
  // };

  // TEMPORARY: Simple auto-start behavior (old system)
  useEffect(() => {
    if (!zeiterfassung.besuchszeitVon) {
      const now = new Date();
      const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setZeiterfassung(prev => ({
        ...prev,
        besuchszeitVon: startTime,
        marketStartTime: startTime
      }));
      setVisitStarted(true);
    }
  }, []); // Auto-set on component mount (old behavior)

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

  const currentQuestion = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;

  // Calculate progress
  const zeitSteps = zeiterfassungActive ? 2 : 0;
  const totalSteps = totalQuestions + zeitSteps;
  const currentStep = zeiterfassungStep === 'start' ? 1 
    : zeiterfassungStep === 'end' ? totalSteps 
    : currentIndex + 1 + (zeiterfassungActive ? 1 : 0);
  const progress = (currentStep / totalSteps) * 100;

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

  // TEMPORARILY DISABLED - Enhanced toggle with day tracking
  // const toggleBesuchszeitTimer = () => {
  //   const currentTime = getCurrentTime();
  //   if (!besuchszeitRunning) {
  //     // Start the visit - this creates the timestamp
  //     if (!visitStarted) {
  //       startMarketVisit();
  //     } else {
  //       // Resume - just update the start time for this session
  //       setZeiterfassung(prev => ({ ...prev, besuchszeitVon: prev.besuchszeitVon || currentTime }));
  //     }
  //     setBesuchszeitRunning(true);
  //   } else {
  //     // Stop the timer and record end time
  //     setZeiterfassung(prev => ({ ...prev, besuchszeitBis: currentTime, marketEndTime: currentTime }));
  //     setBesuchszeitRunning(false);
  //   }
  // };

  // TEMPORARY: Simple timer toggle (old behavior)
  const toggleBesuchszeitTimer = () => {
    const currentTime = getCurrentTime();
    if (!besuchszeitRunning) {
      setBesuchszeitRunning(true);
    } else {
      setZeiterfassung(prev => ({ ...prev, besuchszeitBis: currentTime, marketEndTime: currentTime }));
      setBesuchszeitRunning(false);
    }
  };

  const handleAnswer = (value: any) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    // 'start' step is no longer used - Fahrzeit is auto-calculated by day tracking
    if (zeiterfassungStep === 'start') {
      // Legacy support: just move to questions
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
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (zeiterfassungActive) {
        setZeiterfassungStep('end');
      } else {
        setIsCompleted(true);
        // Don't call onComplete here - wait for user to click "Zurück zur Übersicht"
      }
      return;
    }
    
    if (zeiterfassungStep === 'end') {
      // Record market end time
      const now = new Date();
      const endTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setZeiterfassung(prev => ({
        ...prev,
        marketEndTime: endTime,
        besuchszeitBis: prev.besuchszeitBis || endTime // Set if not already set
      }));
      setIsCompleted(true);
      // Don't call onComplete here - wait for user to click "Zurück zur Übersicht"
    }
  };
  
  const handleCompleteAndClose = () => {
    onComplete({ ...answers, zeiterfassung });
  };

  const handlePrev = () => {
    if (zeiterfassungStep === 'end') {
      // Go back to questions (no longer going to 'start' - Fahrzeit is auto-calculated)
      if (totalQuestions > 0) {
        setZeiterfassungStep('questions');
        setCurrentIndex(totalQuestions - 1);
      }
      // If no questions, stay on 'end' (can't go back further)
      return;
    }
    
    if (zeiterfassungStep === 'questions' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return;
    }
    
    // At first question - can't go back further (no 'start' step anymore)
    // User can only close the visit
  };

  const canProceed = () => {
    // 'start' step is no longer used - always allow proceeding
    if (zeiterfassungStep === 'start') {
      return true;
    }
    if (zeiterfassungStep === 'end') {
      return zeiterfassung.besuchszeitVon && zeiterfassung.besuchszeitBis;
    }
    // If in 'questions' step but no questions exist, allow proceeding
    if (zeiterfassungStep === 'questions' && totalQuestions === 0) {
      return true;
    }
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  // Render question based on type
  const renderQuestionInput = () => {
    if (!currentQuestion) return null;
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
        const selectedOptions = answer || [];
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
                      handleAnswer(selectedOptions.filter((o: string) => o !== option));
                    } else {
                      handleAnswer([...selectedOptions, option]);
                    }
                  }}
                >
                  <RadioButton size={20} weight={isSelected ? 'fill' : 'regular'} />
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
        return (
          <div className={styles.photoUpload}>
            <Camera size={48} weight="regular" />
            <p>Tippen um Foto aufzunehmen</p>
            <button 
              className={styles.photoButton}
              onClick={() => handleAnswer('photo_captured_test')}
            >
              <Camera size={20} />
              <span>Foto aufnehmen</span>
            </button>
            {answer && <span className={styles.photoConfirm}>Foto aufgenommen</span>}
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
                  {currentQuestion.matrixColumns?.map((col, idx) => (
                    <th key={idx}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentQuestion.matrixRows?.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className={styles.matrixRowLabel}>{row}</td>
                    {currentQuestion.matrixColumns?.map((col, colIdx) => {
                      const matrixAnswers = answer || {};
                      const isSelected = matrixAnswers[row] === col;
                      return (
                        <td key={colIdx}>
                          <button
                            className={`${styles.matrixCell} ${isSelected ? styles.matrixCellSelected : ''}`}
                            onClick={() => handleAnswer({ ...matrixAnswers, [row]: col })}
                          >
                            {isSelected && <Check size={16} weight="bold" />}
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
      <div className={styles.zeitHeader}>
        <div className={styles.zeitIcon}>
          <Timer size={28} weight="fill" />
        </div>
        <h3 className={styles.zeitTitle}>Abschluss</h3>
        <p className={styles.zeitSubtitle}>Besuchszeit und Aufteilung</p>
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
                onChange={(e) => setZeiterfassung(prev => ({ ...prev, besuchszeitVon: e.target.value }))}
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
                onChange={(e) => setZeiterfassung(prev => ({ ...prev, besuchszeitBis: e.target.value }))}
                placeholder="--:--"
                maxLength={5}
              />
            </div>
            <div className={styles.timeField}>
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
          <button 
            type="button"
            className={besuchszeitRunning ? styles.marktbesuchButtonStop : styles.marktbesuchButtonStart}
            onClick={toggleBesuchszeitTimer}
          >
            {besuchszeitRunning ? (
              <>
                <span>Marktbesuch beenden</span>
                <span className={styles.marktbesuchTimer}>
                  {formatElapsed(besuchszeitElapsed).split('').map((char, idx) => (
                    <span key={`${idx}-${char}`} className={styles.timerDigit}>{char}</span>
                  ))}
                </span>
              </>
            ) : (
              <span>{visitStarted && !besuchszeitRunning ? 'Marktbesuch fortsetzen' : 'Marktbesuch starten'}</span>
            )}
          </button>
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
                
                <div className={styles.inputArea}>
                  {renderQuestionInput()}
                </div>
              </div>
            ) : null}
            
            {/* Marktbesuch Timer Button - fixed at bottom above footer */}
            {zeiterfassungStep === 'questions' && zeiterfassungActive && (
              <div className={styles.marktbesuchButtonWrapper}>
                <button 
                  className={besuchszeitRunning ? styles.marktbesuchButtonStop : styles.marktbesuchButtonStart}
                  onClick={toggleBesuchszeitTimer}
                >
                  {besuchszeitRunning ? (
                    <>
                      <span>Marktbesuch beenden</span>
                      <span className={styles.marktbesuchTimer}>
                        {formatElapsed(besuchszeitElapsed).split('').map((char, idx) => (
                          <span key={`${idx}-${char}`} className={styles.timerDigit}>{char}</span>
                        ))}
                      </span>
                    </>
                  ) : (
                    <span>{visitStarted && !besuchszeitRunning ? 'Marktbesuch fortsetzen' : 'Marktbesuch starten'}</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed Navigation Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <button 
            className={styles.navButton}
            onClick={handlePrev}
            disabled={zeiterfassungStep === 'start' || (!zeiterfassungActive && currentIndex === 0)}
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
              {zeiterfassungStep === 'end' || (!zeiterfassungActive && currentIndex === totalQuestions - 1) 
                ? 'Abschließen' 
                : 'Weiter'}
            </span>
            {zeiterfassungStep === 'end' || (!zeiterfassungActive && currentIndex === totalQuestions - 1) 
              ? <Check size={20} />
              : <ArrowRight size={20} />}
          </button>
        </div>
      </footer>
    </div>
  );
};
