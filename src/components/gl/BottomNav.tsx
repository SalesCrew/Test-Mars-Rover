import React, { useEffect, useState } from 'react';
import type { NavigationTab } from '../../types/gl-types';
import { useResponsive } from '../../hooks/useResponsive';
import styles from './BottomNav.module.css';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ReactNode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { isMobile } = useResponsive();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9L12 3L21 9L21 20L15 20L15 14L9 14L9 20L3 20L3 9Z" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'statistics',
      label: 'Statistiken',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 17L9 11L13 15L21 7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 7L21 7L21 12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'vorbesteller',
      label: 'Vorbesteller',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="3" width="16" height="18" rx="2" strokeLinejoin="round"/>
          <path d="M9 7H15" strokeLinecap="round"/>
          <path d="M9 11H15" strokeLinecap="round"/>
          <path d="M9 15H13" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20C4 16 7.5 13 12 13C16.5 13 20 16 20 20" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const index = navItems.findIndex(item => item.id === activeTab);
    setActiveIndex(index);
  }, [activeTab]);

  return (
    <nav className={`${styles.bottomNav} ${isMobile ? styles.mobile : ''} ${!isVisible ? styles.hidden : ''}`}>
      <div className={styles.pillContainer}>
        <div 
          className={styles.activeIndicator}
          style={{
            transform: `translateX(${activeIndex * (isMobile ? 44 + 4 : 48 + 4)}px)`,
          }}
        />
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`${styles.navButton} ${isActive ? styles.active : ''}`}
              onClick={() => onTabChange(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

