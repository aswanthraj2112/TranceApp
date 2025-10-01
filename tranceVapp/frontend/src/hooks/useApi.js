import { useMemo } from 'react';
import axios from 'axios';
import { Auth } from 'aws-amplify';

export default function useApi() {
  return useMemo(() => {
    const instance = axios.create({ baseURL: '/api' });

    instance.interceptors.request.use(async (config) => {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    });

    return instance;
  }, []);
}
