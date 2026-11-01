import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { SETTINGS_DEFAULTS } from '@surg-d/shared';
import { api } from './api.js';

const SettingsContext = createContext({ settings: SETTINGS_DEFAULTS, reload: () => {} });

// The admin's Setup page settings (feature switches, WhatsApp message). Screens start from the defaults
// and update once the saved settings arrive, so nothing waits on this request.
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);

  const reload = useCallback(
    () =>
      api('/settings')
        .then(setSettings)
        .catch(() => {}),
    []
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
