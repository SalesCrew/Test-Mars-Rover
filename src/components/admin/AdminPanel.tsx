import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { House, MapPin, Users, CalendarCheck, ClipboardText, Package, Upload, X } from '@phosphor-icons/react';
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

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen }) => {
  const [selectedPage, setSelectedPage] = useState<AdminPage>('dashboard');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (file: File) => {
    // TODO: Handle file import
    console.log('File selected:', file.name);
    setIsImportModalOpen(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
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
          {selectedPage === 'markets' && (
            <button 
              className={styles.importButton}
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload size={18} weight="bold" />
              <span>Importieren</span>
            </button>
          )}
        </header>
        
        <div className={styles.pageContent}>
          {selectedPage === 'dashboard' && <AdminDashboard />}
          {selectedPage === 'markets' && <MarketsPage />}
          {/* Other page content will go here */}
        </div>
      </main>

      {/* Import Modal */}
      {isImportModalOpen && ReactDOM.createPortal(
        <div className={styles.importModalOverlay} onClick={() => setIsImportModalOpen(false)}>
          <div className={styles.importModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.importModalHeader}>
              <h3 className={styles.importModalTitle}>Märkte importieren</h3>
              <button 
                className={styles.importModalClose}
                onClick={() => setIsImportModalOpen(false)}
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <div 
              className={`${styles.importDropzone} ${isDragging ? styles.importDropzoneDragging : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} weight="regular" className={styles.importIcon} />
              <h4 className={styles.importTitle}>Datei hierher ziehen</h4>
              <p className={styles.importSubtitle}>oder klicken zum Auswählen</p>
              <p className={styles.importFormats}>CSV, Excel (.xlsx, .xls)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

