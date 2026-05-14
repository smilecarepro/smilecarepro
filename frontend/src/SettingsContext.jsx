import { createContext, useContext, useState, useEffect } from "react";
import { getSettings } from "./api";
import { useAuth } from "./AuthContext";

export const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const { user } = useAuth();

  const refreshSettings = () => {
    if (!user) return;
    getSettings().then(setSettings).catch(e => console.error("Settings Error:", e));
  };

  const getDynamicList = (key, defaults = []) => {
    try {
      const lists = JSON.parse(settings.dynamic_lists || "{}");
      return lists[key] || defaults;
    } catch (e) {
      return defaults;
    }
  };

  useEffect(() => {
    if (user) refreshSettings();
    else setSettings({});
  }, [user]);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings, getDynamicList }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
