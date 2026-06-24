import React, { createContext, useContext, useState, useEffect } from "react";

export const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(() => {
    const saved = localStorage.getItem("clinic_active_session");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        localStorage.removeItem("clinic_active_session");
      }
    }
    return null;
  });

  useEffect(() => {
    if (activeSession) {
      localStorage.setItem("clinic_active_session", JSON.stringify(activeSession));
    } else {
      localStorage.removeItem("clinic_active_session");
    }
  }, [activeSession]);

  const startSession = (patientId, patientName, initialData = {}) => {
    setActiveSession({
      patientId,
      patientName,
      step: 0,
      sessionData: {
        treatments: [],
        current: { tooth: "", procedure: "", cost: "", notes: "" },
        meds: [],
        paid: "",
        ...initialData
      }
    });
  };

  const updateSessionData = (updater) => {
    setActiveSession(prev => {
      if (!prev) return null;
      const updatedData = typeof updater === "function" ? updater(prev.sessionData) : updater;
      return {
        ...prev,
        sessionData: {
          ...prev.sessionData,
          ...updatedData
        }
      };
    });
  };

  const updateSessionStep = (step) => {
    setActiveSession(prev => {
      if (!prev) return null;
      return { ...prev, step };
    });
  };

  const clearSession = () => {
    setActiveSession(null);
  };

  return (
    <SessionContext.Provider value={{ activeSession, startSession, updateSessionData, updateSessionStep, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
