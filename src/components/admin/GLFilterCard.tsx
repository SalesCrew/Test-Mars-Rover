import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, Plus, Minus, ArrowRight, ArrowsClockwise, UserMinus, X, CircleNotch } from '@phosphor-icons/react';
import type { AdminMarket } from '../../types/market-types';
import styles from './GLFilterCard.module.css';

export interface ActionLogEntry {
  id: string;
  type: 'assign' | 'swap' | 'remove';
  chain: string;
  address: string;
  previousGl?: string; // For swap actions
}

interface GLFilterCardProps {
  totalMarkets: number;
  activeMarkets: number;
  inactiveMarkets: number;
  gebietsleiter: string[];
  selectedGL: string | null;
  onGLSelect: (gl: string) => void;
  hoveredMarket: AdminMarket | null;
  actionLogs?: ActionLogEntry[];
  activeMode?: 'add' | 'remove' | null;
  onModeChange?: (mode: 'add' | 'remove' | null) => void;
  isProcessing?: boolean;
  isFadingOut?: boolean;
  processingType?: 'assign' | 'swap' | 'remove';
  showCheckmark?: boolean;
}

export const GLFilterCard: React.FC<GLFilterCardProps> = ({
  totalMarkets,
  activeMarkets,
  inactiveMarkets,
  gebietsleiter,
  selectedGL,
  onGLSelect,
  hoveredMarket,
  actionLogs = [],
  activeMode: _activeMode,
  onModeChange,
  isProcessing = false,
  isFadingOut = false,
  processingType,
  showCheckmark = false
}) => {
  // activeMode is tracked by parent for market click handling
  void _activeMode;
  const [animationState, setAnimationState] = useState<'idle' | 'slideOut' | 'slideIn'>('idle');
  const [activeGL, setActiveGL] = useState<string | null>(null);
  const [, setActiveGLIndex] = useState<number | null>(null);
  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [isRemoveExpanded, setIsRemoveExpanded] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
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
  const isRemoveMode = _activeMode === 'remove';
  const showRedPreview = isRemoveMode && isProcessing;
  const showBluePreview = processingType === 'swap' && isProcessing;
  const showGreenPreview = processingType === 'assign' && isProcessing;
  
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
        {selectedGL && hoveredMarket && !isFadingOut && (
          <div className={`${styles.marketPreview} ${
            showRedPreview ? styles.marketPreviewRemove : 
            showBluePreview ? styles.marketPreviewSwap :
            showGreenPreview ? styles.marketPreviewAssign :
            isMatchingGL ? styles.marketPreviewMatch : 
            ''
          }`}>
            <div className={styles.marketInfo}>
              <span className={styles.marketName}>
                {hoveredMarket.chain} {hoveredMarket.address}
              </span>
              <span className={styles.marketAddress}>
                {hoveredMarket.postalCode} {hoveredMarket.city}
              </span>
            </div>
            {isMatchingGL && !showRedPreview && !showBluePreview && !showGreenPreview && (
              <div className={styles.checkmarkContainer}>
                <CheckCircle size={16} weight="fill" className={styles.checkmark} />
              </div>
            )}
            {showRedPreview && (
              <div className={styles.spinnerContainer}>
                <CircleNotch size={16} weight="bold" className={styles.spinner} />
              </div>
            )}
            {showBluePreview && (
              <div className={styles.spinnerContainerBlue}>
                <ArrowsClockwise size={16} weight="bold" className={styles.spinnerBlue} />
              </div>
            )}
            {showGreenPreview && !showCheckmark && (
              <div className={styles.spinnerContainerGreen}>
                <CircleNotch size={16} weight="bold" className={styles.spinnerGreen} />
              </div>
            )}
            {showGreenPreview && showCheckmark && (
              <div className={styles.checkmarkContainer}>
                <CheckCircle size={16} weight="fill" className={styles.checkmark} />
              </div>
            )}
          </div>
        )}
        {selectedGL && hoveredMarket && isFadingOut && (
          <div className={`${styles.marketPreview} ${
            showRedPreview ? styles.marketPreviewRemove : 
            showBluePreview ? styles.marketPreviewSwap :
            showGreenPreview ? styles.marketPreviewAssign :
            isMatchingGL ? styles.marketPreviewMatch : 
            ''
          } ${styles.marketPreviewFadeOut}`}>
            <div className={styles.marketInfo}>
              <span className={styles.marketName}>
                {hoveredMarket.chain} {hoveredMarket.address}
              </span>
              <span className={styles.marketAddress}>
                {hoveredMarket.postalCode} {hoveredMarket.city}
              </span>
            </div>
            {showRedPreview && (
              <div className={styles.spinnerContainer}>
                <CircleNotch size={16} weight="bold" className={styles.spinner} />
              </div>
            )}
            {showBluePreview && (
              <div className={styles.spinnerContainerBlue}>
                <ArrowsClockwise size={16} weight="bold" className={styles.spinnerBlue} />
              </div>
            )}
            {showGreenPreview && (
              <div className={styles.checkmarkContainer}>
                <CheckCircle size={16} weight="fill" className={styles.checkmark} />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Action Logs Section - between the two dividers */}
      {selectedGL && (
        <div 
          className={styles.actionLogsSection}
          onClick={() => setIsLogsModalOpen(true)}
        >
          <div className={styles.actionLogsList}>
            {actionLogs.map((log) => (
              <div 
                key={log.id} 
                className={`${styles.actionLogEntry} ${
                  log.type === 'assign' ? styles.actionLogAssign : 
                  log.type === 'swap' ? styles.actionLogSwap : 
                  styles.actionLogRemove
                }`}
              >
                <div className={styles.logMarketInfo}>
                  <span className={styles.logChain}>{log.chain}</span>
                  <span className={styles.logAddress}>{log.address}</span>
                </div>
                <div className={styles.logAction}>
                  {log.type === 'assign' && (
                    <>
                      <div className={styles.logIconContainer}>
                        <ArrowRight size={12} weight="bold" className={styles.logIconAssign} />
                      </div>
                      <span className={styles.logTargetGl}>{selectedGL}</span>
                    </>
                  )}
                  {log.type === 'swap' && (
                    <>
                      <div className={styles.logIconContainer}>
                        <ArrowRight size={12} weight="bold" className={styles.logIconAssign} />
                      </div>
                      <span className={styles.logTargetGl}>{selectedGL}</span>
                      <div className={styles.logIconContainer}>
                        <ArrowsClockwise size={12} weight="bold" className={styles.logIconSwap} />
                      </div>
                      {log.previousGl && (
                        <span className={styles.logPreviousGl}>{log.previousGl}</span>
                      )}
                    </>
                  )}
                  {log.type === 'remove' && (
                    <div className={styles.logIconContainer}>
                      <UserMinus size={12} weight="bold" className={styles.logIconRemove} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Right Action Buttons - Fade in/out based on GL selection */}
      {selectedGL && (
        <div className={styles.actionButtonsSection}>
          <div className={styles.actionDivider} />
          <div className={`${styles.actionButtons} ${isAddExpanded || isRemoveExpanded ? styles.actionButtonsExpanded : ''}`}>
            <button 
              className={`${styles.actionButtonAdd} ${isAddExpanded ? styles.actionButtonAddExpanded : ''} ${isRemoveExpanded ? styles.actionButtonAddHidden : ''}`}
              onClick={() => {
                const newExpanded = !isAddExpanded;
                setIsAddExpanded(newExpanded);
                if (newExpanded) setIsRemoveExpanded(false);
                onModeChange?.(newExpanded ? 'add' : null);
              }}
            >
              <Plus size={16} weight="bold" />
            </button>
            <button 
              className={`${styles.actionButtonRemove} ${isRemoveExpanded ? styles.actionButtonRemoveExpanded : ''} ${isAddExpanded ? styles.actionButtonRemoveHidden : ''}`}
              onClick={() => {
                const newExpanded = !isRemoveExpanded;
                setIsRemoveExpanded(newExpanded);
                if (newExpanded) setIsAddExpanded(false);
                onModeChange?.(newExpanded ? 'remove' : null);
              }}
            >
              <Minus size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}
      
      {/* Action Logs Modal - Rendered outside via portal */}
      {isLogsModalOpen && ReactDOM.createPortal(
        <div className={styles.logsModalOverlay} onClick={() => setIsLogsModalOpen(false)}>
          <div className={styles.logsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.logsModalHeader}>
              <h3 className={styles.logsModalTitle}>Aktionen für {selectedGL}</h3>
              <button 
                className={styles.logsModalClose}
                onClick={() => setIsLogsModalOpen(false)}
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className={styles.logsModalContent}>
              {actionLogs.length === 0 ? (
                <div className={styles.logsEmpty}>Keine Aktionen</div>
              ) : (
                actionLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`${styles.logsModalEntry} ${
                      log.type === 'assign' ? styles.logsModalEntryAssign : 
                      log.type === 'swap' ? styles.logsModalEntrySwap : 
                      styles.logsModalEntryRemove
                    }`}
                  >
                    <div className={styles.logsModalMarketInfo}>
                      <span className={styles.logsModalChain}>{log.chain}</span>
                      <span className={styles.logsModalAddress}>{log.address}</span>
                    </div>
                    <div className={styles.logsModalAction}>
                      {log.type === 'assign' && (
                        <>
                          <div className={styles.logsModalIconContainer}>
                            <ArrowRight size={16} weight="bold" className={styles.logIconAssign} />
                          </div>
                          <span className={styles.logsModalTargetGl}>{selectedGL}</span>
                        </>
                      )}
                      {log.type === 'swap' && (
                        <>
                          <div className={styles.logsModalIconContainer}>
                            <ArrowRight size={16} weight="bold" className={styles.logIconAssign} />
                          </div>
                          <span className={styles.logsModalTargetGl}>{selectedGL}</span>
                          <div className={styles.logsModalIconContainer}>
                            <ArrowsClockwise size={16} weight="bold" className={styles.logIconSwap} />
                          </div>
                          {log.previousGl && (
                            <span className={styles.logsModalPreviousGl}>{log.previousGl}</span>
                          )}
                        </>
                      )}
                      {log.type === 'remove' && (
                        <div className={styles.logsModalIconContainer}>
                          <UserMinus size={16} weight="bold" className={styles.logIconRemove} />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

