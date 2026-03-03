import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Clock, 
  CaretLeft, 
  Check, 
  Storefront, 
  FirstAidKit, 
  Car, 
  House, 
  GraduationCap, 
  Warehouse, 
  Path, 
  Bed,
  Plus,
  Pause,
  Warning,
  Star,
  MagnifyingGlass,
  MapPin
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/database';
import styles from './ZusatzZeiterfassungModal.module.css';

// Time Picker Component
interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, onClose }) => {
  const [hours, setHours] = useState(() => {
    if (value && value.includes(':')) {
      const parsed = parseInt(value.split(':')[0]) || 7;
      return Math.min(21, Math.max(7, parsed));
    }
    return Math.min(21, Math.max(7, new Date().getHours()));
  });
  const [minutes, setMinutes] = useState(() => {
    if (value && value.includes(':')) {
      return parseInt(value.split(':')[1]) || 0;
    }
    return new Date().getMinutes();
  });
  const [activeSlider, setActiveSlider] = useState<'hours' | 'minutes'>('hours');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleConfirm = () => {
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeStr);
    onClose();
  };

  const handleNow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    // Clamp hours to 7-21 range
    setHours(Math.min(21, Math.max(7, currentHour)));
    setMinutes(now.getMinutes());
  };

  return (
    <div ref={pickerRef} className={styles.timePicker} onClick={(e) => e.stopPropagation()}>
      <div className={styles.timePickerDisplay}>
        <button 
          className={`${styles.timePickerDigit} ${activeSlider === 'hours' ? styles.timePickerDigitActive : ''}`}
          onClick={() => setActiveSlider('hours')}
        >
          {hours.toString().padStart(2, '0')}
        </button>
        <span className={styles.timePickerColon}>:</span>
        <button 
          className={`${styles.timePickerDigit} ${activeSlider === 'minutes' ? styles.timePickerDigitActive : ''}`}
          onClick={() => setActiveSlider('minutes')}
        >
          {minutes.toString().padStart(2, '0')}
        </button>
      </div>

      <div className={styles.timePickerSlider}>
        <span className={styles.timePickerSliderLabel}>
          {activeSlider === 'hours' ? 'Stunden' : 'Minuten'}
        </span>
        <input
          type="range"
          min={activeSlider === 'hours' ? 7 : 0}
          max={activeSlider === 'hours' ? 21 : 59}
          value={activeSlider === 'hours' ? hours : minutes}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (activeSlider === 'hours') setHours(val);
            else setMinutes(val);
          }}
          className={styles.timePickerRange}
        />
        <div className={styles.timePickerRangeLabels}>
          <span>{activeSlider === 'hours' ? '7' : '0'}</span>
          <span>{activeSlider === 'hours' ? '14' : '30'}</span>
          <span>{activeSlider === 'hours' ? '21' : '59'}</span>
        </div>
      </div>

      <div className={styles.timePickerActions}>
        <button className={styles.timePickerNow} onClick={handleNow}>
          Jetzt
        </button>
        <button className={styles.timePickerConfirm} onClick={handleConfirm}>
          <Check size={16} weight="bold" />
          OK
        </button>
      </div>
    </div>
  );
};

// Format time input: auto-insert colon, only allow numbers
const formatTimeInput = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 4 digits
  const limited = digits.slice(0, 4);
  
  // Auto-insert colon after 2 digits
  if (limited.length <= 2) {
    return limited;
  } else {
    return `${limited.slice(0, 2)}:${limited.slice(2)}`;
  }
};

interface ZusatzEntry {
  id: string;
  reason: string;
  reasonLabel: string;
  von: string;
  bis: string;
  duration: string;
  kommentar?: string;
  market_id?: string;
  marketName?: string;
}

interface MarketVisitTime {
  besuchszeitVon: string;
  besuchszeitBis: string;
  marketName?: string;
}

interface ZusatzZeiterfassungModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entries: ZusatzEntry[]) => void;
  marketVisits?: MarketVisitTime[]; // For overlap validation
}

const reasons = [
  { id: 'unterbrechung', label: 'Unterbrechung', icon: Pause, isDeduction: true, requiresComment: true, requiresMarket: false },
  { id: 'sonderaufgabe', label: 'Sonderaufgabe', icon: Star, isDeduction: false, requiresComment: false, requiresMarket: true },
  { id: 'marktbesuch', label: 'Marktbesuch', icon: Storefront, isDeduction: false, requiresComment: false, requiresMarket: false },
  { id: 'arztbesuch', label: 'Arztbesuch', icon: FirstAidKit, isDeduction: false, requiresComment: false, requiresMarket: false },
  { id: 'werkstatt', label: 'Werkstatt/Autoreinigung', icon: Car, isDeduction: false, requiresComment: false, requiresMarket: false },
  { id: 'homeoffice', label: 'Homeoffice', icon: House, isDeduction: false, requiresComment: false, requiresMarket: false },
  { id: 'schulung', label: 'Schulung', icon: GraduationCap, isDeduction: false, requiresComment: false, requiresMarket: false },
  { id: 'lager', label: 'Lager', icon: Warehouse, isDeduction: false, requiresComment: false, requiresMarket: false },
  { id: 'heimfahrt', label: 'Heimfahrt', icon: Path, isDeduction: false, requiresComment: false, requiresMarket: false },
  { id: 'hotel', label: 'Hotelübernachtung', icon: Bed, isDeduction: false, requiresComment: false, requiresMarket: false },
];

const calculateDuration = (von: string, bis: string): string => {
  if (!von || !bis || von === '--:--' || bis === '--:--') return '--:--';
  
  const [vonH, vonM] = von.split(':').map(Number);
  const [bisH, bisM] = bis.split(':').map(Number);
  
  if (isNaN(vonH) || isNaN(vonM) || isNaN(bisH) || isNaN(bisM)) return '--:--';
  
  let totalMinutes = (bisH * 60 + bisM) - (vonH * 60 + vonM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Parse time string to minutes for comparison
const parseTimeToMinutes = (time: string): number => {
  if (!time || time === '--:--') return -1;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
};

// Check if a time range overlaps with any market visits
const checkOverlap = (
  von: string, 
  bis: string, 
  marketVisits: MarketVisitTime[]
): { hasOverlap: boolean; overlappingVisit: MarketVisitTime | null } => {
  const newStart = parseTimeToMinutes(von);
  const newEnd = parseTimeToMinutes(bis);
  
  if (newStart < 0 || newEnd < 0) {
    return { hasOverlap: false, overlappingVisit: null };
  }
  
  for (const visit of marketVisits) {
    const visitStart = parseTimeToMinutes(visit.besuchszeitVon);
    const visitEnd = parseTimeToMinutes(visit.besuchszeitBis);
    
    if (visitStart < 0 || visitEnd < 0) continue;
    
    // Check overlap: new range overlaps if newStart < visitEnd AND newEnd > visitStart
    if (newStart < visitEnd && newEnd > visitStart) {
      return { hasOverlap: true, overlappingVisit: visit };
    }
  }
  
  return { hasOverlap: false, overlappingVisit: null };
};

interface MarketItem {
  id: string;
  name: string;
  chain: string;
  address?: string;
  city?: string;
  postalCode?: string;
  gebietsleiter?: string;
}

export const ZusatzZeiterfassungModal: React.FC<ZusatzZeiterfassungModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  marketVisits = [],
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'reason' | 'market' | 'time' | 'added'>('reason');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [entries, setEntries] = useState<ZusatzEntry[]>([]);
  const [von, setVon] = useState('');
  const [bis, setBis] = useState('');
  const [kommentar, setKommentar] = useState('');
  const [activeTimePicker, setActiveTimePicker] = useState<'von' | 'bis' | null>(null);

  // Market selection state (for sonderaufgabe)
  const [markets, setMarkets] = useState<MarketItem[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [marketSearch, setMarketSearch] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedMarketName, setSelectedMarketName] = useState('');

  // Check for overlap with market visits
  const overlapCheck = checkOverlap(von, bis, marketVisits);
  const hasOverlap = overlapCheck.hasOverlap;
  const overlappingVisit = overlapCheck.overlappingVisit;

  // Fetch markets when needed
  useEffect(() => {
    if (step !== 'market' || markets.length > 0) return;
    (async () => {
      setMarketsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/markets`);
        if (res.ok) {
          const data = await res.json();
          setMarkets((data || []).filter((m: any) => m.is_active !== false).map((m: any) => ({
            id: m.id,
            name: m.name,
            chain: m.chain || '',
            address: m.address || '',
            city: m.city || '',
            postalCode: m.postal_code || '',
            gebietsleiter: m.gebietsleiter_id || '',
          })));
        }
      } catch (e) { console.error('Error fetching markets:', e); }
      finally { setMarketsLoading(false); }
    })();
  }, [step, markets.length]);

  // Filter markets
  const filteredMarkets = useMemo(() => {
    const query = marketSearch.toLowerCase().trim();
    const filtered = query
      ? markets.filter(m =>
          m.name.toLowerCase().includes(query) ||
          (m.address || '').toLowerCase().includes(query) ||
          (m.city || '').toLowerCase().includes(query) ||
          (m.postalCode || '').toLowerCase().includes(query)
        )
      : markets;

    const glId = (user as any)?.gebietsleiter_id || '';
    const myMarkets = filtered.filter(m => m.gebietsleiter === glId);
    const otherMarkets = filtered.filter(m => m.gebietsleiter !== glId);
    return { myMarkets, otherMarkets };
  }, [markets, marketSearch, user]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('reason');
      setSelectedReason(null);
      setEntries([]);
      setVon('');
      setBis('');
      setKommentar('');
      setSelectedMarketId(null);
      setSelectedMarketName('');
      setMarketSearch('');
    }
  }, [isOpen]);

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    setVon('');
    setBis('');
    setKommentar('');
    setSelectedMarketId(null);
    setSelectedMarketName('');
    setMarketSearch('');
    const reason = reasons.find(r => r.id === reasonId);
    if (reason?.requiresMarket) {
      setStep('market');
    } else {
      setStep('time');
    }
  };

  const handleAddEntry = () => {
    if (!selectedReason || !von || !bis) return;
    
    const reason = reasons.find(r => r.id === selectedReason);
    if (!reason) return;

    const newEntry: ZusatzEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reason: selectedReason,
      reasonLabel: reason.label,
      von,
      bis,
      duration: calculateDuration(von, bis),
      kommentar: kommentar || undefined,
      market_id: selectedMarketId || undefined,
      marketName: selectedMarketName || undefined,
    };

    setEntries(prev => [...prev, newEntry]);
    setStep('added');
    setSelectedReason(null);
    setVon('');
    setBis('');
    setKommentar('');
    setSelectedMarketId(null);
    setSelectedMarketName('');
    setMarketSearch('');
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleFinish = () => {
    if (entries.length > 0) {
      onSubmit(entries);
    }
    onClose();
  };

  const handleBack = () => {
    if (step === 'time') {
      const reason = reasons.find(r => r.id === selectedReason);
      if (reason?.requiresMarket) {
        setStep('market');
      } else {
        setStep(entries.length > 0 ? 'added' : 'reason');
        setSelectedReason(null);
      }
    } else if (step === 'market') {
      setStep(entries.length > 0 ? 'added' : 'reason');
      setSelectedReason(null);
    }
  };

  const duration = calculateDuration(von, bis);
  const selectedReasonData = reasons.find(r => r.id === selectedReason);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {(step === 'time' || step === 'market') && (
              <button className={styles.backButton} onClick={handleBack}>
                <CaretLeft size={20} weight="bold" />
              </button>
            )}
            <div className={styles.headerIcon}>
              {step === 'added' ? (
                <Check size={24} weight="bold" />
              ) : (
                <Clock size={24} weight="bold" />
              )}
            </div>
            <div className={styles.headerText}>
              <h2 className={styles.title}>
                {step === 'reason' && 'Zusatz Zeiterfassung'}
                {step === 'market' && 'Markt wählen'}
                {step === 'time' && 'Zeiten erfassen'}
                {step === 'added' && 'Zeiteintrag hinzugefügt'}
              </h2>
              <p className={styles.subtitle}>
                {step === 'reason' && 'Wähle einen Grund für den Zeiteintrag'}
                {step === 'market' && 'Sonderaufgabe - Markt auswählen'}
                {step === 'time' && (selectedMarketName ? `${selectedReasonData?.label} - ${selectedMarketName}` : selectedReasonData?.label)}
                {step === 'added' && `${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'} gespeichert`}
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Step 1: Reason Selection */}
          {step === 'reason' && (
            <div className={styles.reasonList}>
              {reasons.map((reason) => {
                const IconComponent = reason.icon;
                const isUnterbrechung = reason.id === 'unterbrechung';
                return (
                  <button
                    key={reason.id}
                    className={`${styles.reasonCard} ${isUnterbrechung ? styles.reasonCardUnterbrechung : ''}`}
                    onClick={() => handleReasonSelect(reason.id)}
                  >
                    <div className={`${styles.reasonIcon} ${isUnterbrechung ? styles.reasonIconUnterbrechung : ''}`}>
                      <IconComponent size={24} weight="regular" />
                    </div>
                    <span className={styles.reasonLabel}>{reason.label}</span>
                    {isUnterbrechung && (
                      <span className={styles.deductionBadge}>
                        <Warning size={12} weight="fill" />
                        Wird abgezogen
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Step: Market Selection (for sonderaufgabe) */}
          {step === 'market' && (
            <div className={styles.marketSelection}>
              <div className={styles.marketSearchWrapper}>
                <MagnifyingGlass size={16} className={styles.marketSearchIcon} />
                <input
                  type="text"
                  className={styles.marketSearchInput}
                  placeholder="Markt suchen..."
                  value={marketSearch}
                  onChange={e => setMarketSearch(e.target.value)}
                />
              </div>
              {marketsLoading ? (
                <div className={styles.marketLoading}>Lade Märkte...</div>
              ) : (
                <div className={styles.marketList}>
                  {filteredMarkets.myMarkets.length > 0 && (
                    <>
                      <div className={styles.marketSectionLabel}>Meine Märkte</div>
                      {filteredMarkets.myMarkets.map(m => (
                        <button
                          key={m.id}
                          className={styles.marketItem}
                          onClick={() => {
                            setSelectedMarketId(m.id);
                            setSelectedMarketName(m.name);
                            setStep('time');
                          }}
                        >
                          <div className={styles.marketItemInfo}>
                            <span className={styles.marketItemName}>{m.name}</span>
                            <span className={styles.marketItemAddress}>
                              <MapPin size={12} weight="regular" />
                              {m.address}, {m.postalCode} {m.city}
                            </span>
                          </div>
                          <span className={styles.marketItemChain}>{m.chain}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredMarkets.otherMarkets.length > 0 && (
                    <>
                      <div className={styles.marketSectionLabel}>Andere Märkte</div>
                      {filteredMarkets.otherMarkets.map(m => (
                        <button
                          key={m.id}
                          className={styles.marketItem}
                          onClick={() => {
                            setSelectedMarketId(m.id);
                            setSelectedMarketName(m.name);
                            setStep('time');
                          }}
                        >
                          <div className={styles.marketItemInfo}>
                            <span className={styles.marketItemName}>{m.name}</span>
                            <span className={styles.marketItemAddress}>
                              <MapPin size={12} weight="regular" />
                              {m.address}, {m.postalCode} {m.city}
                            </span>
                          </div>
                          <span className={styles.marketItemChain}>{m.chain}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredMarkets.myMarkets.length === 0 && filteredMarkets.otherMarkets.length === 0 && (
                    <div className={styles.marketLoading}>Keine Märkte gefunden</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Time Entry */}
          {step === 'time' && (
            <div className={styles.timeEntry}>
              <div className={styles.timeRow}>
                <div className={styles.timeField}>
                  <label className={styles.timeLabel}>VON</label>
                  <div className={styles.timeInputWrapper}>
                    <input
                      type="text"
                      className={styles.timeInput}
                      value={von}
                      onChange={(e) => setVon(formatTimeInput(e.target.value))}
                      placeholder="00:00"
                      maxLength={5}
                    />
                    <button 
                      className={styles.clockButton}
                      onClick={() => setActiveTimePicker(activeTimePicker === 'von' ? null : 'von')}
                      type="button"
                    >
                      <Clock size={16} weight="regular" />
                    </button>
                    {activeTimePicker === 'von' && (
                      <TimePicker
                        value={von}
                        onChange={setVon}
                        onClose={() => setActiveTimePicker(null)}
                      />
                    )}
                  </div>
                </div>
                
                <span className={styles.timeSeparator}>—</span>
                
                <div className={styles.timeField}>
                  <label className={styles.timeLabel}>BIS</label>
                  <div className={styles.timeInputWrapper}>
                    <input
                      type="text"
                      className={styles.timeInput}
                      value={bis}
                      onChange={(e) => setBis(formatTimeInput(e.target.value))}
                      placeholder="00:00"
                      maxLength={5}
                    />
                    <button 
                      className={styles.clockButton}
                      onClick={() => setActiveTimePicker(activeTimePicker === 'bis' ? null : 'bis')}
                      type="button"
                    >
                      <Clock size={16} weight="regular" />
                    </button>
                    {activeTimePicker === 'bis' && (
                      <TimePicker
                        value={bis}
                        onChange={setBis}
                        onClose={() => setActiveTimePicker(null)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.durationDisplay}>
                <span className={styles.durationLabel}>DAUER:</span>
                <span className={styles.durationValue}>{duration}</span>
              </div>

              {/* Overlap Warning */}
              {hasOverlap && overlappingVisit && (
                <div className={styles.overlapWarning}>
                  <Warning size={20} weight="fill" />
                  <div className={styles.overlapWarningContent}>
                    <span className={styles.overlapWarningTitle}>Zeit überschneidet sich mit Marktbesuch</span>
                    <span className={styles.overlapWarningDetail}>
                      {overlappingVisit.marketName || 'Markt'}: {overlappingVisit.besuchszeitVon} - {overlappingVisit.besuchszeitBis}
                    </span>
                  </div>
                </div>
              )}

              <div className={styles.commentField}>
                <div className={styles.commentLabelRow}>
                  <label className={styles.commentLabel}>
                    Kommentar {selectedReasonData?.requiresComment ? '(erforderlich)' : '(optional)'}
                  </label>
                  {selectedReasonData?.requiresComment && !kommentar.trim() && (
                    <span className={styles.commentRequiredHint}>
                      <Warning size={14} weight="fill" />
                      Bitte gib einen Grund an
                    </span>
                  )}
                </div>
                <textarea
                  className={`${styles.commentInput} ${selectedReasonData?.requiresComment && !kommentar.trim() ? styles.commentRequired : ''}`}
                  value={kommentar}
                  onChange={(e) => setKommentar(e.target.value)}
                  placeholder={selectedReasonData?.requiresComment 
                    ? "Bitte beschreibe den Grund für die Unterbrechung..." 
                    : "Zusätzliche Informationen..."}
                  rows={3}
                />
              </div>

              <button 
                className={styles.addButton}
                onClick={handleAddEntry}
                disabled={!von || !bis || duration === '--:--' || hasOverlap || (selectedReasonData?.requiresComment && !kommentar.trim())}
              >
                <Plus size={20} weight="bold" />
                <span>Zeiteintrag hinzufügen</span>
              </button>
            </div>
          )}

          {/* Step 3: Entry Added / Add More */}
          {step === 'added' && (
            <div className={styles.addedStep}>
              {/* Entries List */}
              <div className={styles.entriesList}>
                {entries.map((entry) => {
                  const reasonData = reasons.find(r => r.id === entry.reason);
                  const IconComponent = reasonData?.icon || Clock;
                  return (
                    <div key={entry.id} className={styles.entryCard}>
                      <div className={styles.entryIcon}>
                        <IconComponent size={20} weight="regular" />
                      </div>
                      <div className={styles.entryInfo}>
                        <span className={styles.entryReason}>
                          {entry.reasonLabel}
                          {entry.marketName && <span className={styles.entryMarketName}> - {entry.marketName}</span>}
                        </span>
                        <span className={styles.entryTime}>
                          {entry.von} - {entry.bis} ({entry.duration})
                        </span>
                      </div>
                      <button 
                        className={styles.removeButton}
                        onClick={() => handleRemoveEntry(entry.id)}
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className={styles.divider} />

              {/* Add More Section */}
              <div className={styles.addMoreSection}>
                <p className={styles.addMoreTitle}>Weiteren Eintrag hinzufügen?</p>
                <div className={styles.reasonListCompact}>
                  {reasons.map((reason) => {
                    const IconComponent = reason.icon;
                    return (
                      <button
                        key={reason.id}
                        className={styles.reasonCardCompact}
                        onClick={() => handleReasonSelect(reason.id)}
                      >
                        <IconComponent size={20} weight="regular" />
                        <span>{reason.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Finish Button */}
              <button 
                className={styles.finishButton}
                onClick={handleFinish}
                disabled={entries.length === 0}
              >
                <Check size={20} weight="bold" />
                <span>Fertig {entries.length > 0 && `(${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'})`}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZusatzZeiterfassungModal;
