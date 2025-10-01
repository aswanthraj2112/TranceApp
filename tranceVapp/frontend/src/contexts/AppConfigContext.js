import React, { createContext, useContext, useMemo } from 'react';

const defaultConfig = {
  region: 'ap-southeast-2',
  userPoolId: '',
  userPoolClientId: '',
  maxUploadSizeMb: 512,
  preSignedUrlTtl: 600,
  domainName: 'n11817143-trancevapp.cab432.com',
};

const AppConfigContext = createContext(defaultConfig);

export function AppConfigProvider({ value, children }) {
  const mergedValue = useMemo(() => ({ ...defaultConfig, ...value }), [value]);
  return <AppConfigContext.Provider value={mergedValue}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
