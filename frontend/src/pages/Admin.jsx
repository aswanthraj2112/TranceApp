import React, { useEffect, useState } from 'react';
import { adminAPI } from '../api/admin.js';
import { useToast } from '../App.jsx';

function AdminPage({ token }) {
  const notify = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await adminAPI.listUsers(token);
        if (!cancelled) {
          setUsers(response.users || []);
        }
      } catch (error) {
        if (!cancelled) {
          notify(error.message || 'Unable to load users', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [token, notify, refreshIndex]);

  const handleDelete = async (username) => {
    if (!window.confirm(`Delete user ${username}? This action cannot be undone.`)) {
      return;
    }
    try {
      await adminAPI.deleteUser(token, username);
      notify(`Deleted user ${username}`, 'success');
      setRefreshIndex((current) => current + 1);
    } catch (error) {
      notify(error.message || 'Unable to delete user', 'error');
    }
  };

  return (
    <section className="admin-dashboard">
      <header className="section-header">
        <h1>Admin Dashboard</h1>
        <p>Manage Cognito users and monitor their status.</p>
      </header>
      {loading ? (
        <p>Loading users…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5}>No users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.username}>
                  <td>{user.username}</td>
                  <td>{user.email || '—'}</td>
                  <td>{user.status}</td>
                  <td>{new Date(user.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDelete(user.username)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AdminPage;
