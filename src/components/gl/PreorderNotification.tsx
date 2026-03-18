import React, { useState, useEffect } from 'react';
import { ShoppingCart, Bell } from '@phosphor-icons/react';
import { API_BASE_URL } from '../../config/database';
import styles from './PreorderNotification.module.css';

interface Welle {
  id: string;
  name: string;
  image: string | null;
  startDate: string;
  endDate: string;
  kwDays?: Array<{ kw: string; days: string[] }>;
}

interface PreorderNotificationProps {
  trigger?: number;
  onOpenVorbesteller?: () => void;
}

const getCurrentDayAbbr = (): string => {
  const days = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
  return days[new Date().getDay()];
};

const getCurrentKWNumber = (): number => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

const extractKWNumber = (kwString: string): number => {
  const match = kwString.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : -1;
};

const isWaveSellableToday = (welle: Welle): boolean => {
  if (!welle.kwDays || welle.kwDays.length === 0) return false;
  const currentDay = getCurrentDayAbbr();
  const currentKWNum = getCurrentKWNumber();
  return welle.kwDays.some(kwDay => {
    const kwNum = extractKWNumber(kwDay.kw);
    return kwNum === currentKWNum && kwDay.days.some(d => d.toUpperCase() === currentDay);
  });
};

export const PreorderNotification: React.FC<PreorderNotificationProps> = ({
  trigger = 0,
  onOpenVorbesteller,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeWaves, setActiveWaves] = useState<Welle[]>([]);

  useEffect(() => {
    const fetchActiveWaves = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/wellen`);
        if (response.ok) {
          const wellen = await response.json();
          const sellableToday = wellen.filter((w: Welle) =>
            w.startDate && w.endDate && isWaveSellableToday(w)
          );
          setActiveWaves(sellableToday);
        }
      } catch (error) {
        console.error('Error fetching waves:', error);
      }
    };
    fetchActiveWaves();
  }, []);

  useEffect(() => {
    if (activeWaves.length === 0) return;

    if (trigger === 0) {
      const slideInTimer = setTimeout(() => setIsVisible(true), 500);
      const slideOutTimer = setTimeout(() => setIsVisible(false), 6000);
      return () => { clearTimeout(slideInTimer); clearTimeout(slideOutTimer); };
    } else {
      setIsVisible(true);
      const slideOutTimer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(slideOutTimer);
    }
  }, [trigger, activeWaves.length]);

  const handleClick = () => {
    onOpenVorbesteller?.();
    setIsVisible(false);
  };

  if (activeWaves.length === 0) return null;

  const count = activeWaves.length;

  return (
    <div
      className={`${styles.notificationCard} ${isVisible ? styles.visible : ''}`}
      onClick={handleClick}
    >
      <div className={styles.topRow}>
        <div className={styles.iconSection}>
          <Bell size={22} weight="fill" />
        </div>

        <div className={styles.contentSection}>
          <p className={styles.label}>Heute gibt es Vorbestellungen</p>
          <p className={styles.count}>{count} {count === 1 ? 'Welle' : 'Wellen'}</p>
        </div>
      </div>

      <button className={styles.orderButton} onClick={handleClick}>
        <ShoppingCart size={15} weight="bold" />
        <span>Jetzt vorbestellen</span>
      </button>
    </div>
  );
};
