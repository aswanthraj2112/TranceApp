import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from '../contexts/SessionContext';
import useApi from '../hooks/useApi';
import UploadForm from '../components/UploadForm';
import VideoList from '../components/VideoList';
import { useAppConfig } from '../contexts/AppConfigContext';

function Dashboard() {
  const api = useApi();
  const { user, signOut } = useSession();
  const appConfig = useAppConfig();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePollers, setActivePollers] = useState({});

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/videos');
      setVideos(response.data || []);
    } catch (err) {
      console.error('Failed to fetch videos', err);
      setError('Unable to load videos.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleUploadSuccess = () => {
    fetchVideos();
  };

  const pollStatus = useCallback(
    (videoId) => {
      if (activePollers[videoId]) {
        return;
      }
      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/videos/${videoId}/status`);
          const status = response.data.status;
          if (status === 'COMPLETED') {
            clearInterval(interval);
            setActivePollers((prev) => {
              const updated = { ...prev };
              delete updated[videoId];
              return updated;
            });
            fetchVideos();
          }
        } catch (err) {
          console.error('Polling failed', err);
        }
      }, 5000);

      setActivePollers((prev) => ({ ...prev, [videoId]: interval }));
    },
    [activePollers, api, fetchVideos]
  );

  const handleTranscode = async (videoId) => {
    try {
      await api.post(`/videos/${videoId}/transcode`);
      fetchVideos();
      pollStatus(videoId);
    } catch (err) {
      console.error('Failed to start transcoding', err);
      setError('Unable to start transcoding.');
    }
  };

  useEffect(
    () => () => {
      Object.values(activePollers).forEach((interval) => clearInterval(interval));
    },
    [activePollers]
  );

  const username = user?.username || 'User';

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>TranceVapp Control Center</h1>
          <p>
            Signed in as <strong>{username}</strong> &bull; Region {appConfig.region}
          </p>
          <p className="environment">
            API endpoint: {appConfig.domainName || 'n11817143-trancevapp.cab432.com'}
          </p>
        </div>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </header>
      <main>
        <section>
          <h2>Upload a new video</h2>
          <UploadForm onSuccess={handleUploadSuccess} />
        </section>
        <section>
          <h2>Your videos</h2>
          {loading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          <VideoList videos={videos} onTranscode={handleTranscode} />
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
