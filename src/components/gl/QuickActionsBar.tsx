import React from 'react';
import { Storefront, Receipt, CalendarCheck, Calculator, Warning, Clock, ClockCounterClockwise } from '@phosphor-icons/react';
import { useResponsive } from '../../hooks/useResponsive';
import SpotlightCard from './SpotlightCard';
import StarBorder from './StarBorder';
import styles from './QuickActionsBar.module.css';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  onClick: () => void;
  pendingCount?: number;
  onPendingClick?: () => void;
}

interface QuickActionsBarProps {
  openVisitsToday: number;
  pendingProdukttauschCount?: number;
  onStartVisit: () => void;
  onVorverkauf: () => void;
  onVorbestellung: () => void;
  onCalculator: () => void;
  onPendingClick?: () => void;
  onZusatzZeiterfassung?: () => void;
  onZeiterfassungVerlauf?: () => void;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  openVisitsToday,
  pendingProdukttauschCount = 0,
  onStartVisit,
  onVorverkauf,
  onVorbestellung,
  onCalculator,
  onPendingClick,
  onZusatzZeiterfassung,
  onZeiterfassungVerlauf,
}) => {
  const { isMobile } = useResponsive();

  const actions: QuickAction[] = [
    {
      id: 'visit',
      label: 'Markt Besuch starten',
      icon: <Storefront size={32} weight="regular" />,
      badge: openVisitsToday > 0 ? `${openVisitsToday} offen heute` : undefined,
      onClick: onStartVisit,
    },
    {
      id: 'vorverkauf',
      label: 'Vorverkauf erfassen',
      icon: <Receipt size={32} weight="regular" />,
      onClick: onVorverkauf,
    },
    {
      id: 'vorbestellung',
      label: 'Vorbesteller',
      icon: <CalendarCheck size={32} weight="regular" />,
      onClick: onVorbestellung,
    },
    {
      id: 'calculator',
      label: 'Produktrechner',
      icon: <Calculator size={32} weight="regular" />,
      onClick: onCalculator,
      pendingCount: pendingProdukttauschCount,
      onPendingClick: onPendingClick,
    },
    // TEMPORARILY HIDDEN - Zusatz Zeiterfassung & Verlauf
    // {
    //   id: 'zusatz-zeiterfassung',
    //   label: 'Zusatz Zeiterfassung',
    //   icon: <Clock size={32} weight="regular" />,
    //   onClick: onZusatzZeiterfassung || (() => {}),
    // },
    // {
    //   id: 'zeiterfassung-verlauf',
    //   label: 'Zeiterfassung Verlauf',
    //   icon: <ClockCounterClockwise size={32} weight="regular" />,
    //   onClick: onZeiterfassungVerlauf || (() => {}),
    // },
  ];

  return (
    <div className={`${styles.quickActions} ${isMobile ? styles.mobile : ''}`}>
      {actions.map((action) => {
        // Primary action keeps gradient border, others get StarBorder
        if (action.id === 'visit') {
          return (
        <SpotlightCard
          key={action.id}
              className={`${styles.spotlightWrapper} ${styles.primaryAction}`}
              spotlightColor="rgba(59, 130, 246, 0.2)"
        >
          <button
            className={styles.actionButton}
            onClick={action.onClick}
            aria-label={action.label}
          >
            <div className={styles.iconContainer}>
              {action.icon}
            </div>
            <span className={styles.label}>{action.label}</span>
            {action.badge && (
              <span className={styles.badge}>{action.badge}</span>
            )}
          </button>
        </SpotlightCard>
          );
        }

        return (
          <StarBorder
            key={action.id}
            as="div"
            color="#3B82F6"
            speed="5s"
            thickness={2}
            className={styles.starBorderWrapper}
          >
            <SpotlightCard
              className={styles.spotlightInner}
              spotlightColor="rgba(59, 130, 246, 0.2)"
            >
              <div className={styles.actionButtonWrapper}>
                <button
                  className={styles.actionButton}
                  onClick={action.onClick}
                  aria-label={action.label}
                >
                  <div className={styles.iconContainer}>
                    {action.icon}
                  </div>
                  <span className={styles.label}>{action.label}</span>
                </button>
                {action.pendingCount && action.pendingCount > 0 && (
                  <button
                    className={styles.pendingBadge}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onPendingClick?.();
                    }}
                    aria-label="Vorgemerkte Produkttausch anzeigen"
                  >
                    <Warning size={14} weight="bold" />
                  </button>
                )}
              </div>
            </SpotlightCard>
          </StarBorder>
        );
      })}
    </div>
  );
};

