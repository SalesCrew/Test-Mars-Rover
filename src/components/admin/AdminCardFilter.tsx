import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CalendarBlank, X, CaretDown, User, Storefront } from '@phosphor-icons/react';
import { CustomCalendar } from './CustomCalendar';
import styles from './AdminCardFilter.module.css';

type TimeFilter = 'welle' | 'all-time' | 'ytd' | 'mtd' | 'custom';

interface AdminCardFilterProps {
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  goalStatus?: React.ReactNode;
  renderDropdownsOnly?: boolean;
  renderTimeFiltersOnly?: boolean;
}

export const AdminCardFilter: React.FC<AdminCardFilterProps> = ({
  timeFilter,
  onTimeFilterChange,
  goalStatus,
  renderDropdownsOnly = false,
  renderTimeFiltersOnly = false,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showGLDropdown, setShowGLDropdown] = useState(false);
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [selectedGL, setSelectedGL] = useState<string>('Alle');
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('Alle');

  const glDropdownRef = useRef<HTMLDivElement>(null);
  const chainDropdownRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const glButtonRef = useRef<HTMLButtonElement>(null);
  const chainButtonRef = useRef<HTMLButtonElement>(null);
  const zeitraumButtonRef = useRef<HTMLButtonElement>(null);

  const [glDropdownPos, setGlDropdownPos] = useState({ top: 0, left: 0 });
  const [chainDropdownPos, setChainDropdownPos] = useState({ top: 0, left: 0 });
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0, width: 0 });

  // Mock GL names
  const glOptions = ['Alle', 'Thomas Weber', 'Anna Schmidt', 'Michael Müller', 'Sarah Wagner'];
  // Mock chain filter options
  const chainFilterOptions = ['Alle', 'Wien', 'Niederösterreich', 'Oberösterreich', 'Steiermark'];

  const glDropdownMenuRef = useRef<HTMLDivElement>(null);
  const chainDropdownMenuRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // GL dropdown - check both button wrapper and menu
      const clickedInGlButton = glDropdownRef.current?.contains(target);
      const clickedInGlMenu = glDropdownMenuRef.current?.contains(target);
      if (!clickedInGlButton && !clickedInGlMenu) {
        setShowGLDropdown(false);
      }
      // Chain dropdown - check both button wrapper and menu
      const clickedInChainButton = chainDropdownRef.current?.contains(target);
      const clickedInChainMenu = chainDropdownMenuRef.current?.contains(target);
      if (!clickedInChainButton && !clickedInChainMenu) {
        setShowChainDropdown(false);
      }
      // Calendar popup
      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const timeOptions = [
    { id: 'welle' as TimeFilter, label: 'Aktuelle Welle' },
    { id: 'mtd' as TimeFilter, label: 'MTD' },
    { id: 'ytd' as TimeFilter, label: 'YTD' },
    { id: 'all-time' as TimeFilter, label: 'Alle Zeit' },
    { id: 'custom' as TimeFilter, label: 'Zeitraum' },
  ];

  const calculateDropdownPos = (buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return { top: rect.bottom + 6, left: rect.left };
    }
    return { top: 0, left: 0 };
  };

  const handleGLDropdownClick = () => {
    if (!showGLDropdown && glButtonRef.current) {
      setGlDropdownPos(calculateDropdownPos(glButtonRef));
    }
    setShowGLDropdown(!showGLDropdown);
  };

  const handleChainDropdownClick = () => {
    if (!showChainDropdown && chainButtonRef.current) {
      setChainDropdownPos(calculateDropdownPos(chainButtonRef));
    }
    setShowChainDropdown(!showChainDropdown);
  };

  const handleCustomClick = () => {
    if (zeitraumButtonRef.current) {
      const rect = zeitraumButtonRef.current.getBoundingClientRect();
      const parentRect = zeitraumButtonRef.current.closest(`.${styles.filterContainer}`)?.getBoundingClientRect();
      setCalendarPos({ 
        top: rect.bottom + 8, 
        left: parentRect?.left || rect.left,
        width: parentRect?.width || 500
      });
    }
    if (timeFilter === 'custom') {
      setShowCalendar(!showCalendar);
    } else {
      onTimeFilterChange('custom');
      setShowCalendar(true);
    }
  };

  return (
    <div className={styles.filterContainer}>
      {/* GL and Market Dropdowns in Header Position */}
      {renderDropdownsOnly && (
        <div className={styles.headerDropdowns}>
          {/* GL Filter Dropdown */}
          <div className={styles.dropdownWrapper} ref={glDropdownRef}>
            <button
              ref={glButtonRef}
              className={styles.filterButton}
              onClick={handleGLDropdownClick}
            >
              <User size={16} weight="regular" />
              <span>{selectedGL}</span>
              <CaretDown size={14} weight="bold" className={showGLDropdown ? styles.caretOpen : ''} />
            </button>
            {showGLDropdown && createPortal(
              <div 
                ref={glDropdownMenuRef}
                className={styles.dropdownFixed}
                style={{ top: glDropdownPos.top, left: glDropdownPos.left }}
              >
                {glOptions.map((gl) => (
                  <button
                    key={gl}
                    className={`${styles.dropdownItem} ${selectedGL === gl ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedGL(gl);
                      setShowGLDropdown(false);
                    }}
                  >
                    {gl}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          {/* Chain Filter Dropdown */}
          <div className={styles.dropdownWrapper} ref={chainDropdownRef}>
            <button
              ref={chainButtonRef}
              className={styles.filterButton}
              onClick={handleChainDropdownClick}
            >
              <Storefront size={16} weight="regular" />
              <span>{selectedChainFilter}</span>
              <CaretDown size={14} weight="bold" className={showChainDropdown ? styles.caretOpen : ''} />
            </button>
            {showChainDropdown && createPortal(
              <div 
                ref={chainDropdownMenuRef}
                className={styles.dropdownFixed}
                style={{ top: chainDropdownPos.top, left: chainDropdownPos.left }}
              >
                {chainFilterOptions.map((option) => (
                  <button
                    key={option}
                    className={`${styles.dropdownItem} ${selectedChainFilter === option ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedChainFilter(option);
                      setShowChainDropdown(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
        </div>
      )}

      {/* Time Filters with Goal Status */}
      {renderTimeFiltersOnly && (
        <div className={styles.timeFilters}>
          {timeOptions.map((option) => (
            <button
              key={option.id}
              className={`${styles.timeOption} ${timeFilter === option.id ? styles.timeOptionActive : ''}`}
              ref={option.id === 'custom' ? zeitraumButtonRef : undefined}
              onClick={() => option.id === 'custom' ? handleCustomClick() : onTimeFilterChange(option.id)}
            >
              {option.id === 'custom' && <CalendarBlank size={14} weight="regular" />}
              {option.label}
            </button>
          ))}

          {/* Goal Status in Filter Row */}
          {goalStatus}
        </div>
      )}

      {showCalendar && timeFilter === 'custom' && createPortal(
        <div 
          className={styles.calendarPopupFixed} 
          ref={calendarRef}
          style={{ top: calendarPos.top, left: calendarPos.left, width: calendarPos.width }}
        >
          <div className={styles.calendarHeader}>
            <span className={styles.calendarTitle}>Zeitraum auswählen</span>
            <button className={styles.closeCalendar} onClick={() => setShowCalendar(false)}>
              <X size={16} weight="bold" />
            </button>
          </div>
          <div className={styles.calendarContent}>
            <div className={styles.dateRangeSelector}>
              <div className={styles.dateSection}>
                <label className={styles.dateLabel}>Von</label>
                <div className={styles.selectedDateDisplay}>
                  {customStartDate ? customStartDate.toLocaleDateString('de-DE') : 'Datum wählen'}
                </div>
                <CustomCalendar 
                  onSelectDate={(date) => setCustomStartDate(date)}
                  selectedDate={customStartDate}
                />
              </div>
              
              <div className={styles.dateDivider} />
              
              <div className={styles.dateSection}>
                <label className={styles.dateLabel}>Bis</label>
                <div className={styles.selectedDateDisplay}>
                  {customEndDate ? customEndDate.toLocaleDateString('de-DE') : 'Datum wählen'}
                </div>
                <CustomCalendar 
                  onSelectDate={(date) => setCustomEndDate(date)}
                  selectedDate={customEndDate}
                />
              </div>
            </div>
            <button className={styles.applyButton}>Anwenden</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

