import React from 'react';
import ReactDOM from 'react-dom';
import { X, Calendar, CheckCircle, Package, TrendUp, Clock, CheckCircle as CheckCircleFilled, User } from '@phosphor-icons/react';
import styles from './WelleDetailModal.module.css';

interface DisplayItem {
  id: string;
  name: string;
  targetNumber: number;
  currentNumber: number;
  picture: string | null;
}

interface KartonwareItem {
  id: string;
  name: string;
  targetNumber: number;
  currentNumber: number;
  picture: string | null;
}

interface KWDay {
  kw: string;
  days: string[];
}

interface Welle {
  id: string;
  name: string;
  image: string | null;
  startDate: string;
  endDate: string;
  types: ('display' | 'kartonware')[];
  status: 'upcoming' | 'active' | 'past';
  displayCount: number;
  kartonwareCount: number;
  kwDays: KWDay[];
  displays?: DisplayItem[];
  kartonwareItems?: KartonwareItem[];
  totalGLs?: number;
  participatingGLs?: number;
}

interface WelleDetailModalProps {
  welle: Welle;
  onClose: () => void;
}

export const WelleDetailModal: React.FC<WelleDetailModalProps> = ({ welle, onClose }) => {
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    return `${startDate.toLocaleDateString('de-DE', options)} - ${endDate.toLocaleDateString('de-DE', options)}`;
  };

  const getStatusConfig = (status: Welle['status']) => {
    switch (status) {
      case 'active':
        return {
          label: 'Aktiv',
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          icon: <TrendUp size={20} weight="bold" />
        };
      case 'upcoming':
        return {
          label: 'Bevorstehend',
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: <Clock size={20} weight="bold" />
        };
      case 'past':
        return {
          label: 'Abgeschlossen',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          icon: <CheckCircleFilled size={20} weight="fill" />
        };
    }
  };

  const statusConfig = getStatusConfig(welle.status);
  const glParticipationRate = welle.totalGLs ? (welle.participatingGLs! / welle.totalGLs) * 100 : 0;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTop}>
            <div className={styles.statusBadge} style={{ 
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color 
            }}>
              {statusConfig.icon}
              <span>{statusConfig.label}</span>
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={24} weight="bold" />
            </button>
          </div>

          {welle.image && (
            <div className={styles.headerImage}>
              <img src={welle.image} alt={welle.name} />
            </div>
          )}

          <div className={styles.headerInfo}>
            <h2 className={styles.welleName}>{welle.name}</h2>
            <div className={styles.dateRange}>
              <Calendar size={18} weight="regular" />
              <span>{formatDateRange(welle.startDate, welle.endDate)}</span>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className={styles.modalContent}>
          {/* GL Participation Overview */}
          {welle.totalGLs && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <User size={20} weight="bold" />
                Gebietsleiter Beteiligung
              </h3>
              <div className={styles.participationCard}>
                <div className={styles.participationStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{welle.participatingGLs}</span>
                    <span className={styles.statLabel}>Teilnehmend</span>
                  </div>
                  <div className={styles.statDivider}>/</div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{welle.totalGLs}</span>
                    <span className={styles.statLabel}>Gesamt</span>
                  </div>
                </div>
                <div className={styles.progressBarWrapper}>
                  <div className={styles.progressBar}>
                    <div 
                      className={`${styles.progressFill} ${glParticipationRate >= 80 ? styles.progressFillSuccess : ''}`}
                      style={{ width: `${Math.min(glParticipationRate, 100)}%` }}
                    />
                  </div>
                  <span className={styles.progressPercentage}>{glParticipationRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Displays Section */}
          {welle.displays && welle.displays.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <CheckCircle size={20} weight="bold" />
                Displays
              </h3>
              <div className={styles.itemsList}>
                {welle.displays.map(display => {
                  const progress = (display.currentNumber / display.targetNumber) * 100;
                  const isComplete = display.currentNumber >= display.targetNumber;
                  
                  return (
                    <div key={display.id} className={styles.itemCard}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemInfo}>
                          {display.picture && (
                            <div className={styles.itemThumbnail}>
                              <img src={display.picture} alt={display.name} />
                            </div>
                          )}
                          <div className={styles.itemDetails}>
                            <h4 className={styles.itemName}>{display.name}</h4>
                            <div className={styles.itemTarget}>
                              <span className={styles.currentValue}>{display.currentNumber}</span>
                              <span className={styles.targetSeparator}>/</span>
                              <span className={styles.targetValue}>{display.targetNumber}</span>
                              <span className={styles.targetLabel}>Stück</span>
                            </div>
                          </div>
                        </div>
                        {isComplete && (
                          <div className={styles.completeBadge}>
                            <CheckCircle size={20} weight="fill" />
                          </div>
                        )}
                      </div>
                      <div className={styles.progressBarWrapper}>
                        <div className={styles.progressBar}>
                          <div 
                            className={`${styles.progressFill} ${isComplete ? styles.progressFillSuccess : ''}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className={styles.progressPercentage}>{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kartonware Section */}
          {welle.kartonwareItems && welle.kartonwareItems.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Package size={20} weight="bold" />
                Kartonware
              </h3>
              <div className={styles.itemsList}>
                {welle.kartonwareItems.map(item => {
                  const progress = (item.currentNumber / item.targetNumber) * 100;
                  const isComplete = item.currentNumber >= item.targetNumber;
                  
                  return (
                    <div key={item.id} className={styles.itemCard}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemInfo}>
                          {item.picture && (
                            <div className={styles.itemThumbnail}>
                              <img src={item.picture} alt={item.name} />
                            </div>
                          )}
                          <div className={styles.itemDetails}>
                            <h4 className={styles.itemName}>{item.name}</h4>
                            <div className={styles.itemTarget}>
                              <span className={styles.currentValue}>{item.currentNumber}</span>
                              <span className={styles.targetSeparator}>/</span>
                              <span className={styles.targetValue}>{item.targetNumber}</span>
                              <span className={styles.targetLabel}>Stück</span>
                            </div>
                          </div>
                        </div>
                        {isComplete && (
                          <div className={styles.completeBadge}>
                            <CheckCircle size={20} weight="fill" />
                          </div>
                        )}
                      </div>
                      <div className={styles.progressBarWrapper}>
                        <div className={styles.progressBar}>
                          <div 
                            className={`${styles.progressFill} ${isComplete ? styles.progressFillSuccess : ''}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className={styles.progressPercentage}>{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* KW Days Schedule */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Calendar size={20} weight="bold" />
              Verkaufstage
            </h3>
            <div className={styles.scheduleGrid}>
              {welle.kwDays.map((kw, idx) => (
                <div key={idx} className={styles.scheduleCard}>
                  <div className={styles.scheduleKW}>{kw.kw}</div>
                  <div className={styles.scheduleDays}>
                    {kw.days.map(day => (
                      <span key={day} className={styles.scheduleDay}>{day}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

