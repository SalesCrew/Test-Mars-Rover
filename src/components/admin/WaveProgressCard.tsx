import React, { useState, useEffect, useRef } from 'react';
import { CalendarBlank, Package, Users, Storefront, CheckCircle, PencilSimple } from '@phosphor-icons/react';
import styles from './WaveProgressCard.module.css';

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
  const menuRef = useRef<HTMLDivElement>(null);

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
    currentValue,
    assignedMarkets,
    participatingGLs,
  } = wave;

  // Calculate progress percentages (rounded to 2 decimals) - kept for future per-type display
  const _displayProgress = displayTarget > 0 ? Math.min(100, Math.round((displayCount / displayTarget) * 100 * 100) / 100) : 0;
  const _kartonwareProgress = kartonwareTarget > 0 ? Math.min(100, Math.round((kartonwareCount / kartonwareTarget) * 100 * 100) / 100) : 0;
  void _displayProgress; void _kartonwareProgress; // Reserved for future use

  // Calculate overall progress (rounded to 2 decimals)
  const totalItems = displayCount + kartonwareCount;
  const totalTargets = displayTarget + kartonwareTarget;
  const overallProgress = totalTargets > 0 ? Math.min(100, Math.round((totalItems / totalTargets) * 100 * 100) / 100) : 0;

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
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <CalendarBlank size={20} weight="duotone" />
          </div>
          <div className={styles.headerInfo}>
            <h3 className={styles.waveName}>{name}</h3>
            <div className={styles.dateRange}>
              {startDate} - {endDate}
            </div>
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
              {overallProgress}%
            </div>
            <div className={styles.goalLabel}>von {goalPercentage}% Ziel</div>
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
              <>{overallProgress}% erreicht</>
            ) : (
              <>€{(currentValue || 0).toLocaleString('de-DE')} erreicht</>
            )}
          </div>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressBar} ${goalMet ? styles.progressSuccess : ''}`}
            style={{ width: `${goalType === 'percentage' ? overallProgress : Math.min(100, ((currentValue || 0) / (goalValue || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics Footer */}
      <div className={styles.footer}>
        <div className={styles.footerMetric}>
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
              {totalItems}
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
    </>
  );
};
