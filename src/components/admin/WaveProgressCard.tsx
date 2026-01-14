import React, { useState, useEffect, useRef } from 'react';
import { CalendarBlank, Package, Users, Storefront, CheckCircle, PencilSimple } from '@phosphor-icons/react';
import styles from './WaveProgressCard.module.css';
import { WaveMarketsModal } from './WaveMarketsModal';

interface WaveProgressData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'finished';
  goalType: 'percentage' | 'value';
  goalPercentage?: number;
  goalValue?: number;
  displayCount: number;
  displayTarget: number;
  kartonwareCount: number;
  kartonwareTarget: number;
  paletteCount?: number;
  paletteTarget?: number;
  schutteCount?: number;
  schutteTarget?: number;
  currentValue?: number;
  assignedMarkets: number;
  participatingGLs: number;
}

interface WaveProgressCardProps {
  wave: WaveProgressData;
  isFinished?: boolean;
  onClick?: () => void;
  onEdit?: (waveId: string) => void;
}

export const WaveProgressCard: React.FC<WaveProgressCardProps> = ({ wave, isFinished = false, onClick, onEdit }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [showMarketsModal, setShowMarketsModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const waveNameRef = useRef<HTMLHeadingElement>(null);

  // Check if wave name is truncated
  useEffect(() => {
    const checkTruncation = () => {
      if (waveNameRef.current) {
        setIsTruncated(waveNameRef.current.scrollWidth > waveNameRef.current.clientWidth);
      }
    };
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [wave.name]);

  // Format date from "2026-01-05" to "5.1"
  const formatCompactDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parseInt(parts[2])}.${parseInt(parts[1])}`;
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleEdit = () => {
    setContextMenu(null);
    if (onEdit) {
      onEdit(wave.id);
    }
  };
  const {
    name,
    startDate,
    endDate,
    goalType,
    goalPercentage,
    goalValue,
    displayCount,
    displayTarget,
    kartonwareCount,
    kartonwareTarget,
    paletteCount,
    paletteTarget,
    schutteCount,
    schutteTarget,
    currentValue,
    assignedMarkets,
    participatingGLs,
  } = wave;

  // Calculate progress percentages (rounded to 1 decimal)
  const _displayProgress = displayTarget > 0 ? Math.min(100, Math.round((displayCount / displayTarget) * 100 * 10) / 10) : 0;
  const _kartonwareProgress = kartonwareTarget > 0 ? Math.min(100, Math.round((kartonwareCount / kartonwareTarget) * 100 * 10) / 10) : 0;
  void _displayProgress; void _kartonwareProgress; // Reserved for future use

  // Calculate overall progress (rounded to 1 decimal)
  const totalItems = displayCount + kartonwareCount + (paletteCount || 0) + (schutteCount || 0);
  const totalTargets = displayTarget + kartonwareTarget + (paletteTarget || 0) + (schutteTarget || 0);
  const overallProgress = totalTargets > 0 ? Math.min(100, Math.round((totalItems / totalTargets) * 100 * 10) / 10) : 0;
  
  // For percentage-based goals: calculate the goal in items (e.g., 80% of totalTargets)
  const goalItemCount = goalType === 'percentage' && goalPercentage 
    ? Math.round(totalTargets * (goalPercentage / 100) * 10) / 10 
    : totalTargets;

  // Check if goal is met
  const goalMet = goalType === 'percentage'
    ? overallProgress >= (goalPercentage || 100)
    : (currentValue || 0) >= (goalValue || 0);

  return (
    <>
    <div 
      className={`${styles.card} ${isFinished ? styles.cardFinished : ''} ${onClick ? styles.cardClickable : ''}`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className={`${styles.header} ${isTruncated ? styles.headerTruncated : ''}`}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <CalendarBlank size={20} weight="duotone" />
          </div>
          <div className={styles.headerInfo}>
            <h3 ref={waveNameRef} className={styles.waveName}>{name}</h3>
            <span className={styles.dateRangePill}>
              {formatCompactDate(startDate)} - {formatCompactDate(endDate)}
            </span>
          </div>
        </div>
        <div className={`${styles.statusBadge} ${isFinished ? styles.statusFinished : styles.statusActive}`}>
          {isFinished && <CheckCircle size={14} weight="fill" />}
          <span>{isFinished ? 'Abgeschlossen' : 'Aktiv'}</span>
        </div>
      </div>

      {/* Goal Display */}
      <div className={styles.goalDisplay}>
        {goalType === 'percentage' ? (
          <>
            <div className={`${styles.goalValue} ${goalMet ? styles.goalValueSuccess : ''}`}>
              {totalItems}/{Math.round(goalItemCount * 10) / 10}
            </div>
            <div className={styles.goalLabel}>Artikel ({goalPercentage}% von {totalTargets})</div>
          </>
        ) : (
          <>
            <div className={`${styles.goalValue} ${goalMet ? styles.goalValueSuccess : ''}`}>
              €{(currentValue || 0).toLocaleString('de-DE')}
            </div>
            <div className={styles.goalLabel}>von €{(goalValue || 0).toLocaleString('de-DE')} Ziel</div>
          </>
        )}
      </div>

      {/* Single Unified Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <div className={styles.progressLabel}>
            <Package size={14} weight="fill" />
            <span>Fortschritt</span>
          </div>
          <div className={styles.progressCount}>
            {goalType === 'percentage' ? (
              <>{overallProgress}% ({totalItems}/{totalTargets} Artikel)</>
            ) : (
              <>€{(currentValue || 0).toLocaleString('de-DE')} erreicht</>
            )}
          </div>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressBar} ${goalMet ? styles.progressSuccess : ''}`}
            style={{ width: `${goalType === 'percentage' ? Math.min(100, (totalItems / goalItemCount) * 100) : Math.min(100, ((currentValue || 0) / (goalValue || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics Footer */}
      <div className={styles.footer}>
        <div 
          className={`${styles.footerMetric} ${styles.footerMetricClickable}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowMarketsModal(true);
          }}
        >
          <Storefront size={16} weight="fill" />
          <div className={styles.footerMetricInfo}>
            <div className={styles.footerMetricValue}>
              {assignedMarkets}
            </div>
            <div className={styles.footerMetricLabel}>Märkte</div>
          </div>
        </div>
        <div className={styles.footerMetric}>
          <Users size={16} weight="fill" />
          <div className={styles.footerMetricInfo}>
            <div className={styles.footerMetricValue}>
              {participatingGLs}
            </div>
            <div className={styles.footerMetricLabel}>GLs</div>
          </div>
        </div>
        <div className={styles.footerMetric}>
          <Package size={16} weight="fill" />
          <div className={styles.footerMetricInfo}>
            <div className={styles.footerMetricValue}>
              {totalItems}/{totalTargets}
            </div>
            <div className={styles.footerMetricLabel}>Artikel</div>
          </div>
        </div>
      </div>
    </div>

    {/* Context Menu */}
    {contextMenu && onEdit && (
      <div
        ref={menuRef}
        className={styles.contextMenu}
        style={{ top: contextMenu.y, left: contextMenu.x }}
      >
        <button className={styles.contextMenuItem} onClick={handleEdit}>
          <PencilSimple size={16} weight="regular" />
          <span>Bearbeiten</span>
        </button>
      </div>
    )}

    {/* Markets Modal */}
    {showMarketsModal && (
      <WaveMarketsModal
        welle={{ id: wave.id, name: wave.name }}
        onClose={() => setShowMarketsModal(false)}
      />
    )}
    </>
  );
};
