import React, { useEffect, useState } from 'react';
import { videosAPI } from '../api/videos.js';
import { useToast } from '../App.jsx';

function VideoPlayer({ video, token, onClose }) {
  const notify = useToast();
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadUrl = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const { downloadUrl } = await videosAPI.getDownloadUrl(token, video.videoId);
        if (!cancelled) {
          setSourceUrl(downloadUrl);
        }
      } catch (error) {
        if (!cancelled) {
          notify(error.message || 'Unable to load video', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUrl();

    return () => {
      cancelled = true;
    };
  }, [token, video, notify]);

  return (
    <div className="player-backdrop" onClick={onClose}>
      <div className="player" onClick={(event) => event.stopPropagation()}>
        <header className="player-header">
          <h3>{video.originalName}</h3>
          <button type="button" className="btn btn-danger" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="player-body">
          {loading ? (
            <p>Loading video…</p>
          ) : sourceUrl ? (
            <video className="video-player" controls src={sourceUrl} />
          ) : (
            <p>Stream URL unavailable for this video.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
