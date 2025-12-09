import React from 'react';
import { Bell } from '@phosphor-icons/react';
import styles from './Header.module.css';

interface HeaderProps {
  firstName: string;
  avatar: string;
  onDevPanelToggle?: () => void;
  onNotificationClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ firstName, avatar, onDevPanelToggle, onNotificationClick }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <button 
          className={styles.appName}
          onClick={onDevPanelToggle}
          aria-label="Toggle Dev Panel"
        >
          Mars Rover
        </button>
        
        <div className={styles.greeting}>
          Guten Tag, {firstName}
        </div>
        
        <div className={styles.headerActions}>
          <button 
            className={styles.notificationButton} 
            aria-label="Benachrichtigungen"
            onClick={onNotificationClick}
          >
            <Bell size={20} weight="regular" />
          </button>
          
          <button className={styles.avatarButton} aria-label="Profil">
            <img src={avatar} alt={firstName} />
          </button>
        </div>
      </div>
    </header>
  );
};

