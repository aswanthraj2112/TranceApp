import React from 'react';
import { Link } from 'react-router-dom';

function NavBar({ user, onLogout, groups = [], authStatus }) {
  const isAuthenticated = authStatus === 'authenticated';
  const isAdmin = Array.isArray(groups) && groups.includes('admin-users');

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link to="/">Video Web App</Link>
      </div>
      <nav className="navbar-links">
        {isAuthenticated && isAdmin && (
          <Link to="/admin" className="btn-link">
            Admin Dashboard
          </Link>
        )}
      </nav>
      <div className="navbar-actions">
        {isAuthenticated && user ? (
          <>
            <span className="navbar-user">
              Signed in as <strong>{user.username}</strong>
            </span>
            <button type="button" className="btn" onClick={onLogout}>
              Sign out
            </button>
          </>
        ) : (
          <span className="navbar-user">Welcome!</span>
        )}
      </div>
    </header>
  );
}

export default NavBar;
