import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Dashboard from './Dashboard';
import { SessionProvider } from '../contexts/SessionContext';

function App() {
  return (
    <Authenticator loginMechanisms={['email']}>
      {({ signOut, user }) => (
        <SessionProvider user={user} signOut={signOut}>
          <Dashboard />
        </SessionProvider>
      )}
    </Authenticator>
  );
}

export default App;
