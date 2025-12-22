import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CaretLeft, CaretRight, Calendar } from '@phosphor-icons/react';
import styles from './CustomDatePicker.module.css';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Datum auswählen' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        pickerRef.current && 
        !pickerRef.current.contains(target) &&
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top - 8,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    // Adjust so Monday = 0
    let firstDayOfWeek = firstDay.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6;

    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateSelect = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    onChange(dateString);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const selectedDate = new Date(value + 'T00:00:00');
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <>
      <div className={styles.datePickerWrapper}>
        <div className={styles.inputWrapper} ref={inputWrapperRef} onClick={handleToggle}>
          <input
            type="text"
            readOnly
            value={value ? formatDisplayDate(value) : ''}
            placeholder={placeholder}
            className={styles.input}
          />
          <Calendar size={20} weight="regular" className={styles.calendarIcon} />
        </div>
      </div>

      {isOpen && ReactDOM.createPortal(
        <div 
          ref={pickerRef}
          className={styles.calendarDropdown}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            minWidth: `${dropdownPosition.width}px`,
            transform: 'translateY(-100%)'
          }}
        >
          <div className={styles.calendarHeader}>
            <button 
              type="button"
              className={styles.navButton} 
              onClick={handlePrevMonth}
            >
              <CaretLeft size={18} weight="bold" />
            </button>
            <div className={styles.monthYear}>
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button 
              type="button"
              className={styles.navButton} 
              onClick={handleNextMonth}
            >
              <CaretRight size={18} weight="bold" />
            </button>
          </div>

          <div className={styles.weekDays}>
            {weekDays.map(day => (
              <div key={day} className={styles.weekDay}>
                {day}
              </div>
            ))}
          </div>

          <div className={styles.daysGrid}>
            {days.map((day, index) => (
              <div key={index}>
                {day ? (
                  <button
                    type="button"
                    className={`${styles.dayButton} ${
                      isSelected(day) ? styles.dayButtonSelected : ''
                    } ${isToday(day) ? styles.dayButtonToday : ''}`}
                    onClick={() => handleDateSelect(day)}
                  >
                    {day}
                  </button>
                ) : (
                  <div className={styles.emptyDay} />
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};


