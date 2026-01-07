import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CheckCircle, Image as ImageIcon, PencilSimple, Calendar, Clock, TrendUp, Storefront, User, Tag, Package, CaretDown, CaretUp } from '@phosphor-icons/react';
import styles from './VorverkaufAdminPage.module.css';
import { CustomDatePicker } from './CustomDatePicker';
import { WelleMarketSelectorModal } from './WelleMarketSelectorModal';
import { vorverkaufWellenService, type VorverkaufWelle, type VorverkaufSubmission } from '../../services/vorverkaufWellenService';
import { API_BASE_URL } from '../../config/database';

interface VorverkaufAdminPageProps {
  isCreateWelleModalOpen: boolean;
  onCloseCreateWelleModal: () => void;
  onOpenCreateWelleModal: () => void;
}

// Helper function to upload image to storage
const uploadImageToStorage = async (file: File): Promise<string | null> => {
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(`${API_BASE_URL}/wellen/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, folder: 'vorverkauf-wellen' })
    });

    if (!response.ok) {
      console.error('Image upload failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

// Helper function to format date range
const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const formatOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${start.toLocaleDateString('de-DE', formatOptions)} - ${end.toLocaleDateString('de-DE', formatOptions)}`;
};

// Helper function to get status config
const getStatusConfig = (status: 'upcoming' | 'active' | 'past') => {
  switch (status) {
    case 'active':
      return {
        label: 'Aktiv',
        color: '#F97316',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        icon: <TrendUp size={14} weight="bold" />
      };
    case 'upcoming':
      return {
        label: 'Bevorstehend',
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        icon: <Clock size={14} weight="bold" />
      };
    case 'past':
      return {
        label: 'Vergangen',
        color: '#6B7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        icon: <Clock size={14} weight="bold" />
      };
  }
};

export const VorverkaufAdminPage: React.FC<VorverkaufAdminPageProps> = ({
  isCreateWelleModalOpen,
  onCloseCreateWelleModal,
  onOpenCreateWelleModal
}) => {
  // State for waves list
  const [wellenList, setWellenList] = useState<VorverkaufWelle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Submissions state
  const [allSubmissions, setAllSubmissions] = useState<VorverkaufSubmission[]>([]);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  
  // Modal state
  const [editingWelle, setEditingWelle] = useState<VorverkaufWelle | null>(null);
  
  // Wave form fields
  const [waveName, setWaveName] = useState('');
  const [waveImagePreview, setWaveImagePreview] = useState<string | null>(null);
  const [waveImageFile, setWaveImageFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedMarketIds, setAssignedMarketIds] = useState<string[]>([]);
  const [isMarketSelectorOpen, setIsMarketSelectorOpen] = useState(false);
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Load waves from API
  const loadWellen = async () => {
    try {
      setIsLoading(true);
      const wellen = await vorverkaufWellenService.getAllWellen();
      setWellenList(wellen);
      
      // Load submissions for all waves
      const submissionsPromises = wellen.map(w => 
        vorverkaufWellenService.getSubmissions(w.id).catch(() => [])
      );
      const submissionsArrays = await Promise.all(submissionsPromises);
      const allSubs = submissionsArrays.flat().sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAllSubmissions(allSubs);
    } catch (error) {
      console.error('Error loading vorverkauf wellen:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWellen();
  }, []);

  // Format date for submissions
  const formatSubmissionDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Vienna'
    }).format(date);
  };

  // Get wave name by ID
  const getWaveName = (welleId: string) => {
    const wave = wellenList.find(w => w.id === welleId);
    return wave?.name || 'Unbekannte Welle';
  };

  // Reason labels and colors
  const reasonColors: Record<string, { bg: string; text: string }> = {
    'OOS': { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626' },
    'Listungslücke': { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706' },
    'Platzierung': { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563EB' }
  };

  const handleWaveImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWaveImagePreview(URL.createObjectURL(file));
      setWaveImageFile(file);
    }
  };

  const handleCreateWelle = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // Upload image if provided
      let imageUrl: string | null = waveImagePreview;
      if (waveImageFile) {
        const uploadedUrl = await uploadImageToStorage(waveImageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      // Don't save blob URLs
      if (imageUrl && imageUrl.startsWith('blob:')) {
        imageUrl = null;
      }

      const welleData = {
        name: waveName,
        image: imageUrl,
        startDate,
        endDate,
        assignedMarketIds
      };

      if (editingWelle) {
        // Update existing wave
        await vorverkaufWellenService.updateWelle(editingWelle.id, welleData);
      } else {
        // Create new wave
        await vorverkaufWellenService.createWelle(welleData);
      }

      // Reload list
      await loadWellen();
      handleClose();
    } catch (error) {
      console.error('Error saving welle:', error);
      alert('Fehler beim Speichern der Welle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditWelle = (welle: VorverkaufWelle) => {
    setEditingWelle(welle);
    setWaveName(welle.name);
    setStartDate(welle.startDate);
    setEndDate(welle.endDate);
    setWaveImagePreview(welle.image);
    setAssignedMarketIds(welle.assignedMarketIds || []);
    onOpenCreateWelleModal();
  };

  const handleClose = () => {
    setWaveName('');
    setWaveImagePreview(null);
    setWaveImageFile(null);
    setStartDate('');
    setEndDate('');
    setAssignedMarketIds([]);
    setEditingWelle(null);
    onCloseCreateWelleModal();
  };

  const handleMarketConfirm = (marketIds: string[]) => {
    setAssignedMarketIds(marketIds);
    setIsMarketSelectorOpen(false);
  };

  const canCreate = waveName.trim() && startDate && endDate;

  const activeWellen = wellenList.filter(w => w.status === 'active');
  const upcomingWellen = wellenList.filter(w => w.status === 'upcoming');

  if (isLoading) {
    return (
      <div className={styles.vorverkaufPage}>
        <div className={styles.emptyPageState}>
          <div className={styles.spinner} style={{ width: 48, height: 48 }} />
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.vorverkaufPage}>
      {/* Active Wellen */}
      {activeWellen.length > 0 && (
        <div className={styles.wellenSection}>
          <h2 className={styles.sectionTitle}>Aktive Wellen</h2>
          <div className={styles.wellenGrid}>
            {activeWellen.map(welle => {
              const statusConfig = getStatusConfig(welle.status);
              return (
                <div 
                  key={welle.id} 
                  className={`${styles.welleCard} ${styles.welleCardActive}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.welleHeader}>
                    <div className={styles.welleStatus} style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color 
                    }}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                    <button 
                      className={styles.welleEditButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditWelle(welle);
                      }}
                    >
                      <PencilSimple size={18} weight="bold" />
                    </button>
                  </div>

                  <div className={`${styles.welleImage} ${welle.image ? styles.hasImage : ''}`}>
                    {welle.image && <img src={welle.image} alt={welle.name} />}
                  </div>

                  <div className={styles.welleContent}>
                    <h3 className={styles.welleName}>{welle.name}</h3>
                    
                    <div className={styles.welleDateRange}>
                      <Calendar size={16} weight="regular" />
                      <span>{formatDateRange(welle.startDate, welle.endDate)}</span>
                    </div>

                    <div className={styles.welleMarketCount}>
                      <Storefront size={16} weight="fill" />
                      <span>{welle.assignedMarketIds.length} {welle.assignedMarketIds.length === 1 ? 'Markt' : 'Märkte'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Wellen */}
      {upcomingWellen.length > 0 && (
        <div className={styles.wellenSection}>
          <h2 className={styles.sectionTitle}>Bevorstehende Wellen</h2>
          <div className={styles.wellenGrid}>
            {upcomingWellen.map(welle => {
              const statusConfig = getStatusConfig(welle.status);
              return (
                <div 
                  key={welle.id} 
                  className={`${styles.welleCard} ${styles.welleCardUpcoming}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.welleHeader}>
                    <div className={styles.welleStatus} style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color 
                    }}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                    <button 
                      className={styles.welleEditButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditWelle(welle);
                      }}
                    >
                      <PencilSimple size={18} weight="bold" />
                    </button>
                  </div>

                  <div className={`${styles.welleImage} ${welle.image ? styles.hasImage : ''}`}>
                    {welle.image && <img src={welle.image} alt={welle.name} />}
                  </div>

                  <div className={styles.welleContent}>
                    <h3 className={styles.welleName}>{welle.name}</h3>
                    
                    <div className={styles.welleDateRange}>
                      <Calendar size={16} weight="regular" />
                      <span>{formatDateRange(welle.startDate, welle.endDate)}</span>
                    </div>

                    <div className={styles.welleMarketCount}>
                      <Storefront size={16} weight="fill" />
                      <span>{welle.assignedMarketIds.length} {welle.assignedMarketIds.length === 1 ? 'Markt' : 'Märkte'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {wellenList.length === 0 && (
        <div className={styles.emptyPageState}>
          <TrendUp size={64} weight="regular" />
          <h3>Keine Vorverkauf-Wellen vorhanden</h3>
          <p>Erstelle deine erste Vorverkauf-Welle, um Vorverkäufe zu planen und zu verwalten.</p>
        </div>
      )}

      {/* GL Progress / Submissions Section */}
      {allSubmissions.length > 0 && (
        <div className={styles.submissionsSection}>
          <h2 className={styles.sectionTitle}>GL Fortschritt</h2>
          
          {/* Quick Stats */}
          <div className={styles.submissionStats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{allSubmissions.length}</span>
              <span className={styles.statLabel}>Einträge</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {new Set(allSubmissions.map(s => s.gebietsleiter?.id)).size}
              </span>
              <span className={styles.statLabel}>GLs aktiv</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {new Set(allSubmissions.map(s => s.market?.id)).size}
              </span>
              <span className={styles.statLabel}>Märkte</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {allSubmissions.reduce((sum, s) => sum + s.products.reduce((ps, p) => ps + p.quantity, 0), 0)}
              </span>
              <span className={styles.statLabel}>Produkte</span>
            </div>
          </div>

          {/* Submissions List */}
          <div className={styles.submissionsList}>
            {allSubmissions.slice(0, 20).map(submission => (
              <div 
                key={submission.id} 
                className={`${styles.submissionCard} ${expandedSubmissionId === submission.id ? styles.submissionCardExpanded : ''}`}
                onClick={() => setExpandedSubmissionId(expandedSubmissionId === submission.id ? null : submission.id)}
              >
                <div className={styles.submissionHeader}>
                  <div className={styles.submissionMain}>
                    <div className={styles.submissionGL}>
                      <User size={16} weight="bold" />
                      <span>
                        {submission.gebietsleiter 
                          ? `${submission.gebietsleiter.first_name} ${submission.gebietsleiter.last_name}`
                          : 'Unbekannt'}
                      </span>
                    </div>
                    <div className={styles.submissionMarket}>
                      <Storefront size={16} />
                      <span className={styles.marketChain}>{submission.market?.chain || ''}</span>
                      <span className={styles.marketName}>{submission.market?.name || 'Unbekannt'}</span>
                    </div>
                  </div>
                  
                  <div className={styles.submissionMeta}>
                    <span className={styles.waveBadge}>
                      <TrendUp size={12} weight="bold" />
                      {getWaveName(submission.welleId)}
                    </span>
                    <span className={styles.productCount}>
                      <Package size={14} />
                      {submission.products.reduce((sum, p) => sum + p.quantity, 0)} Artikel
                    </span>
                    <span className={styles.submissionDate}>
                      <Calendar size={14} />
                      {formatSubmissionDate(submission.createdAt)}
                    </span>
                    <span className={styles.expandIcon}>
                      {expandedSubmissionId === submission.id ? <CaretUp size={16} /> : <CaretDown size={16} />}
                    </span>
                  </div>
                </div>

                {/* Expanded Products List */}
                {expandedSubmissionId === submission.id && (
                  <div className={styles.submissionProducts}>
                    <div className={styles.productsHeader}>
                      <span>Produkt</span>
                      <span>Grund</span>
                      <span>Menge</span>
                    </div>
                    {submission.products.map(item => (
                      <div key={item.id} className={styles.productRow}>
                        <div className={styles.productInfo}>
                          <span className={styles.productName}>{item.product?.name || 'Unbekannt'}</span>
                          <span className={styles.productDetails}>
                            {item.product?.department === 'pets' ? 'Tiernahrung' : 'Lebensmittel'} 
                            {item.product?.weight && ` · ${item.product.weight}`}
                          </span>
                        </div>
                        <span 
                          className={styles.reasonBadge}
                          style={{ 
                            backgroundColor: reasonColors[item.reason]?.bg || 'rgba(107, 114, 128, 0.1)',
                            color: reasonColors[item.reason]?.text || '#6B7280'
                          }}
                        >
                          <Tag size={12} weight="bold" />
                          {item.reason}
                        </span>
                        <span className={styles.productQuantity}>{item.quantity}x</span>
                      </div>
                    ))}
                    {submission.notes && (
                      <div className={styles.submissionNotes}>
                        <strong>Notiz:</strong> {submission.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isCreateWelleModalOpen && ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={handleClose}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingWelle ? 'Welle bearbeiten' : 'Neue Vorverkauf-Welle'}
              </h3>
              <button className={styles.modalClose} onClick={handleClose}>
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.modalContent}>
              {/* Wave Name */}
              <div className={styles.formSection}>
                <label className={styles.label}>Wellen-Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="z.B. Sommerkampagne 2024"
                  value={waveName}
                  onChange={(e) => setWaveName(e.target.value)}
                />
              </div>

              {/* Wave Image */}
              <div className={styles.formSection}>
                <label className={styles.label}>Wellen-Bild (optional)</label>
                <div className={styles.imageUploadArea}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWaveImageUpload}
                    className={styles.imageInput}
                    id="vorverkaufWaveImage"
                  />
                  <label htmlFor="vorverkaufWaveImage" className={styles.imageLabel}>
                    {waveImagePreview ? (
                      <img src={waveImagePreview} alt="Wave preview" className={styles.imagePreview} />
                    ) : (
                      <>
                        <ImageIcon size={32} weight="regular" />
                        <span>Bild hochladen</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Date Range */}
              <div className={styles.formRow}>
                <div className={styles.formSection}>
                  <label className={styles.label}>Start-Datum</label>
                  <CustomDatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Start-Datum auswählen"
                  />
                </div>
                <div className={styles.formSection}>
                  <label className={styles.label}>End-Datum</label>
                  <CustomDatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="End-Datum auswählen"
                  />
                </div>
              </div>

              {/* Market Assignment */}
              <div className={styles.formSection}>
                <label className={styles.label}>Märkte zuweisen</label>
                <button
                  type="button"
                  className={styles.marketAssignButton}
                  onClick={() => setIsMarketSelectorOpen(true)}
                >
                  <Storefront size={18} weight="bold" />
                  <span>
                    {assignedMarketIds.length > 0 
                      ? `${assignedMarketIds.length} ${assignedMarketIds.length === 1 ? 'Markt' : 'Märkte'} ausgewählt`
                      : 'Märkte auswählen'}
                  </span>
                </button>
                {assignedMarketIds.length > 0 && (
                  <small className={styles.fieldHint}>
                    {assignedMarketIds.length} {assignedMarketIds.length === 1 ? 'Markt' : 'Märkte'} dieser Welle zugewiesen
                  </small>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={handleClose}>
                Abbrechen
              </button>
              <div className={styles.footerSpacer} />
              <button
                className={`${styles.createButton} ${!canCreate ? styles.createButtonDisabled : ''}`}
                onClick={handleCreateWelle}
                disabled={!canCreate || isSaving}
              >
                {isSaving ? (
                  <>
                    <div className={styles.spinner} />
                    <span>Speichern...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} weight="bold" />
                    <span>{editingWelle ? 'Speichern' : 'Welle erstellen'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Market Selector Modal */}
      <WelleMarketSelectorModal
        isOpen={isMarketSelectorOpen}
        onClose={() => setIsMarketSelectorOpen(false)}
        selectedMarketIds={assignedMarketIds}
        onConfirm={handleMarketConfirm}
      />
    </div>
  );
};
