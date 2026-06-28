import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../LanguageContext";

export default function TimePicker({ value, onChange }) {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const periodRef = useRef(null);

  // Parse 24h format (e.g. "14:30") to 12h format components
  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: "12", minute: "00", period: "PM" };
    const parts = timeStr.split(":");
    if (parts.length < 2) return { hour: "12", minute: "00", period: "PM" };
    let h = parseInt(parts[0], 10);
    const m = parts[1].slice(0, 2).padStart(2, "0");
    const p = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return {
      hour: String(h).padStart(2, "0"),
      minute: m,
      period: p
    };
  };

  const { hour: selectedHour, minute: selectedMinute, period: selectedPeriod } = parseTime(value);

  // Convert 12h components back to 24h string (e.g. "14:30")
  const formatTo24h = (h, m, p) => {
    let hourNum = parseInt(h, 10);
    if (p === "PM" && hourNum < 12) hourNum += 12;
    if (p === "AM" && hourNum === 12) hourNum = 0;
    return `${String(hourNum).padStart(2, "0")}:${m}`;
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active items into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hoursRef.current) {
          const selected = hoursRef.current.querySelector(".active-item");
          if (selected) selected.scrollIntoView({ block: "center", behavior: "auto" });
        }
        if (minutesRef.current) {
          const selected = minutesRef.current.querySelector(".active-item");
          if (selected) selected.scrollIntoView({ block: "center", behavior: "auto" });
        }
        if (periodRef.current) {
          const selected = periodRef.current.querySelector(".active-item");
          if (selected) selected.scrollIntoView({ block: "center", behavior: "auto" });
        }
      }, 50);
    }
  }, [isOpen]);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const periods = ["AM", "PM"];

  const handleHourSelect = (h) => {
    onChange(formatTo24h(h, selectedMinute, selectedPeriod));
  };

  const handleMinuteSelect = (m) => {
    onChange(formatTo24h(selectedHour, m, selectedPeriod));
  };

  const handlePeriodSelect = (p) => {
    onChange(formatTo24h(selectedHour, selectedMinute, p));
  };

  // Display value in 12h format (Arabic: "12:30 م", English: "12:30 PM")
  const displayTime = () => {
    if (!value) return t("اختر الوقت...");
    const periodTranslation = selectedPeriod === "PM" ? (lang === "ar" ? "م" : "PM") : (lang === "ar" ? "ص" : "AM");
    return `${selectedHour}:${selectedMinute} ${periodTranslation}`;
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <style>{`
        .time-picker-column::-webkit-scrollbar {
          width: 4px;
        }
        .time-picker-column::-webkit-scrollbar-track {
          background: transparent;
        }
        .time-picker-column::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .time-picker-column::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="glass-input"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          width: "100%",
          padding: "12px 16px",
          userSelect: "none"
        }}
      >
        <span>{displayTime()}</span>
        <span style={{ fontSize: 18, opacity: 0.7 }}>⏰</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: lang === "ar" ? "auto" : 0,
            right: lang === "ar" ? 0 : "auto",
            marginTop: 8,
            width: "280px",
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            zIndex: 9999,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            {/* Hours Column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: "700", color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                {t("الساعة")}
              </div>
              <div
                ref={hoursRef}
                className="time-picker-column"
                style={{
                  width: "100%",
                  height: "150px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                }}
              >
                {hours.map((h) => {
                  const isActive = h === selectedHour;
                  return (
                    <div
                      key={h}
                      onClick={() => handleHourSelect(h)}
                      className={isActive ? "active-item" : ""}
                      style={{
                        padding: "6px 0",
                        textAlign: "center",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: isActive ? "700" : "400",
                        color: isActive ? "#fff" : "var(--text-muted)",
                        background: isActive ? "var(--primary, #185fa5)" : "transparent",
                        boxShadow: isActive ? "0 4px 12px rgba(24, 95, 165, 0.3)" : "none",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "var(--panel-bg)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {h}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: "700", color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                {t("الدقيقة")}
              </div>
              <div
                ref={minutesRef}
                className="time-picker-column"
                style={{
                  width: "100%",
                  height: "150px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                }}
              >
                {minutes.map((m) => {
                  const isActive = m === selectedMinute;
                  return (
                    <div
                      key={m}
                      onClick={() => handleMinuteSelect(m)}
                      className={isActive ? "active-item" : ""}
                      style={{
                        padding: "6px 0",
                        textAlign: "center",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: isActive ? "700" : "400",
                        color: isActive ? "#fff" : "var(--text-muted)",
                        background: isActive ? "var(--primary, #185fa5)" : "transparent",
                        boxShadow: isActive ? "0 4px 12px rgba(24, 95, 165, 0.3)" : "none",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "var(--panel-bg)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {m}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Period Column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: "700", color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                {t("الفترة")}
              </div>
              <div
                ref={periodRef}
                className="time-picker-column"
                style={{
                  width: "100%",
                  height: "150px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                }}
              >
                {periods.map((p) => {
                  const isActive = p === selectedPeriod;
                  const displayPeriod = p === "PM" ? (lang === "ar" ? "مساءً" : "PM") : (lang === "ar" ? "صباحاً" : "AM");
                  return (
                    <div
                      key={p}
                      onClick={() => handlePeriodSelect(p)}
                      className={isActive ? "active-item" : ""}
                      style={{
                        padding: "8px 0",
                        textAlign: "center",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: isActive ? "700" : "400",
                        color: isActive ? "#fff" : "var(--text-muted)",
                        background: isActive ? "var(--primary, #185fa5)" : "transparent",
                        boxShadow: isActive ? "0 4px 12px rgba(24, 95, 165, 0.3)" : "none",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "var(--panel-bg)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {displayPeriod}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: "100%",
              padding: "8px 0",
              borderRadius: "10px",
              border: "1px solid var(--glass-border)",
              background: "var(--panel-bg)",
              color: "var(--text-main)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: "600",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--panel-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--panel-bg)";
            }}
          >
            {t("موافق")}
          </button>
        </div>
      )}
    </div>
  );
}
