import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { videosAPI } from '../api/videos.js';
import { useToast } from '../App.jsx';
import Uploader from '../components/Uploader.jsx';
import VideoList from '../components/VideoList.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';

function Dashboard({ user, token, groups }) {
  const notify = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [pollingVideoId, setPollingVideoId] = useState(null);
  const pollingRef = useRef(null);

  const presets = useMemo(() => {
    if (Array.isArray(groups) && groups.includes('premium-users')) {
      return ['480p', '720p', '1080p'];
    }
    return ['480p', '720p'];
  }, [groups]);

  const loadVideos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const items = await videosAPI.listVideos(token);
      setVideos(items);
    } catch (error) {
      notify(error.message || 'Unable to load videos', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    if (!pollingVideoId) return;

    const poll = async () => {
      try {
        const status = await videosAPI.getStatus(token, pollingVideoId);
        setVideos((current) =>
          current.map((item) =>
            item.videoId === pollingVideoId ? { ...item, status: status.status } : item
          )
        );
        if (status.status && status.status.startsWith('READY')) {
          notify('Transcoding complete!', 'success');
          setPollingVideoId(null);
          loadVideos();
        }
      } catch (error) {
        console.error('Status polling failed', error);
        notify('Unable to poll status.', 'error');
        setPollingVideoId(null);
      }
    };

    pollingRef.current = window.setInterval(poll, 5000);
    poll();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pollingVideoId, token, notify, loadVideos]);

  const handleUpload = async (file) => {
    if (!token) return;
    setUploading(true);
    try {
      const videoId = await videosAPI.uploadVideo(token, file);
      notify(`Uploaded ${file.name}`, 'success');
      setSelectedVideo(null);
      setPollingVideoId(null);
      await loadVideos();
      return videoId;
    } catch (error) {
      notify(error.message || 'Upload failed', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = (video) => {
    setSelectedVideo(video);
  };

  const handleTranscode = async (video, preset) => {
    if (!token) return;
    try {
      await videosAPI.requestTranscode(token, video.videoId, preset);
      notify(`Transcoding ${video.originalName} to ${preset}`, 'info');
      setPollingVideoId(video.videoId);
      setVideos((current) =>
        current.map((item) =>
          item.videoId === video.videoId ? { ...item, status: `TRANSCODING-${preset}` } : item
        )
      );
    } catch (error) {
      notify(error.message || 'Failed to start transcoding', 'error');
    }
  };

  const handleDownload = async (video) => {
    if (!token) return;
    try {
      const { downloadUrl } = await videosAPI.getDownloadUrl(token, video.videoId);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      notify(error.message || 'Unable to get download link', 'error');
    }
  };

  return (
    <div className="dashboard">
      <section className="welcome">
        <h1>Hello, {(user?.username || 'Guest').toUpperCase()}!</h1>
        <p>Upload a video to preview it directly from the browser.</p>
      </section>
      <Uploader onUpload={handleUpload} uploading={uploading} />
      <VideoList
        videos={videos}
        loading={loading}
        transcodePresets={presets}
        onSelect={handleSelect}
        onTranscode={handleTranscode}
        onDownload={handleDownload}
      />
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          token={token}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
