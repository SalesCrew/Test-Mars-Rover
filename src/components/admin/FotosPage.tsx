import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Camera, CircleNotch, CaretLeft, CaretRight, Trash, X, Image as ImageIcon, DownloadSimple, CheckCircle, CaretDown, MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import { wellenService, type WellePhoto, type Welle } from '../../services/wellenService';
import { CustomDatePicker } from './CustomDatePicker';
import styles from './FotosPage.module.css';

interface GLOption { id: string; name: string; }
type PhotoSourceFilter = 'all' | 'fotowelle' | 'fotofragen';

const getPhotoSource = (photo: WellePhoto): 'fotowelle' | 'fotofragen' => (
  photo.source === 'fotofragen' ? 'fotofragen' : 'fotowelle'
);

const getSourceLabel = (source: 'fotowelle' | 'fotofragen'): string => (
  source === 'fotofragen' ? 'Fotofragen' : 'Fotowelle'
);

const LazyImage: React.FC<{ src: string; className: string }> = memo(({ src, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '300px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {isVisible && <img src={src} alt="" decoding="async" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </div>
  );
});

interface PhotoCardProps {
  photo: WellePhoto;
  onClick: () => void;
  formatDate: (d: string) => string;
}

const PhotoCard = memo<PhotoCardProps>(({ photo, onClick, formatDate }) => {
  const source = getPhotoSource(photo);
  return (
    <div className={styles.photoCard} onClick={onClick}>
      <LazyImage src={photo.photoUrl} className={styles.photoThumb} />
      <div className={styles.photoInfo}>
        <div className={`${styles.sourceBadge} ${source === 'fotofragen' ? styles.sourceBadgeFotofragen : styles.sourceBadgeFotowelle}`}>
          {getSourceLabel(source)}
        </div>
        <p className={styles.photoGl}>{photo.glName}</p>
        <p className={styles.photoMarket}>{photo.marketName} {photo.marketChain && `(${photo.marketChain})`}</p>
        <span className={styles.photoDate}>{formatDate(photo.createdAt)}</span>
        <div className={styles.photoTags}>
          {photo.tags?.slice(0, 3).map(t => <span key={t} className={styles.photoTag}>{t}</span>)}
          {(photo.tags?.length || 0) > 3 && <span className={styles.photoTagMore}>+{photo.tags!.length - 3}</span>}
        </div>
      </div>
    </div>
  );
});

export const FotosPage: React.FC = () => {
  const [photos, setPhotos] = useState<WellePhoto[]>([]);
  const [waves, setWaves] = useState<Welle[]>([]);
  const [gls, setGls] = useState<GLOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterSource, setFilterSource] = useState<PhotoSourceFilter>('all');
  const [filterWelle, setFilterWelle] = useState('');
  const [filterGL, setFilterGL] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Custom dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [marketSearch, setMarketSearch] = useState('');

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Fetch waves for filter dropdown
  useEffect(() => {
    (async () => {
      try {
        const allWaves = await wellenService.getAllWellen();
        setWaves(allWaves.filter(w => w.fotoEnabled));
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      params.source = filterSource;
      if (filterWelle) params.welle_id = filterWelle;
      if (filterGL) params.gl_id = filterGL;
      if (filterMarket) params.market_id = filterMarket;
      if (filterTags.length > 0) params.tags = filterTags.join(',');
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;

      const result = await wellenService.getPhotos(params);
      const strictPhotos = result.photos.filter((photo) =>
        filterSource === 'all' ? true : getPhotoSource(photo) === filterSource
      );
      setPhotos(strictPhotos);
      setTotal(filterSource === 'all' ? result.total : strictPhotos.length);

      // Extract unique GLs for filter
      const glMap = new Map<string, string>();
      strictPhotos.forEach(p => { if (p.glId && p.glName) glMap.set(p.glId, p.glName); });
      setGls(Array.from(glMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      setPhotos([]);
      setTotal(0);
      setGls([]);
    }
    finally { setLoading(false); }
  }, [filterSource, filterWelle, filterGL, filterMarket, filterTags, filterStartDate, filterEndDate]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  useEffect(() => {
    if (filterSource === 'fotofragen' && filterWelle) {
      setFilterWelle('');
    }
  }, [filterSource, filterWelle]);

  // All unique tags from photos
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    photos.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [photos]);

  const toggleTag = (tag: string) => {
    setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const clearFilters = () => {
    setFilterSource('all');
    setFilterWelle(''); setFilterGL(''); setFilterMarket('');
    setFilterTags([]); setFilterStartDate(''); setFilterEndDate('');
  };

  const hasFilters = filterSource !== 'all' || filterWelle || filterGL || filterMarket || filterTags.length > 0 || filterStartDate || filterEndDate;

  // Unique markets from photos for dropdown
  const allMarkets = useMemo(() => {
    const mMap = new Map<string, string>();
    photos.forEach(p => { if (p.marketId && p.marketName) mMap.set(p.marketId, p.marketName); });
    return Array.from(mMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [photos]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.customDropdown}`)) {
        setOpenDropdown(null);
        setMarketSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  // Delete photo
  const handleDelete = async (photo: WellePhoto) => {
    if (getPhotoSource(photo) === 'fotofragen') {
      alert('Fotofragen-Fotos können hier nicht gelöscht werden.');
      return;
    }
    if (!confirm('Foto wirklich löschen?')) return;
    try {
      await wellenService.deletePhoto(photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setTotal(prev => prev - 1);
      setLightboxIndex(null);
    } catch (e) { console.error(e); alert('Fehler beim Löschen'); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [zipName, setZipName] = useState('');
  const [exportSource, setExportSource] = useState<PhotoSourceFilter>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDone, setExportDone] = useState(false);

  const openExportModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setZipName(`Fotos_${today}`);
    setExportSource(filterSource);
    setExportDone(false);
    setExportProgress(0);
    setShowExportModal(true);
  };

  const handleExportZip = async () => {
    if (photos.length === 0 || !zipName.trim()) return;
    setIsExporting(true);
    setExportProgress(15);

    try {
      setExportProgress(45);
      await wellenService.downloadPhotosZip({
        source: exportSource,
        welle_id: exportSource === 'fotofragen' ? undefined : (filterWelle || undefined),
        gl_id: filterGL || undefined,
        market_id: filterMarket || undefined,
        tags: filterTags.length > 0 ? filterTags.join(',') : undefined,
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined
      }, zipName.trim());
      setExportProgress(100);

      setExportDone(true);
      setTimeout(() => {
        setShowExportModal(false);
        setIsExporting(false);
        setExportDone(false);
      }, 1500);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export fehlgeschlagen');
      setIsExporting(false);
    }
  };

  // Listen for export event from AdminPanel header
  useEffect(() => {
    const handleExportEvent = () => {
      openExportModal();
    };
    window.addEventListener('fotos:export', handleExportEvent);
    return () => window.removeEventListener('fotos:export', handleExportEvent);
  }, []);

  const lightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;
  const lightboxSource = lightboxPhoto ? getPhotoSource(lightboxPhoto) : null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><Camera size={20} weight="duotone" /></div>
          <div>
            <h2 className={styles.title}>Fotos</h2>
            <p className={styles.subtitle}>Fotowelle & Fotofragen</p>
          </div>
        </div>
        <span className={styles.photoCount}>{total} Fotos</span>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.sourceToggle}>
          <button
            className={`${styles.sourceToggleBtn} ${filterSource === 'all' ? styles.sourceToggleBtnActive : ''}`}
            onClick={() => setFilterSource('all')}
          >
            Alle
          </button>
          <button
            className={`${styles.sourceToggleBtn} ${filterSource === 'fotowelle' ? styles.sourceToggleBtnActive : ''}`}
            onClick={() => setFilterSource('fotowelle')}
          >
            Fotowelle
          </button>
          <button
            className={`${styles.sourceToggleBtn} ${filterSource === 'fotofragen' ? styles.sourceToggleBtnActive : ''}`}
            onClick={() => setFilterSource('fotofragen')}
          >
            Fotofragen
          </button>
        </div>

        {/* Wave Dropdown */}
        <div className={styles.customDropdown}>
          <button
            className={`${styles.dropdownButton} ${filterWelle ? styles.dropdownActive : ''}`}
            disabled={filterSource === 'fotofragen'}
            onClick={() => setOpenDropdown(openDropdown === 'welle' ? null : 'welle')}
          >
            <Camera size={14} weight="bold" />
            <span>{filterSource === 'fotofragen' ? 'Wellen (nicht aktiv)' : (filterWelle ? waves.find(w => w.id === filterWelle)?.name || 'Welle' : 'Alle Wellen')}</span>
            <CaretDown size={12} weight="bold" className={`${styles.dropdownCaret} ${openDropdown === 'welle' ? styles.caretOpen : ''}`} />
          </button>
          {openDropdown === 'welle' && filterSource !== 'fotofragen' && (
            <div className={styles.dropdownMenu}>
              <button className={`${styles.dropdownItem} ${!filterWelle ? styles.dropdownItemActive : ''}`} onClick={() => { setFilterWelle(''); setOpenDropdown(null); }}>
                Alle Wellen
              </button>
              {waves.map(w => (
                <button key={w.id} className={`${styles.dropdownItem} ${filterWelle === w.id ? styles.dropdownItemActive : ''}`} onClick={() => { setFilterWelle(w.id); setOpenDropdown(null); }}>
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GL Dropdown */}
        <div className={styles.customDropdown}>
          <button
            className={`${styles.dropdownButton} ${filterGL ? styles.dropdownActive : ''}`}
            onClick={() => setOpenDropdown(openDropdown === 'gl' ? null : 'gl')}
          >
            <span>{filterGL ? gls.find(g => g.id === filterGL)?.name || 'GL' : 'Alle GLs'}</span>
            <CaretDown size={12} weight="bold" className={`${styles.dropdownCaret} ${openDropdown === 'gl' ? styles.caretOpen : ''}`} />
          </button>
          {openDropdown === 'gl' && (
            <div className={styles.dropdownMenu}>
              <button className={`${styles.dropdownItem} ${!filterGL ? styles.dropdownItemActive : ''}`} onClick={() => { setFilterGL(''); setOpenDropdown(null); }}>
                Alle GLs
              </button>
              {gls.map(g => (
                <button key={g.id} className={`${styles.dropdownItem} ${filterGL === g.id ? styles.dropdownItemActive : ''}`} onClick={() => { setFilterGL(g.id); setOpenDropdown(null); }}>
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Market Dropdown with Search */}
        <div className={styles.customDropdown}>
          <button
            className={`${styles.dropdownButton} ${filterMarket ? styles.dropdownActive : ''}`}
            onClick={() => setOpenDropdown(openDropdown === 'market' ? null : 'market')}
          >
            <MagnifyingGlass size={14} weight="bold" />
            <span>{filterMarket ? allMarkets.find(m => m.id === filterMarket)?.name || 'Markt' : 'Markt suchen'}</span>
            <CaretDown size={12} weight="bold" className={`${styles.dropdownCaret} ${openDropdown === 'market' ? styles.caretOpen : ''}`} />
          </button>
          {openDropdown === 'market' && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownSearch}>
                <MagnifyingGlass size={14} weight="bold" className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Markt suchen..."
                  value={marketSearch}
                  onChange={e => setMarketSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.dropdownScroll}>
                <button className={`${styles.dropdownItem} ${!filterMarket ? styles.dropdownItemActive : ''}`} onClick={() => { setFilterMarket(''); setMarketSearch(''); setOpenDropdown(null); }}>
                  Alle Märkte
                </button>
                {allMarkets.filter(m => m.name.toLowerCase().includes(marketSearch.toLowerCase())).map(m => (
                  <button key={m.id} className={`${styles.dropdownItem} ${filterMarket === m.id ? styles.dropdownItemActive : ''}`} onClick={() => { setFilterMarket(m.id); setMarketSearch(''); setOpenDropdown(null); }}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.filterDivider} />

        {/* Date From */}
        <div className={styles.datePickerWrap}>
          <CustomDatePicker value={filterStartDate} onChange={setFilterStartDate} placeholder="Von" />
        </div>

        <span className={styles.dateSeparator}>–</span>

        {/* Date To */}
        <div className={styles.datePickerWrap}>
          <CustomDatePicker value={filterEndDate} onChange={setFilterEndDate} placeholder="Bis" />
        </div>

        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters}>
            <Funnel size={13} weight="bold" />
            Zurücksetzen
          </button>
        )}
      </div>

      {/* Tag filter pills (multi-select) */}
      {allTags.length > 0 && (
        <div className={styles.tagFilters} style={{ marginBottom: '16px' }}>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`${styles.tagPill} ${filterTags.includes(tag) ? styles.tagPillActive : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <CircleNotch size={32} weight="bold" className={styles.spinner} />
          <span>Lade Fotos...</span>
        </div>
      ) : photos.length === 0 ? (
        <div className={styles.emptyState}>
          <ImageIcon size={48} weight="regular" />
          <span>Keine Fotos gefunden</span>
        </div>
      ) : (
        <div className={styles.grid}>
          {photos.map((photo, idx) => (
            <PhotoCard key={photo.id} photo={photo} onClick={() => setLightboxIndex(idx)} formatDate={formatDate} />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && lightboxIndex !== null && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxIndex(null)}>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <div className={styles.lightboxImage}>
              <img src={lightboxPhoto.photoUrl} alt="" />
              {lightboxIndex > 0 && (
                <button className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={() => setLightboxIndex(lightboxIndex - 1)}>
                  <CaretLeft size={18} weight="bold" />
                </button>
              )}
              {lightboxIndex < photos.length - 1 && (
                <button className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={() => setLightboxIndex(lightboxIndex + 1)}>
                  <CaretRight size={18} weight="bold" />
                </button>
              )}
            </div>
            <div className={styles.lightboxSidebar}>
              <button className={styles.lightboxClose} onClick={() => setLightboxIndex(null)}>
                <X size={16} weight="bold" />
              </button>
              <div className={styles.lightboxMeta}>
                {lightboxSource && (
                  <div>
                    <p className={styles.lightboxLabel}>Quelle</p>
                    <div className={`${styles.sourceBadge} ${lightboxSource === 'fotofragen' ? styles.sourceBadgeFotofragen : styles.sourceBadgeFotowelle}`}>
                      {getSourceLabel(lightboxSource)}
                    </div>
                  </div>
                )}
                <div>
                  <p className={styles.lightboxLabel}>Gebietsleiter</p>
                  <p className={styles.lightboxValue}>{lightboxPhoto.glName}</p>
                </div>
                <div>
                  <p className={styles.lightboxLabel}>Markt</p>
                  <p className={styles.lightboxValue}>{lightboxPhoto.marketName} {lightboxPhoto.marketChain && `(${lightboxPhoto.marketChain})`}</p>
                  {lightboxPhoto.marketAddress && <p className={styles.lightboxSubvalue}>{lightboxPhoto.marketAddress}</p>}
                </div>
                {lightboxSource === 'fotofragen' ? (
                  <div>
                    <p className={styles.lightboxLabel}>Fragebogen</p>
                    <p className={styles.lightboxValue}>{lightboxPhoto.fragebogenName || '—'}</p>
                  </div>
                ) : (
                  <div>
                    <p className={styles.lightboxLabel}>Welle</p>
                    <p className={styles.lightboxValue}>{lightboxPhoto.welleName || '—'}</p>
                  </div>
                )}
                <div>
                  <p className={styles.lightboxLabel}>Datum</p>
                  <p className={styles.lightboxValue}>{formatDate(lightboxPhoto.createdAt)}</p>
                </div>
                {lightboxPhoto.tags && lightboxPhoto.tags.length > 0 && (
                  <div>
                    <p className={styles.lightboxLabel}>Tags</p>
                    <div className={styles.lightboxTags}>
                      {lightboxPhoto.tags.map(t => <span key={t} className={styles.lightboxTag}>{t}</span>)}
                    </div>
                  </div>
                )}
                {lightboxPhoto.comment && (
                  <div>
                    <p className={styles.lightboxLabel}>Kommentar</p>
                    <p className={styles.lightboxComment}>{lightboxPhoto.comment}</p>
                  </div>
                )}
              </div>
              {lightboxSource !== 'fotofragen' && (
                <button className={styles.lightboxDelete} onClick={() => handleDelete(lightboxPhoto)}>
                  <Trash size={14} weight="regular" style={{ marginRight: '6px' }} />
                  Foto löschen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Export Modal */}
      {showExportModal && (
        <div className={styles.exportOverlay} onClick={() => !isExporting && setShowExportModal(false)}>
          <div className={styles.exportModal} onClick={e => e.stopPropagation()}>
            <div className={styles.exportHeader}>
              <div className={styles.exportIconWrapper}>
                <DownloadSimple size={20} weight="bold" />
              </div>
              <div>
                <h3 className={styles.exportTitle}>Fotos exportieren</h3>
                <p className={styles.exportSubtitle}>{photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'} als ZIP herunterladen</p>
              </div>
              {!isExporting && (
                <button className={styles.exportCloseBtn} onClick={() => setShowExportModal(false)}>
                  <X size={16} weight="bold" />
                </button>
              )}
            </div>

            <div className={styles.exportBody}>
              <label className={styles.exportLabel}>Export-Typ</label>
              <div className={styles.exportSourceWrap}>
                <button
                  className={`${styles.sourceToggleBtn} ${exportSource === 'all' ? styles.sourceToggleBtnActive : ''}`}
                  onClick={() => setExportSource('all')}
                  disabled={isExporting}
                >
                  Beide
                </button>
                <button
                  className={`${styles.sourceToggleBtn} ${exportSource === 'fotowelle' ? styles.sourceToggleBtnActive : ''}`}
                  onClick={() => setExportSource('fotowelle')}
                  disabled={isExporting}
                >
                  Fotowelle
                </button>
                <button
                  className={`${styles.sourceToggleBtn} ${exportSource === 'fotofragen' ? styles.sourceToggleBtnActive : ''}`}
                  onClick={() => setExportSource('fotofragen')}
                  disabled={isExporting}
                >
                  Fotofragen
                </button>
              </div>

              <label className={styles.exportLabel}>ZIP-Ordnername</label>
              <input
                type="text"
                className={styles.exportInput}
                value={zipName}
                onChange={e => setZipName(e.target.value)}
                placeholder="z.B. Fotos_KW7"
                disabled={isExporting}
              />
              <p className={styles.exportHint}>
                Export erfolgt serverseitig als echte Bilddateien inkl. aktueller Filter.
              </p>

              {isExporting && (
                <div className={styles.exportProgressContainer}>
                  <div className={styles.exportProgressBar}>
                    <div className={styles.exportProgressFill} style={{ width: `${exportProgress}%` }} />
                  </div>
                  <span className={styles.exportProgressText}>{exportProgress}%</span>
                </div>
              )}
            </div>

            <div className={styles.exportFooter}>
              <button
                className={styles.exportCancelBtn}
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.exportStartBtn} ${exportDone ? styles.exportStartBtnDone : ''}`}
                onClick={handleExportZip}
                disabled={isExporting || exportDone || !zipName.trim()}
              >
                {isExporting ? (
                  <>
                    <CircleNotch size={16} weight="bold" className={styles.spinner} />
                    <span>Exportiere...</span>
                  </>
                ) : exportDone ? (
                  <>
                    <CheckCircle size={16} weight="fill" />
                    <span>Fertig!</span>
                  </>
                ) : (
                  <>
                    <DownloadSimple size={16} weight="bold" />
                    <span>ZIP herunterladen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FotosPage;
