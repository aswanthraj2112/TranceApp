import React, { useState } from 'react';
import { authAPI } from '../api/auth.js';
import { useToast } from '../App.jsx';

function Login({ onAuthenticated, loading }) {
  const notify = useToast();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', email: '', confirmationCode: '' });
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (needsConfirmation) {
      return handleConfirmation();
    }

    if (!form.username || !form.password) {
      notify('Username and password are required', 'error');
      return;
    }

    if (mode === 'register' && !form.email) {
      notify('Email is required for registration', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const username = form.username.trim();
      const password = form.password;
      const email = form.email.trim();

      if (mode === 'register') {
        const result = await authAPI.register(username, password, email);
        if (result.needsConfirmation) {
          setNeedsConfirmation(true);
          setPendingUsername(username);
          setForm(prev => ({ ...prev, username: '', password: '', email: '' }));
          notify('Registration successful! Please check your email for verification code.', 'success');
          return;
        }
        notify('Registration successful. Logging you in…', 'success');
      }

      const { token, user } = await authAPI.login(username, password);
      onAuthenticated(token, user);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmation = async () => {
    if (!form.confirmationCode || !pendingUsername) {
      notify('Verification code is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await authAPI.confirmSignUp(pendingUsername, form.confirmationCode);
      notify('Account verified successfully! You can now log in.', 'success');
      setNeedsConfirmation(false);
      setPendingUsername('');
      setForm({ username: '', password: '', email: '', confirmationCode: '' });
      setMode('login');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingUsername) return;

    setSubmitting(true);
    try {
      await authAPI.resendConfirmationCode(pendingUsername);
      notify('Verification code sent!', 'success');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (needsConfirmation) {
    return (
      <div className="auth-card">
        <h2>Verify Your Account</h2>
        <p>Please enter the verification code sent to your email for user: <strong>{pendingUsername}</strong></p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="confirmationCode">Verification Code</label>
          <input
            id="confirmationCode"
            name="confirmationCode"
            type="text"
            placeholder="Enter 6-digit code"
            value={form.confirmationCode}
            onChange={handleChange}
            disabled={submitting}
            maxLength={6}
          />
          <button type="submit" className="btn" disabled={submitting || !form.confirmationCode}>
            {submitting ? 'Verifying…' : 'Verify Account'}
          </button>
        </form>
        <button
          type="button"
          className="btn-link"
          onClick={handleResendCode}
          disabled={submitting}
        >
          Resend verification code
        </button>
        <button
          type="button"
          className="btn-link"
          onClick={() => {
            setNeedsConfirmation(false);
            setPendingUsername('');
            setForm({ username: '', password: '', email: '', confirmationCode: '' });
          }}
          disabled={submitting}
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h2>{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
      {loading && <p>Validating session…</p>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={form.username}
          onChange={handleChange}
          disabled={submitting || loading}
        />
        {mode === 'register' && (
          <>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              disabled={submitting || loading}
              placeholder="your.email@example.com"
            />
          </>
        )}
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={form.password}
          onChange={handleChange}
          disabled={submitting || loading}
        />
        <button type="submit" className="btn" disabled={submitting || loading}>
          {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>
      </form>
      <button
        type="button"
        className="btn-link"
        onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
        disabled={submitting}
      >
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}

export default Login;
