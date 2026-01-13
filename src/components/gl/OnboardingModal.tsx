import React, { useState, useEffect } from 'react';
import { ArrowRight, Check } from '@phosphor-icons/react';
import styles from './OnboardingModal.module.css';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface StepContent {
  header: string;
  description?: string;
  imageKey?: string;
  delayDescription?: boolean;
}

// Steps configuration
const steps: StepContent[] = [
  {
    header: 'Eure Wünsche werden gehört!',
    description: 'Und bei uns werden eure Wünsche Realität.',
    delayDescription: true
  },
  {
    header: 'Personalisierte Produkttausch Bündel sind da!',
    imageKey: 'step2'
  },
  {
    header: 'Wähle die Produkte',
    imageKey: 'step3'
  },
  {
    header: 'Fülle auf!',
    description: 'Füge Produktquantität hinzu bis die Bar voll ist und drücke auf fertig.',
    imageKey: 'step4'
  },
  {
    header: 'Wähle dein eigenes Bündel aus!',
    description: 'Und drücke auf Fertig.',
    imageKey: 'step5'
  },
  {
    header: 'Oh was ist das???',
    description: 'Du hast die gewählten Ersatzprodukte nicht dabei? Kein Problem drücke auf Vormerken um es bequem bei deinem nächsten Besuch mitzunehmen!',
    imageKey: 'step6'
  },
  {
    header: 'Wo finde ich das wieder?',
    description: 'Ein neuer Button erscheint, drücke ihn um das Fenster zu öffnen.',
    imageKey: 'step7'
  },
  {
    header: 'Und Fertig!',
    description: 'Drücke bei deinem nächsten Besuch auf erfüllen um den Produkttausch ganz einfach zu registrieren.',
    imageKey: 'step8'
  },
  {
    header: 'Viel Spaß!!!'
  }
];

// Dynamic image imports using Vite's import.meta.glob
const imageModules = import.meta.glob<{ default: string }>('../../assets/onboarding/*.png', { eager: true });

const getImage = (imageKey: string | undefined): string | undefined => {
  if (!imageKey) return undefined;
  
  const imageMap: Record<string, string> = {
    step2: 'step2-personalisiert.png',
    step3: 'step3-produkte.png',
    step4: 'step4-auffuellen.png',
    step5: 'step5-auswahl.png',
    step6: 'step6-vormerken.png',
    step7: 'step7-button.png',
    step8: 'step8-erfuellen.png'
  };
  
  const filename = imageMap[imageKey];
  if (!filename) return undefined;
  
  // Find matching module
  for (const path in imageModules) {
    if (path.endsWith(filename)) {
      return imageModules[path].default;
    }
  }
  
  return undefined;
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDescription, setShowDescription] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const totalSteps = steps.length;
  const step = steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  // Handle delayed description for step 1
  useEffect(() => {
    if (step.delayDescription) {
      setShowDescription(false);
      const timer = setTimeout(() => {
        setShowDescription(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowDescription(true);
    }
  }, [currentStep, step.delayDescription]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Progress Dots */}
        <div className={styles.progressDots}>
          {steps.map((_, index) => (
            <div 
              key={index} 
              className={`${styles.dot} ${index === currentStep ? styles.dotActive : ''} ${index < currentStep ? styles.dotCompleted : ''}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={`${styles.content} ${isTransitioning ? styles.contentFading : ''}`}>
          {/* Header */}
          <h1 className={styles.header}>{step.header}</h1>

          {/* Description */}
          {step.description && (
            <p className={`${styles.description} ${showDescription ? styles.descriptionVisible : ''}`}>
              {step.description}
            </p>
          )}

          {/* Image */}
          {step.imageKey && getImage(step.imageKey) && (
            <div className={styles.imageContainer}>
              <img 
                src={getImage(step.imageKey)} 
                alt={step.header}
                className={styles.image}
              />
            </div>
          )}
        </div>

        {/* Button */}
        <button className={styles.button} onClick={handleNext}>
          {isLastStep ? (
            <>
              <Check size={20} weight="bold" />
              Fertig
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
  );
};
