import React, { useState, useEffect } from 'react';
import styles from './PreorderNotification.module.css';

interface PreorderNotificationProps {
  trigger?: number; // Increment this to trigger the notification
}

export const PreorderNotification: React.FC<PreorderNotificationProps> = ({ trigger = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) {
      // Initial auto-show on page load
      const slideInTimer = setTimeout(() => {
        setIsVisible(true);
      }, 500);

      const slideOutTimer = setTimeout(() => {
        setIsVisible(false);
      }, 5500);

      return () => {
        clearTimeout(slideInTimer);
        clearTimeout(slideOutTimer);
      };
    } else {
      // Manual trigger from button click
      setIsVisible(true);
      
      const slideOutTimer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => {
        clearTimeout(slideOutTimer);
      };
    }
  }, [trigger]);

  return (
    <div className={`${styles.notificationCard} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.imageSection}>
        <img 
          src="/src/assets/WhatsApp Bild 2025-12-02 um 10.09.48_d79a87f9.jpg" 
          alt="Preorder" 
          className={styles.image}
        />
      </div>
      
      <div className={styles.contentSection}>
        <div className={styles.header}>
          <h3 className={styles.title}>Vorbesteller!</h3>
        </div>
        
        <div className={styles.infoContainer}>
          <div className={styles.infoPill}>Mo&Di KW45</div>
          <div className={styles.infoPill}>DO&Fr KW46</div>
        </div>
      </div>
    </div>
  );
};

