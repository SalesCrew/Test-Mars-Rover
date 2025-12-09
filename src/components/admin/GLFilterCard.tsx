import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Plus, Minus } from '@phosphor-icons/react';
import type { AdminMarket } from '../../types/market-types';
import styles from './GLFilterCard.module.css';

interface GLFilterCardProps {
  totalMarkets: number;
  activeMarkets: number;
  inactiveMarkets: number;
  gebietsleiter: string[];
  selectedGL: string | null;
  onGLSelect: (gl: string) => void;
  hoveredMarket: AdminMarket | null;
}

export const GLFilterCard: React.FC<GLFilterCardProps> = ({
  totalMarkets,
  activeMarkets,
  inactiveMarkets,
  gebietsleiter,
  selectedGL,
  onGLSelect,
  hoveredMarket
}) => {
  const [animationState, setAnimationState] = useState<'idle' | 'slideOut' | 'slideIn'>('idle');
  const [activeGL, setActiveGL] = useState<string | null>(null);
  const [, setActiveGLIndex] = useState<number | null>(null);
  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [isRemoveExpanded, setIsRemoveExpanded] = useState(false);
  const prevSelectedRef = useRef<string | null>(null);
  
  // Determine if a button is in the top row (first 4) or bottom row (last 4)
  const isTopRow = (index: number) => index < 4;
  
  // Calculate which row and column a button is in
  const getGridPosition = (index: number) => {
    const row = Math.floor(index / 4); // 0 or 1
    const col = index % 4; // 0, 1, 2, or 3
    return { row, col };
  };
  
  useEffect(() => {
    const prevSelected = prevSelectedRef.current;
    
    if (prevSelected === null && selectedGL !== null) {
      // Activating a filter - slide out others
      const index = gebietsleiter.indexOf(selectedGL);
      setActiveGL(selectedGL);
      setActiveGLIndex(index);
      setAnimationState('slideOut');
    } else if (prevSelected !== null && selectedGL === null) {
      // Deactivating a filter - slide in others
      setAnimationState('slideIn');
      setIsAddExpanded(false); // Reset expanded state
      setIsRemoveExpanded(false); // Reset expanded state
      // Reset after animation completes
      const timer = setTimeout(() => {
        setAnimationState('idle');
        setActiveGL(null);
        setActiveGLIndex(null);
      }, 400);
      prevSelectedRef.current = selectedGL;
      return () => clearTimeout(timer);
    } else if (prevSelected !== null && selectedGL !== null && prevSelected !== selectedGL) {
      // Switching from one GL to another
      const index = gebietsleiter.indexOf(selectedGL);
      setActiveGL(selectedGL);
      setActiveGLIndex(index);
    }
    
    prevSelectedRef.current = selectedGL;
  }, [selectedGL, gebietsleiter]);
  
  // Check if hovered market's GL matches selectedGL
  const isMatchingGL = hoveredMarket && hoveredMarket.gebietsleiter === selectedGL;
  
  return (
    <div className={styles.glFilterCard}>
      {/* Radial gradient overlay */}
      <div className={styles.gradientOverlay} />
      
      {/* Left Sidebar - Stats */}
      <div className={styles.statsColumn}>
        <div className={styles.statBlock}>
          <div className={styles.statNumber}>{totalMarkets}</div>
          <div className={styles.statLabel}>Märkte</div>
        </div>
        
        <div className={styles.statBlock}>
          <div className={`${styles.statNumber} ${styles.statNumberActive}`}>{activeMarkets}</div>
          <div className={styles.statLabel}>Aktiv</div>
        </div>
        
        <div className={styles.statBlock}>
          <div className={`${styles.statNumber} ${styles.statNumberInactive}`}>{inactiveMarkets}</div>
          <div className={styles.statLabel}>Inaktiv</div>
        </div>
      </div>
      
      {/* Right Section - GL Buttons Grid */}
      <div className={styles.glButtonsGrid}>
        {gebietsleiter.map((gl, index) => {
          const isActive = activeGL === gl;
          const isCurrentlySelected = selectedGL === gl;
          const { row, col } = getGridPosition(index);
          
          let animationClass = '';
          
          if (animationState === 'slideOut' && !isActive) {
            animationClass = isTopRow(index) ? styles.slideOutTop : styles.slideOutBottom;
          } else if (animationState === 'slideIn' && !isActive) {
            animationClass = isTopRow(index) ? styles.slideInTop : styles.slideInBottom;
          } else if (isActive && animationState === 'slideOut') {
            // Slide active button to top-left
            animationClass = styles[`slideToCornerR${row}C${col}`] || '';
          } else if (isActive && animationState === 'slideIn') {
            // Slide back from top-left to original position
            animationClass = styles[`slideFromCornerR${row}C${col}`] || '';
          }
          
          return (
            <button
              key={gl}
              className={`${styles.glButton} ${isCurrentlySelected ? styles.glButtonActive : ''} ${animationClass}`}
              onClick={() => onGLSelect(gl)}
            >
              {gl}
            </button>
          );
        })}
        
        {/* Divider line on the right */}
        <div className={styles.rightDivider} />
        
        {/* Market Preview - shown when hovering and GL is selected */}
        {selectedGL && hoveredMarket && (
          <div className={`${styles.marketPreview} ${isMatchingGL ? styles.marketPreviewMatch : ''}`}>
            <div className={styles.marketInfo}>
              <span className={styles.marketName}>
                {hoveredMarket.chain} {hoveredMarket.address}
              </span>
              <span className={styles.marketAddress}>
                {hoveredMarket.postalCode} {hoveredMarket.city}
              </span>
            </div>
            {isMatchingGL && (
              <div className={styles.checkmarkContainer}>
                <CheckCircle size={16} weight="fill" className={styles.checkmark} />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Right Action Buttons - Fade in/out based on GL selection */}
      {selectedGL && (
        <div className={styles.actionButtonsSection}>
          <div className={styles.actionDivider} />
          <div className={`${styles.actionButtons} ${isAddExpanded || isRemoveExpanded ? styles.actionButtonsExpanded : ''}`}>
            <button 
              className={`${styles.actionButtonAdd} ${isAddExpanded ? styles.actionButtonAddExpanded : ''} ${isRemoveExpanded ? styles.actionButtonAddHidden : ''}`}
              onClick={() => setIsAddExpanded(!isAddExpanded)}
            >
              <Plus size={16} weight="bold" />
            </button>
            <button 
              className={`${styles.actionButtonRemove} ${isRemoveExpanded ? styles.actionButtonRemoveExpanded : ''} ${isAddExpanded ? styles.actionButtonRemoveHidden : ''}`}
              onClick={() => setIsRemoveExpanded(!isRemoveExpanded)}
            >
              <Minus size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

