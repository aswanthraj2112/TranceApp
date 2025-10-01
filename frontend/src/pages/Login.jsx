import React, { useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import {
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
  signIn,
  signUp
} from 'aws-amplify/auth';
import { useToast } from '../App.jsx';

function Login({ loading }) {
  const notify = useToast();
  const { authStatus } = useAuthenticator();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    confirmationCode: '',
    mfaCode: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');
  const [mfaSession, setMfaSession] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const resetForm = () => {
    setForm({ username: '', password: '', email: '', confirmationCode: '', mfaCode: '' });
  };

  const handleRegister = async () => {
    if (!form.username || !form.password || !form.email) {
      notify('Username, password and email are required', 'error');
      return;
    }

    const username = form.username.trim();
    const password = form.password;
    const email = form.email.trim();

    const result = await signUp({
      username,
      password,
      attributes: { email },
      autoSignIn: { enabled: false }
    });

    if (result.isSignUpComplete) {
      notify('Registration successful! Please check your email to verify your account.', 'success');
    }
    setNeedsConfirmation(true);
    setPendingUsername(username);
    resetForm();
  };

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      notify('Username and password are required', 'error');
      return;
    }

    const username = form.username.trim();
    const password = form.password;

    const result = await signIn({ username, password });

    if (result.isSignedIn) {
      notify(`Welcome back, ${username}!`, 'success');
      resetForm();
      return;
    }

    const step = result.nextStep?.signInStep;
    if (step === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
      notify('Enter the MFA code from your authenticator app.', 'info');
      setMfaSession({ username, signInSession: result.signInSession });
      setForm((prev) => ({ ...prev, password: '', mfaCode: '' }));
      return;
    }

    if (step === 'CONFIRM_SIGN_UP') {
      notify('Your account needs verification. Enter the code sent to your email.', 'info');
      setNeedsConfirmation(true);
      setPendingUsername(username);
      setForm((prev) => ({ ...prev, password: '' }));
      return;
    }

    notify('Additional authentication step required.', 'info');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    try {
      if (mfaSession) {
        if (!form.mfaCode) {
          notify('Enter the MFA code to continue', 'error');
          return;
        }
        await confirmSignIn({
          challengeResponse: form.mfaCode,
          signInSession: mfaSession.signInSession
        });
        notify('MFA verified successfully.', 'success');
        setMfaSession(null);
        resetForm();
        return;
      }

      if (needsConfirmation) {
        if (!form.confirmationCode) {
          notify('Verification code is required', 'error');
          return;
        }
        await confirmSignUp({
          username: pendingUsername,
          confirmationCode: form.confirmationCode
        });
        notify('Account verified successfully! You can now sign in.', 'success');
        setNeedsConfirmation(false);
        setPendingUsername('');
        resetForm();
        setMode('login');
        return;
      }

      if (mode === 'register') {
        await handleRegister();
      } else {
        await handleLogin();
      }
    } catch (error) {
      console.error('Authentication error', error);
      notify(error.message || 'Authentication failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingUsername) return;
    setSubmitting(true);
    try {
      await resendSignUpCode({ username: pendingUsername });
      notify('Verification code sent!', 'success');
    } catch (error) {
      notify(error.message || 'Failed to resend code', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (mfaSession) {
    return (
      <div className="auth-card">
        <h2>Multi-factor authentication</h2>
        <p>Enter the 6-digit code from your authenticator app.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="mfaCode">MFA Code</label>
          <input
            id="mfaCode"
            name="mfaCode"
            type="text"
            maxLength={6}
            value={form.mfaCode}
            onChange={handleChange}
            disabled={submitting}
          />
          <button type="submit" className="btn" disabled={submitting || !form.mfaCode}>
            {submitting ? 'Verifying…' : 'Verify code'}
          </button>
        </form>
        <button
          type="button"
          className="btn-link"
          onClick={() => {
            setMfaSession(null);
            resetForm();
          }}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (needsConfirmation) {
    return (
      <div className="auth-card">
        <h2>Verify your account</h2>
        <p>Please enter the verification code sent to <strong>{pendingUsername}</strong>.</p>
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
        <button type="button" className="btn-link" onClick={handleResendCode} disabled={submitting}>
          Resend verification code
        </button>
        <button
          type="button"
          className="btn-link"
          onClick={() => {
            setNeedsConfirmation(false);
            setPendingUsername('');
            resetForm();
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
      {authStatus === 'configuring' || loading ? <p>Validating session…</p> : null}
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
      <p className="hint">
        Tip: After signing up, you can enable an authenticator app for MFA from your account settings.
      </p>
      <button
        type="button"
        className="btn-link"
        onClick={() => {
          setMode((current) => (current === 'login' ? 'register' : 'login'));
          resetForm();
        }}
        disabled={submitting}
      >
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}

export default Login;
