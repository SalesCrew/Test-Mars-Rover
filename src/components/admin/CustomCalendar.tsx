import React, { useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import styles from './CustomCalendar.module.css';

interface CustomCalendarProps {
  onSelectDate: (date: Date) => void;
  selectedDate?: Date | null;
  minDate?: Date;
  maxDate?: Date;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  onSelectDate,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Adjust so Monday is 0

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date: Date | null) => {
    if (date) {
      onSelectDate(date);
    }
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHeader}>
        <button className={styles.navButton} onClick={handlePreviousMonth}>
          <CaretLeft size={18} weight="bold" />
        </button>
        <span className={styles.monthYear}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button className={styles.navButton} onClick={handleNextMonth}>
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      <div className={styles.dayNames}>
        {dayNames.map((day) => (
          <div key={day} className={styles.dayName}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {days.map((date, index) => (
          <button
            key={index}
            className={`${styles.dayCell} ${date ? '' : styles.dayCellEmpty} ${isSelected(date) ? styles.dayCellSelected : ''} ${isToday(date) ? styles.dayCellToday : ''}`}
            onClick={() => handleDateClick(date)}
            disabled={!date}
          >
            {date ? date.getDate() : ''}
          </button>
        ))}
      </div>
    </div>
  );
};

