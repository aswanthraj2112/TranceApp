import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import NavBar from './components/NavBar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { authAPI } from './api/auth.js';
import './styles/styles.css';

export const ToastContext = createContext(() => {});

export const useToast = () => React.useContext(ToastContext);

const createGuestUser = () => ({ id: 'guest', username: 'guest' });

function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem('jwt') || '');
  const [user, setUser] = useState(() => (window.localStorage.getItem('jwt') ? null : createGuestUser()));
  const [loadingUser, setLoadingUser] = useState(Boolean(token));
  const [toast, setToast] = useState(null);
  const [cognitoReady, setCognitoReady] = useState(false);

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const initializeCognito = async () => {
      try {
        await authAPI.getConfig();
        setCognitoReady(true);
      } catch (error) {
        console.error('Failed to initialize Cognito:', error);
        setCognitoReady(false);
      }
    };

    setCognitoReady(true);
    initializeCognito();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(createGuestUser());
      setLoadingUser(false);
      return () => {
        cancelled = true;
      };
    }
    setLoadingUser(true);
    authAPI
      .getMe(token)
      .then(({ user: fetched }) => {
        if (!cancelled) {
          setUser(fetched);
        }
      })
      .catch(() => {
        if (!cancelled) {
          notify('Session expired. Please log in again.', 'error');
          setToken('');
          window.localStorage.removeItem('jwt');
          setUser(createGuestUser());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingUser(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, notify]);

  const handleAuthenticated = (jwt, userData) => {
    window.localStorage.setItem('jwt', jwt);
    setToken(jwt);
    setUser(userData);
    notify(`Welcome back, ${userData.username}!`, 'success');
  };

  const handleLogout = () => {
    window.localStorage.removeItem('jwt');
    setToken('');
    setUser(createGuestUser());
    notify('Logged out', 'info');
  };

  const toastValue = useMemo(() => notify, [notify]);
  const isGuest = user?.id === 'guest';

  return (
    <ToastContext.Provider value={toastValue}>
      <div className="app">
        <NavBar user={user} onLogout={handleLogout} />
        <main className="container">
          {!cognitoReady ? (
            <div className="auth-card">
              <h2>Initializing...</h2>
              <p>Setting up authentication service...</p>
            </div>
          ) : user && !isGuest && token ? (
            <Dashboard user={user} />
          ) : user ? (
            <Dashboard user={user} />
          ) : (
            <Login onAuthenticated={handleAuthenticated} loading={loadingUser} />
          )}
        </main>
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export default App;
