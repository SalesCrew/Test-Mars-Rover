import React from 'react';
import { Play, Stop } from '@phosphor-icons/react';
import styles from './DayTrackingButton.module.css';

interface DayTrackingButtonProps {
  isActive: boolean; // true = day started (show stop), false = not started (show start)
  onClick: () => void;
  disabled?: boolean;
}

export const DayTrackingButton: React.FC<DayTrackingButtonProps> = ({
  isActive,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className={`${styles.dayTrackingButton} ${isActive ? styles.active : styles.inactive}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={isActive ? 'Tag beenden' : 'Tag starten'}
    >
      {/* Pulse effect */}
      <div className={styles.pulse} />
      <div className={styles.pulse} style={{ animationDelay: '1s' }} />
      
      {/* Icon and label container */}
      <div className={styles.content}>
        {isActive ? (
          <>
            <Stop size={28} weight="fill" className={styles.icon} />
            <span className={styles.label}>STOP</span>
          </>
        ) : (
          <>
            <Play size={28} weight="fill" className={styles.icon} />
            <span className={styles.label}>GO!</span>
          </>
        )}
      </div>
    </button>
  );
};
