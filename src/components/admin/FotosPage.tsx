import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Camera, CircleNotch, CaretLeft, CaretRight, Trash, X, Image as ImageIcon } from '@phosphor-icons/react';
import { wellenService, type WellePhoto, type Welle } from '../../services/wellenService';
import styles from './FotosPage.module.css';

interface GLOption { id: string; name: string; }

export const FotosPage: React.FC = () => {
  const [photos, setPhotos] = useState<WellePhoto[]>([]);
  const [waves, setWaves] = useState<Welle[]>([]);
  const [gls, setGls] = useState<GLOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterWelle, setFilterWelle] = useState('');
  const [filterGL, setFilterGL] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

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
      if (filterWelle) params.welle_id = filterWelle;
      if (filterGL) params.gl_id = filterGL;
      if (filterMarket) params.market_id = filterMarket;
      if (filterTags.length > 0) params.tags = filterTags.join(',');
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;

      const result = await wellenService.getPhotos(params);
      setPhotos(result.photos);
      setTotal(result.total);

      // Extract unique GLs for filter
      const glMap = new Map<string, string>();
      result.photos.forEach(p => { if (p.glId && p.glName) glMap.set(p.glId, p.glName); });
      setGls(Array.from(glMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterWelle, filterGL, filterMarket, filterTags, filterStartDate, filterEndDate]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

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
    setFilterWelle(''); setFilterGL(''); setFilterMarket('');
    setFilterTags([]); setFilterStartDate(''); setFilterEndDate('');
  };

  const hasFilters = filterWelle || filterGL || filterMarket || filterTags.length > 0 || filterStartDate || filterEndDate;

  // Delete photo
  const handleDelete = async (photoId: string) => {
    if (!confirm('Foto wirklich löschen?')) return;
    try {
      await wellenService.deletePhoto(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setTotal(prev => prev - 1);
      setLightboxIndex(null);
    } catch (e) { console.error(e); alert('Fehler beim Löschen'); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const lightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><Camera size={20} weight="duotone" /></div>
          <div>
            <h2 className={styles.title}>Fotos</h2>
            <p className={styles.subtitle}>Alle Wellen-Fotos</p>
          </div>
        </div>
        <span className={styles.photoCount}>{total} Fotos</span>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select className={styles.filterSelect} value={filterWelle} onChange={e => setFilterWelle(e.target.value)}>
          <option value="">Alle Wellen</option>
          {waves.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className={styles.filterSelect} value={filterGL} onChange={e => setFilterGL(e.target.value)}>
          <option value="">Alle GLs</option>
          {gls.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input
          type="text"
          className={styles.filterInput}
          placeholder="Markt suchen..."
          value={filterMarket}
          onChange={e => setFilterMarket(e.target.value)}
        />
        <input type="date" className={styles.filterDate} value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
        <input type="date" className={styles.filterDate} value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
        {hasFilters && <button className={styles.clearBtn} onClick={clearFilters}>Filter zurücksetzen</button>}
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
            <div key={photo.id} className={styles.photoCard} onClick={() => setLightboxIndex(idx)}>
              <img src={photo.photoUrl} alt="" className={styles.photoThumb} loading="lazy" />
              <div className={styles.photoInfo}>
                <p className={styles.photoGl}>{photo.glName}</p>
                <p className={styles.photoMarket}>{photo.marketName} {photo.marketChain && `(${photo.marketChain})`}</p>
                <span className={styles.photoDate}>{formatDate(photo.createdAt)}</span>
                <div className={styles.photoTags}>
                  {photo.tags?.slice(0, 3).map(t => <span key={t} className={styles.photoTag}>{t}</span>)}
                  {(photo.tags?.length || 0) > 3 && <span className={styles.photoTagMore}>+{photo.tags!.length - 3}</span>}
                </div>
              </div>
            </div>
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
                <div>
                  <p className={styles.lightboxLabel}>Gebietsleiter</p>
                  <p className={styles.lightboxValue}>{lightboxPhoto.glName}</p>
                </div>
                <div>
                  <p className={styles.lightboxLabel}>Markt</p>
                  <p className={styles.lightboxValue}>{lightboxPhoto.marketName} {lightboxPhoto.marketChain && `(${lightboxPhoto.marketChain})`}</p>
                </div>
                <div>
                  <p className={styles.lightboxLabel}>Welle</p>
                  <p className={styles.lightboxValue}>{lightboxPhoto.welleName}</p>
                </div>
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
              </div>
              <button className={styles.lightboxDelete} onClick={() => handleDelete(lightboxPhoto.id)}>
                <Trash size={14} weight="regular" style={{ marginRight: '6px' }} />
                Foto löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FotosPage;
