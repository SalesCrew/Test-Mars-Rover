import React, { useState, useEffect } from 'react';
import { House, MapPin, Users, CalendarCheck, ClipboardText, Package } from '@phosphor-icons/react';
import { AdminDashboard } from './AdminDashboard';
import { MarketsPage } from './MarketsPage';
import styles from './AdminPanel.module.css';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminPage = 'dashboard' | 'markets' | 'gebietsleiter' | 'vorbesteller' | 'fragebogen' | 'produkte';

interface MenuItem {
  id: AdminPage;
  label: string;
  icon: React.ReactNode;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [selectedPage, setSelectedPage] = useState<AdminPage>('dashboard');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <House size={20} weight="regular" /> },
    { id: 'markets', label: 'Märkte', icon: <MapPin size={20} weight="regular" /> },
    { id: 'gebietsleiter', label: 'Gebietsleiter', icon: <Users size={20} weight="regular" /> },
    { id: 'vorbesteller', label: 'Vorbesteller', icon: <CalendarCheck size={20} weight="regular" /> },
    { id: 'fragebogen', label: 'Fragebogen', icon: <ClipboardText size={20} weight="regular" /> },
    { id: 'produkte', label: 'Produkte', icon: <Package size={20} weight="regular" /> },
  ];

  const handleMenuClick = (pageId: AdminPage) => {
    if (selectedPage === pageId) {
      setIsExpanded(!isExpanded);
    } else {
      setSelectedPage(pageId);
      setIsExpanded(false);
    }
  };

  return (
    <div className={styles.adminPanel}>
      <aside className={`${styles.sidebar} ${isExpanded ? styles.sidebarExpanded : ''}`}>
        <div className={styles.logoContainer}>
          <span className={styles.logoText}>
            {isExpanded ? 'Mars Rover Admin' : 'MR'}
          </span>
        </div>
        
        <nav className={styles.menu}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${selectedPage === item.id ? styles.menuItemActive : ''}`}
              onClick={() => handleMenuClick(item.id)}
              title={item.label}
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              <span className={styles.menuLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>
            {menuItems.find(item => item.id === selectedPage)?.label}
          </h1>
        </header>
        
        <div className={styles.pageContent}>
          {selectedPage === 'dashboard' && <AdminDashboard />}
          {selectedPage === 'markets' && <MarketsPage />}
          {/* Other page content will go here */}
        </div>
      </main>
    </div>
  );
};

