import React from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './pages/App';
import { AppConfigProvider } from './contexts/AppConfigContext';

async function bootstrap() {
  try {
    const response = await fetch('/api/config');
    let configData = {};
    if (response.ok) {
      const data = await response.json();
      configData = {
        region: data.region || 'ap-southeast-2',
        userPoolId: data.userPoolId || '',
        userPoolClientId: data.userPoolClientId || '',
        maxUploadSizeMb: data.maxUploadSizeMb ?? 512,
        preSignedUrlTtl: data.preSignedUrlTtl ?? 600,
        domainName: data.domainName || 'n11817143-trancevapp.cab432.com',
      };
      Amplify.configure({
        Auth: {
          region: data.region,
          userPoolId: data.userPoolId,
          userPoolWebClientId: data.userPoolClientId,
          mandatorySignIn: true,
        },
      });
    } else {
      throw new Error('Failed to load backend configuration.');
    }
    const root = createRoot(document.getElementById('root'));
    root.render(
      <AppConfigProvider value={configData}>
        <App />
      </AppConfigProvider>
    );
  } catch (error) {
    console.error('Unable to bootstrap Amplify configuration', error);
    const fallbackConfig = {
      region: process.env.REACT_APP_AWS_REGION || 'ap-southeast-2',
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '',
      maxUploadSizeMb: Number(process.env.REACT_APP_MAX_UPLOAD_SIZE_MB) || 512,
      preSignedUrlTtl: Number(process.env.REACT_APP_PRESIGNED_URL_TTL) || 600,
      domainName: process.env.REACT_APP_DOMAIN_NAME || 'n11817143-trancevapp.cab432.com',
    };

    Amplify.configure({
      Auth: {
        region: fallbackConfig.region,
        userPoolId: fallbackConfig.userPoolId,
        userPoolWebClientId: fallbackConfig.userPoolClientId,
        mandatorySignIn: true,
      },
    });
    const root = createRoot(document.getElementById('root'));
    root.render(
      <AppConfigProvider value={fallbackConfig}>
        <App />
      </AppConfigProvider>
    );
  }
}

bootstrap();
