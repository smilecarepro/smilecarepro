import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../LanguageContext";

export default function DatePicker({ value, onChange, minDate, maxDate, style = {} }) {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Initialize selected date
  const initialDate = value ? new Date(value) : new Date();
  if (isNaN(initialDate.getTime())) {
    initialDate.setTime(Date.now());
  }

  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
      }
    }
  }, [value]);

  const daysOfWeek = [
    { ar: "أحد", en: "Sun" },
    { ar: "إثنين", en: "Mon" },
    { ar: "ثلاثاء", en: "Tue" },
    { ar: "أربعاء", en: "Wed" },
    { ar: "خميس", en: "Thu" },
    { ar: "جمعة", en: "Fri" },
    { ar: "سبت", en: "Sat" },
  ];

  const months = [
    { ar: "يناير", en: "January" },
    { ar: "فبراير", en: "February" },
    { ar: "مارس", en: "March" },
    { ar: "أبريل", en: "April" },
    { ar: "مايو", en: "May" },
    { ar: "يونيو", en: "June" },
    { ar: "يوليو", en: "July" },
    { ar: "أغسطس", en: "August" },
    { ar: "سبتمبر", en: "September" },
    { ar: "أكتوبر", en: "October" },
    { ar: "نوفمبر", en: "November" },
    { ar: "ديسمبر", en: "December" },
  ];

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day) => {
    const d = new Date(currentYear, currentMonth, day);
    
    // Check minDate and maxDate
    if (minDate && d < new Date(minDate)) return;
    if (maxDate && d > new Date(maxDate)) return;

    // Format as YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    onChange(`${y}-${m}-${dd}`);
    setIsOpen(false);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const formatDisplayDate = (val) => {
    if (!val) return t("اختر التاريخ");
    const d = new Date(val);
    if (isNaN(d.getTime())) return t("تاريخ غير صالح");
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });
  };

  return (
    <div style={{ position: "relative", width: "100%", ...style }} ref={containerRef}>
      <div 
        className="glass-input"
        style={{ 
          width: "100%", 
          padding: "12px 16px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none"
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{formatDisplayDate(value)}</span>
        <span style={{ fontSize: 18, opacity: 0.7 }}>📅</span>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          minWidth: "300px"
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <button 
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "none",
                color: "#fff",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
            >
              {lang === 'ar' ? '▶' : '◀'}
            </button>
            
            <div style={{ fontWeight: 800, fontSize: "16px" }}>
              {months[currentMonth][lang]} {currentYear}
            </div>

            <button 
              type="button"
              onClick={handleNextMonth}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "none",
                color: "#fff",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
            >
              {lang === 'ar' ? '◀' : '▶'}
            </button>
          </div>

          {/* Days of week */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(7, 1fr)", 
            gap: "4px", 
            marginBottom: "8px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase"
          }}>
            {daysOfWeek.map((d, i) => <div key={i}>{d[lang]}</div>)}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {blanks.map((_, i) => (
              <div key={`blank-${i}`} style={{ padding: "8px" }} />
            ))}
            
            {days.map(day => {
              const d = new Date(currentYear, currentMonth, day);
              const isToday = new Date().toDateString() === d.toDateString();
              
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const dateStr = `${y}-${m}-${dd}`;
              
              const isSelected = value === dateStr;
              
              let disabled = false;
              if (minDate && d < new Date(minDate)) disabled = true;
              if (maxDate && d > new Date(maxDate)) disabled = true;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={(e) => { e.preventDefault(); handleDateClick(day); }}
                  style={{
                    padding: "8px 0",
                    border: "none",
                    background: isSelected ? "var(--primary)" : isToday ? "rgba(255, 255, 255, 0.1)" : "transparent",
                    color: disabled ? "rgba(255,255,255,0.2)" : isSelected ? "#fff" : "rgba(255,255,255,0.8)",
                    borderRadius: "8px",
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontWeight: isSelected || isToday ? 800 : 500,
                    fontSize: "14px",
                    transition: "all 0.2s",
                    boxShadow: isSelected ? "0 4px 12px rgba(24, 95, 165, 0.4)" : "none",
                  }}
                  onMouseEnter={e => {
                    if (!isSelected && !disabled) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected && !disabled) {
                      e.currentTarget.style.background = isToday ? "rgba(255, 255, 255, 0.1)" : "transparent";
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", gap: "8px" }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const today = new Date();
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                onChange(`${y}-${m}-${dd}`);
                setIsOpen(false);
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              {t("اليوم")}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange("");
                setIsOpen(false);
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                borderRadius: "8px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
            >
              {t("مسح")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
