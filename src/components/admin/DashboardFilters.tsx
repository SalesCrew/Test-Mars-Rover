import React, { useState, useEffect, useRef } from 'react';
import { Users, Package, CaretDown } from '@phosphor-icons/react';
import { CustomDatePicker } from './CustomDatePicker';
import styles from './DashboardFilters.module.css';

interface DashboardFiltersProps {
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  onGLFilterChange?: (glIds: string[]) => void;
  onTypeFilterChange?: (type: 'all' | 'displays' | 'kartonware') => void;
  availableGLs?: Array<{ id: string; name: string }>;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  onDateRangeChange,
  onGLFilterChange,
  onTypeFilterChange,
  availableGLs = [],
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGLs, setSelectedGLs] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'displays' | 'kartonware'>('all');
  const [isGLDropdownOpen, setIsGLDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  
  const glDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const [glDropdownAlignRight, setGlDropdownAlignRight] = useState(false);
  const [typeDropdownAlignRight, setTypeDropdownAlignRight] = useState(false);

  // Click outside handler for GL dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (glDropdownRef.current && !glDropdownRef.current.contains(event.target as Node)) {
        setIsGLDropdownOpen(false);
      }
    };

    if (isGLDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isGLDropdownOpen]);

  // Click outside handler for Type dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };

    if (isTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTypeDropdownOpen]);

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (onDateRangeChange) {
      onDateRangeChange(date, endDate);
    }
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    if (onDateRangeChange) {
      onDateRangeChange(startDate, date);
    }
  };

  const checkDropdownPosition = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const dropdownWidth = 180; // min-width from CSS
      const spaceOnRight = window.innerWidth - rect.right;
      return spaceOnRight < dropdownWidth;
    }
    return false;
  };

  const handleGLDropdownToggle = () => {
    if (!isGLDropdownOpen) {
      setGlDropdownAlignRight(checkDropdownPosition(glDropdownRef));
    }
    setIsGLDropdownOpen(!isGLDropdownOpen);
  };

  const handleTypeDropdownToggle = () => {
    if (!isTypeDropdownOpen) {
      setTypeDropdownAlignRight(checkDropdownPosition(typeDropdownRef));
    }
    setIsTypeDropdownOpen(!isTypeDropdownOpen);
  };

  const handleGLToggle = (glId: string) => {
    const newSelection = selectedGLs.includes(glId)
      ? selectedGLs.filter(id => id !== glId)
      : [...selectedGLs, glId];
    setSelectedGLs(newSelection);
    if (onGLFilterChange) {
      onGLFilterChange(newSelection);
    }
  };

  const handleTypeChange = (type: 'all' | 'displays' | 'kartonware') => {
    setSelectedType(type);
    setIsTypeDropdownOpen(false);
    if (onTypeFilterChange) {
      onTypeFilterChange(type);
    }
  };

  const getTypeLabel = () => {
    if (selectedType === 'displays') return 'Displays';
    if (selectedType === 'kartonware') return 'Kartonware';
    return 'Alle Typen';
  };

  return (
    <div className={styles.filtersContainer}>
      {/* Date Range Filter */}
      {onDateRangeChange && (
        <div className={styles.filterGroup}>
          <CustomDatePicker
            value={startDate}
            onChange={handleStartDateChange}
            placeholder="Startdatum"
          />
          <span className={styles.dateSeparator}>–</span>
          <CustomDatePicker
            value={endDate}
            onChange={handleEndDateChange}
            placeholder="Enddatum"
          />
        </div>
      )}

      {/* GL Filter */}
      {availableGLs.length > 0 && (
        <div className={styles.filterGroup}>
          <div className={styles.dropdown} ref={glDropdownRef}>
            <button
              className={styles.dropdownButton}
              onClick={handleGLDropdownToggle}
            >
              <Users size={14} weight="regular" />
              <span>{selectedGLs.length > 0 ? `${selectedGLs.length} GLs` : 'Alle GLs'}</span>
              <CaretDown size={12} weight="bold" />
            </button>
            {isGLDropdownOpen && (
              <div className={`${styles.dropdownMenu} ${glDropdownAlignRight ? styles.dropdownMenuRight : ''}`}>
                {availableGLs.map((gl) => (
                  <label key={gl.id} className={styles.dropdownItem}>
                    <input
                      type="checkbox"
                      checked={selectedGLs.includes(gl.id)}
                      onChange={() => handleGLToggle(gl.id)}
                      className={styles.checkbox}
                    />
                    <span>{gl.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Type Filter */}
      <div className={styles.filterGroup}>
        <div className={styles.dropdown} ref={typeDropdownRef}>
          <button
            className={styles.dropdownButton}
            onClick={handleTypeDropdownToggle}
          >
            <Package size={14} weight="regular" />
            <span>{getTypeLabel()}</span>
            <CaretDown size={12} weight="bold" />
          </button>
          {isTypeDropdownOpen && (
            <div className={`${styles.dropdownMenu} ${typeDropdownAlignRight ? styles.dropdownMenuRight : ''}`}>
              <button
                className={`${styles.dropdownItem} ${selectedType === 'all' ? styles.dropdownItemActive : ''}`}
                onClick={() => handleTypeChange('all')}
              >
                Alle Typen
              </button>
              <button
                className={`${styles.dropdownItem} ${selectedType === 'displays' ? styles.dropdownItemActive : ''}`}
                onClick={() => handleTypeChange('displays')}
              >
                Displays
              </button>
              <button
                className={`${styles.dropdownItem} ${selectedType === 'kartonware' ? styles.dropdownItemActive : ''}`}
                onClick={() => handleTypeChange('kartonware')}
              >
                Kartonware
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
