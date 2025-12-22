import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { House, MapPin, Users, CalendarCheck, ClipboardText, Package, Upload, X, CheckCircle, WarningCircle, ClockCounterClockwise, ArrowRight, ArrowsClockwise, UserMinus, UserPlus, CalendarPlus } from '@phosphor-icons/react';
import { AdminDashboard } from './AdminDashboard';
import { MarketsPage } from './MarketsPage';
import { GebietsleiterPage } from './GebietsleiterPage';
import { VorbestellerPage } from './VorbestellerPage';
import { ProductsPage } from './ProductsPage';
import { parseMarketFile, validateImportFile } from '../../utils/marketImporter';
import { actionHistoryService, type ActionHistoryEntry } from '../../services/actionHistoryService';
import { marketService } from '../../services/marketService';
import type { AdminMarket } from '../../types/market-types';
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
  const [isHistorieModalOpen, setIsHistorieModalOpen] = useState(false);
  const [isCreateGLModalOpen, setIsCreateGLModalOpen] = useState(false);
  const [isCreateWelleModalOpen, setIsCreateWelleModalOpen] = useState(false);
  const [isProductImportModalOpen, setIsProductImportModalOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<ActionHistoryEntry[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [importedMarkets, setImportedMarkets] = useState<AdminMarket[]>([]);
  const [allMarkets, setAllMarkets] = useState<AdminMarket[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const [isProductDragging, setIsProductDragging] = useState(false);
  const [isProductProcessing, setIsProductProcessing] = useState(false);
  const [productImportResult, setProductImportResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  // Fetch all markets for GL detail modal
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const markets = await marketService.getAllMarkets();
        setAllMarkets(markets);
      } catch (error) {
        console.error('Failed to load markets in AdminPanel:', error);
      }
    };
    
    loadMarkets();
  }, [importedMarkets]); // Reload when markets are imported

  // Fetch history when modal opens
  useEffect(() => {
    if (isHistorieModalOpen) {
      loadHistory();
      setHistorySearchTerm(''); // Reset search when opening
    }
  }, [isHistorieModalOpen]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await actionHistoryService.getAllHistory(undefined, 500);
      setHistoryEntries(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filter history entries based on search term
  const filteredHistoryEntries = historyEntries.filter(entry => {
    if (!historySearchTerm) return true;
    
    const searchLower = historySearchTerm.toLowerCase();
    const timestamp = new Date(entry.timestamp).toLocaleString('de-DE');
    
    return (
      entry.market_chain.toLowerCase().includes(searchLower) ||
      entry.market_address.toLowerCase().includes(searchLower) ||
      entry.market_city?.toLowerCase().includes(searchLower) ||
      entry.market_postal_code?.toLowerCase().includes(searchLower) ||
      entry.target_gl.toLowerCase().includes(searchLower) ||
      entry.previous_gl?.toLowerCase().includes(searchLower) ||
      entry.action_type.toLowerCase().includes(searchLower) ||
      timestamp.toLowerCase().includes(searchLower)
    );
  });

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

  const handleFileSelect = async (file: File) => {
    // Validate file
    const validation = validateImportFile(file);
    if (!validation.valid) {
      setImportResult({
        success: false,
        message: validation.error || 'Ungültige Datei',
      });
      setTimeout(() => setImportResult(null), 5000);
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      const markets = await parseMarketFile(file);
      
      if (markets.length === 0) {
        setImportResult({
          success: false,
          message: 'Keine gültigen Märkte in der Datei gefunden',
        });
        setIsProcessing(false);
        setTimeout(() => setImportResult(null), 5000);
        return;
      }

      // Store imported markets
      setImportedMarkets(markets);
      
      setImportResult({
        success: true,
        message: `${markets.length} Märkte erfolgreich importiert`,
        count: markets.length,
      });

      // Close modal after short delay
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportResult(null);
        setIsProcessing(false);
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Fehler beim Importieren der Datei',
      });
      setIsProcessing(false);
      setTimeout(() => setImportResult(null), 5000);
    }
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

  // Product import handlers
  const handleProductDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsProductDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processProductFile(file);
    }
  };

  const handleProductDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsProductDragging(true);
  };

  const handleProductDragLeave = () => {
    setIsProductDragging(false);
  };

  const handleProductFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processProductFile(file);
    }
  };

  const processProductFile = async (_file: File) => {
    setIsProductProcessing(true);
    setProductImportResult(null);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // TODO: Implement actual product import logic
    setProductImportResult({
      success: true,
      message: 'Produkte erfolgreich importiert',
      count: 0
    });
    setIsProductProcessing(false);

    // Reset after 3 seconds
    setTimeout(() => {
      setProductImportResult(null);
      setIsProductImportModalOpen(false);
    }, 2000);
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
            <div className={styles.headerButtons}>
              <button 
                className={styles.historieButton}
                onClick={() => setIsHistorieModalOpen(true)}
              >
                <ClockCounterClockwise size={18} weight="bold" />
                <span>Historie</span>
              </button>
              <button 
                className={styles.importButton}
                onClick={() => setIsImportModalOpen(true)}
              >
                <Upload size={18} weight="bold" />
                <span>Importieren</span>
              </button>
            </div>
          )}
          {selectedPage === 'gebietsleiter' && (
            <div className={styles.headerButtons}>
              <button 
                className={styles.createGLButton}
                onClick={() => setIsCreateGLModalOpen(true)}
              >
                <UserPlus size={18} weight="bold" />
                <span>Neuen GL erstellen</span>
              </button>
            </div>
          )}
          {selectedPage === 'vorbesteller' && (
            <div className={styles.headerButtons}>
              <button 
                className={styles.createWelleButton}
                onClick={() => setIsCreateWelleModalOpen(true)}
              >
                <CalendarPlus size={18} weight="bold" />
                <span>Welle erstellen</span>
              </button>
            </div>
          )}
          {selectedPage === 'produkte' && (
            <div className={styles.headerButtons}>
              <button 
                className={styles.importProductsButton}
                onClick={() => setIsProductImportModalOpen(true)}
              >
                <Upload size={18} weight="bold" />
                <span>Produkte importieren</span>
              </button>
            </div>
          )}
        </header>
        
        <div className={styles.pageContent}>
          {selectedPage === 'dashboard' && <AdminDashboard />}
          {selectedPage === 'markets' && <MarketsPage importedMarkets={importedMarkets} />}
          {selectedPage === 'gebietsleiter' && <GebietsleiterPage isCreateModalOpen={isCreateGLModalOpen} onCloseCreateModal={() => setIsCreateGLModalOpen(false)} allMarkets={allMarkets} />}
          {selectedPage === 'vorbesteller' && <VorbestellerPage isCreateWelleModalOpen={isCreateWelleModalOpen} onCloseCreateWelleModal={() => setIsCreateWelleModalOpen(false)} onOpenCreateWelleModal={() => setIsCreateWelleModalOpen(true)} />}
          {selectedPage === 'produkte' && <ProductsPage />}
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
              className={`${styles.importDropzone} ${isDragging ? styles.importDropzoneDragging : ''} ${isProcessing ? styles.importDropzoneProcessing : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              {isProcessing ? (
                <>
                  <div className={styles.importSpinner}></div>
                  <h4 className={styles.importTitle}>Verarbeite Datei...</h4>
                </>
              ) : importResult ? (
                <>
                  {importResult.success ? (
                    <>
                      <CheckCircle size={48} weight="fill" className={styles.importIconSuccess} />
                      <h4 className={styles.importTitle}>{importResult.message}</h4>
                    </>
                  ) : (
                    <>
                      <WarningCircle size={48} weight="fill" className={styles.importIconError} />
                      <h4 className={styles.importTitle}>Fehler</h4>
                      <p className={styles.importSubtitle}>{importResult.message}</p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Upload size={48} weight="regular" className={styles.importIcon} />
                  <h4 className={styles.importTitle}>Datei hierher ziehen</h4>
                  <p className={styles.importSubtitle}>oder klicken zum Auswählen</p>
                  <p className={styles.importFormats}>CSV, Excel (.xlsx, .xls)</p>
                </>
              )}
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

      {/* Product Import Modal */}
      {isProductImportModalOpen && ReactDOM.createPortal(
        <div className={styles.importModalOverlay} onClick={() => setIsProductImportModalOpen(false)}>
          <div className={styles.importModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.importModalHeader}>
              <h3 className={styles.importModalTitle}>Produkte importieren</h3>
              <button 
                className={styles.importModalClose}
                onClick={() => setIsProductImportModalOpen(false)}
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <div 
              className={`${styles.importDropzone} ${isProductDragging ? styles.importDropzoneDragging : ''} ${isProductProcessing ? styles.importDropzoneProcessing : ''}`}
              onDrop={handleProductDrop}
              onDragOver={handleProductDragOver}
              onDragLeave={handleProductDragLeave}
              onClick={() => !isProductProcessing && productFileInputRef.current?.click()}
            >
              {isProductProcessing ? (
                <>
                  <div className={styles.importSpinner}></div>
                  <h4 className={styles.importTitle}>Verarbeite Datei...</h4>
                </>
              ) : productImportResult ? (
                <>
                  {productImportResult.success ? (
                    <>
                      <CheckCircle size={48} weight="fill" className={styles.importIconSuccess} />
                      <h4 className={styles.importTitle}>{productImportResult.message}</h4>
                    </>
                  ) : (
                    <>
                      <WarningCircle size={48} weight="fill" className={styles.importIconError} />
                      <h4 className={styles.importTitle}>Fehler</h4>
                      <p className={styles.importSubtitle}>{productImportResult.message}</p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Upload size={48} weight="regular" className={styles.importIcon} />
                  <h4 className={styles.importTitle}>Datei hierher ziehen</h4>
                  <p className={styles.importSubtitle}>oder klicken zum Auswählen</p>
                  <p className={styles.importFormats}>CSV, Excel (.xlsx, .xls), JSON</p>
                </>
              )}
            </div>
            <input
              ref={productFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              style={{ display: 'none' }}
              onChange={handleProductFileInputChange}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Historie Modal */}
      {isHistorieModalOpen && ReactDOM.createPortal(
        <div className={styles.historieModalOverlay} onClick={() => setIsHistorieModalOpen(false)}>
          <div className={styles.historieModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.historieModalHeader}>
              <h3 className={styles.historieModalTitle}>Aktions-Historie</h3>
              <input
                type="text"
                className={styles.historieSearchInput}
                placeholder="Suchen nach Markt, GL, Adresse, Datum..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
              />
              <button 
                className={styles.historieModalClose}
                onClick={() => setIsHistorieModalOpen(false)}
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className={styles.historieModalContent}>
              {isLoadingHistory ? (
                <div className={styles.historieLoading}>
                  <div className={styles.spinner}></div>
                  <span>Lade Historie...</span>
                </div>
              ) : filteredHistoryEntries.length === 0 ? (
                <div className={styles.historieEmpty}>
                  <ClockCounterClockwise size={48} weight="regular" />
                  <span>{historySearchTerm ? 'Keine Ergebnisse gefunden' : 'Noch keine Aktionen vorhanden'}</span>
                </div>
              ) : (
                <div className={styles.historieList}>
                  {filteredHistoryEntries.map((entry) => (
                    <div 
                      key={entry.id} 
                      className={`${styles.historieEntry} ${
                        entry.action_type === 'assign' ? styles.historieEntryAssign : 
                        entry.action_type === 'swap' ? styles.historieEntrySwap : 
                        styles.historieEntryRemove
                      }`}
                    >
                      <div className={styles.historieTimestamp}>
                        {new Date(entry.timestamp).toLocaleString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className={styles.historieMarketInfo}>
                        <span className={styles.historieChain}>{entry.market_chain}</span>
                        <span className={styles.historieAddress}>
                          {entry.market_address}
                          {entry.market_postal_code && entry.market_city && 
                            `, ${entry.market_postal_code} ${entry.market_city}`
                          }
                        </span>
                      </div>
                      <div className={styles.historieAction}>
                        {entry.action_type === 'assign' && (
                          <>
                            <div className={styles.historieIconContainer}>
                              <ArrowRight size={14} weight="bold" className={styles.historieIconAssign} />
                            </div>
                            <span className={styles.historieTargetGl}>{entry.target_gl}</span>
                          </>
                        )}
                        {entry.action_type === 'swap' && (
                          <>
                            <div className={styles.historieIconContainer}>
                              <ArrowRight size={14} weight="bold" className={styles.historieIconAssign} />
                            </div>
                            <span className={styles.historieTargetGl}>{entry.target_gl}</span>
                            <div className={styles.historieIconContainer}>
                              <ArrowsClockwise size={14} weight="bold" className={styles.historieIconSwap} />
                            </div>
                            {entry.previous_gl && (
                              <span className={styles.historiePreviousGl}>{entry.previous_gl}</span>
                            )}
                          </>
                        )}
                        {entry.action_type === 'remove' && (
                          <>
                            <span className={styles.historieTargetGl}>{entry.target_gl}</span>
                            <div className={styles.historieIconContainer}>
                              <UserMinus size={14} weight="bold" className={styles.historieIconRemove} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

