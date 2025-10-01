import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import NavBar from './components/NavBar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminPage from './pages/Admin.jsx';
import './styles/styles.css';

export const ToastContext = createContext(() => {});

export const useToast = () => React.useContext(ToastContext);

function decodeGroupsFromToken(idToken) {
  if (!idToken) return [];
  try {
    const [, payload] = idToken.split('.');
    const decoded = JSON.parse(window.atob(payload));
    const groups = decoded['cognito:groups'];
    if (Array.isArray(groups)) {
      return groups;
    }
    if (typeof groups === 'string') {
      return [groups];
    }
    return [];
  } catch (error) {
    console.warn('Failed to decode token payload', error);
    return [];
  }
}

function App() {
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const { authStatus, user, signOut } = useAuthenticator((context) => [
    context.authStatus,
    context.user,
    context.signOut
  ]);

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (authStatus !== 'authenticated') {
      setSession(null);
      setLoadingSession(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingSession(true);
    fetchAuthSession()
      .then((current) => {
        if (!cancelled) {
          setSession(current);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch auth session', error);
        if (!cancelled) {
          notify('Unable to load session details.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, notify]);

  const tokens = useMemo(() => {
    if (!session?.tokens) {
      return {};
    }
    return {
      idToken: session.tokens.idToken?.toString(),
      accessToken: session.tokens.accessToken?.toString()
    };
  }, [session]);

  const groups = useMemo(() => decodeGroupsFromToken(tokens.idToken), [tokens.idToken]);

  const userProfile = useMemo(() => {
    if (!user) return null;
    return {
      username: user.username || user?.signInDetails?.loginId || 'user',
      email: user?.signInDetails?.loginId || user?.attributes?.email || null
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      notify('Logged out', 'info');
    } catch (error) {
      console.error('Failed to sign out', error);
      notify('Sign out failed. Try again.', 'error');
    }
  };

  const toastValue = useMemo(() => notify, [notify]);
  const isAdmin = groups.includes('admin-users');

  return (
    <ToastContext.Provider value={toastValue}>
      <BrowserRouter>
        <div className="app">
          <NavBar
            user={userProfile}
            groups={groups}
            authStatus={authStatus}
            onLogout={handleLogout}
          />
          <main className="container">
            {authStatus !== 'authenticated' ? (
              <Login loading={loadingSession} />
            ) : (
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard
                      user={userProfile}
                      token={tokens.idToken}
                      accessToken={tokens.accessToken}
                      groups={groups}
                    />
                  }
                />
                <Route
                  path="/admin"
                  element={isAdmin ? (
                    <AdminPage token={tokens.idToken} />
                  ) : (
                    <Navigate to="/" replace />
                  )}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </main>
          {toast && (
            <div className={`toast toast-${toast.type}`}>
              {toast.message}
            </div>
          )}
        </div>
      </BrowserRouter>
    </ToastContext.Provider>
  );
}

export default App;
