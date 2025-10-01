import React, { useMemo } from 'react';
import { videosAPI } from '../api/videos.js';

function VideoPlayer({ video, onClose }) {
  const sourceUrl = useMemo(() => videosAPI.resolveStreamUrl(video), [video]);

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
          {sourceUrl ? (
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
