import React, { createContext, useContext, useMemo } from 'react';

const SessionContext = createContext({ user: null, signOut: () => {} });

export function SessionProvider({ user, signOut, children }) {
  const value = useMemo(() => ({ user, signOut }), [user, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
