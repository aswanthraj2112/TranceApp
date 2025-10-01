import React, { useEffect, useState } from 'react';
import { videosAPI } from '../api/videos.js';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

function VideoList({
  videos,
  loading,
  transcodePresets = [],
  onSelect,
  onTranscode,
  onDownload
}) {
  const [selectedPresets, setSelectedPresets] = useState({});

  useEffect(() => {
    setSelectedPresets({});
  }, [videos, transcodePresets]);

  const handlePresetChange = (videoId, preset) => {
    setSelectedPresets((current) => ({ ...current, [videoId]: preset }));
  };

  const resolvePreset = (videoId) =>
    selectedPresets[videoId] || transcodePresets[0] || '720p';

  if (loading) {
    return (
      <section className="video-list">
        <p>Loading videos…</p>
      </section>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <section className="video-list">
        <p>No uploads yet. Drop a file above to get started!</p>
      </section>
    );
  }

  return (
    <section className="video-list">
      <header className="section-header">
        <h2>Your videos</h2>
      </header>
      <ul className="video-grid">
        {videos.map((video) => (
          <li key={video.videoId} className="video-card">
            <div className="thumb-wrapper">
              <img
                src={
                  videosAPI.resolveThumbnailUrl(video) ||
                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iOTAiIGZpbGw9IiNFMEUwRTAiIHJ4PSIxMiIvPjx0ZXh0IHg9IjYwIiB5PSI0OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5Ij5ObyBUaHVtYjwvdGV4dD48L3N2Zz4='
                }
                alt={`${video.originalName} thumbnail`}
              />
            </div>
            <div className="video-info">
              <h3 title={video.originalName}>{video.originalName}</h3>
              <p>
                Status:{' '}
                <span
                  className={`status status-${(video.status || 'unknown')
                    .toLowerCase()
                    .split('-')[0]}`}
                >
                  {video.status || 'UNKNOWN'}
                </span>
              </p>
              <p>Size: {formatBytes(video.sizeBytes)}</p>
              <p>Uploaded: {new Date(video.createdAt).toLocaleString()}</p>
            </div>
            <div className="video-actions">
              <button type="button" className="btn" onClick={() => onSelect(video)}>
                Preview
              </button>
              <div className="transcode-controls">
                <label htmlFor={`preset-${video.videoId}`}>Preset</label>
                <select
                  id={`preset-${video.videoId}`}
                  value={resolvePreset(video.videoId)}
                  onChange={(event) => handlePresetChange(video.videoId, event.target.value)}
                >
                  {transcodePresets.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn"
                  onClick={() => onTranscode(video, resolvePreset(video.videoId))}
                >
                  Transcode
                </button>
              </div>
              <button type="button" className="btn" onClick={() => onDownload(video)}>
                Download
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default VideoList;
