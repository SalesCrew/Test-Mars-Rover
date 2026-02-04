import React, { useState, useEffect } from 'react';
import styles from './DevPanel.module.css';

interface DevPanelProps {
  onCompleteNextMarket: () => void;
  onToggle?: (toggle: () => void) => void;
}

export const DevPanel: React.FC<DevPanelProps> = ({ onCompleteNextMarket, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Load saved opacity from localStorage or default to 1
  const [opacityMultiplier, setOpacityMultiplier] = useState(() => {
    const saved = localStorage.getItem('devPanelOpacity');
    return saved ? Number(saved) : 1;
  });

  // Save opacity to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('devPanelOpacity', String(opacityMultiplier));
  }, [opacityMultiplier]);

  const togglePanel = () => {
    setIsOpen(prev => !prev);
  };

  // Expose toggle function to parent
  useEffect(() => {
    if (onToggle) {
      onToggle(togglePanel);
    }
  }, [onToggle]);

  // Toggle dev panel with Shift+G+H (key sequence)
  useEffect(() => {
    let lastKey = '';
    let lastTime = 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // Check for Shift+G followed by Shift+H within 500ms
      if (e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        lastKey = 'G';
        lastTime = now;
      } else if (e.shiftKey && (e.key === 'H' || e.key === 'h')) {
        if (lastKey === 'G' && now - lastTime < 500) {
          e.preventDefault();
          togglePanel();
          lastKey = '';
        }
      } else {
        // Reset if any other key is pressed
        lastKey = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  // Apply opacity multiplier to all elements
  const panelStyle = {
    '--opacity-multiplier': opacityMultiplier,
  } as React.CSSProperties;

  return (
    <div className={styles.devPanel} style={panelStyle}>
      <div className={styles.devPanelHeader}>
        <span className={styles.devPanelTitle}>DEV PANEL</span>
        <div className={styles.headerControls}>
          <select 
            className={styles.opacitySelect}
            value={opacityMultiplier}
            onChange={(e) => setOpacityMultiplier(Number(e.target.value))}
            aria-label="Adjust opacity"
          >
            <option value={1}>100%</option>
            <option value={0.9}>90%</option>
            <option value={0.8}>80%</option>
            <option value={0.7}>70%</option>
            <option value={0.6}>60%</option>
            <option value={0.5}>50%</option>
            <option value={0.4}>40%</option>
            <option value={0.3}>30%</option>
            <option value={0.2}>20%</option>
            <option value={0.1}>10%</option>
          </select>
          <button 
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close dev panel"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className={styles.buttonGrid}>
        <button className={styles.devButton} onClick={onCompleteNextMarket}>
          Complete Next Market
        </button>
        
        {/* Zeiterfassung Test Buttons */}
        <button 
          className={styles.devButton} 
          onClick={() => window.dispatchEvent(new CustomEvent('dev:addTestZeiterfassung'))}
        >
          Add Test Time Entry (5 Markets)
        </button>
        
        <button 
          className={styles.devButton} 
          onClick={() => window.dispatchEvent(new CustomEvent('dev:addVorbestellerSubmissions'))}
        >
          Add Vorbesteller Submissions
        </button>
        
        <button 
          className={styles.devButton} 
          onClick={() => window.dispatchEvent(new CustomEvent('dev:addVorverkaufSubmissions'))}
        >
          Add Vorverkauf Submissions
        </button>
        
        <button 
          className={styles.devButton} 
          onClick={() => window.dispatchEvent(new CustomEvent('dev:addProdukttauschSubmissions'))}
        >
          Add Produkttausch Submissions
        </button>
        
        <button 
          className={styles.devButton} 
          onClick={() => window.dispatchEvent(new CustomEvent('dev:clearTestData'))}
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
        >
          Clear Test Data
        </button>
        
        {/* Placeholder buttons for future functionality */}
        {Array.from({ length: 14 }, (_, i) => (
          <button key={i} className={styles.devButton} disabled>
            Function {i + 7}
          </button>
        ))}
      </div>
    </div>
  );
};

