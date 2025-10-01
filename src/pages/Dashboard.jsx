import React, { useEffect, useState } from 'react';
import { videosAPI } from '../api/videos.js';
import { useToast } from '../App.jsx';
import Uploader from '../components/Uploader.jsx';
import VideoList from '../components/VideoList.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';

function Dashboard({ user }) {
  const notify = useToast();
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    videosAPI
      .listVideos(page, limit, user?.id)
      .then((data) => {
        if (!cancelled) {
          setVideos(data.items);
          setTotal(data.total);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notify(error.message, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, limit, notify, refreshIndex, user?.id]);

  const triggerRefresh = () => setRefreshIndex((value) => value + 1);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      await videosAPI.uploadVideo(file, user?.id);
      notify(`Uploaded ${file.name}`, 'success');
      setPage(1);
      triggerRefresh();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = (video) => {
    setSelectedVideo(video);
  };

  const handleTranscode = () => {
    notify('Transcoding is not available in local mode.', 'info');
  };

  const handleDelete = (video) => {
    if (!window.confirm(`Delete ${video.originalName}? This cannot be undone.`)) {
      return;
    }
    notify('Delete is not implemented in this demo.', 'info');
    if (selectedVideo?.id === video.id) {
      setSelectedVideo(null);
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
        page={page}
        limit={limit}
        total={total}
        onSelect={handleSelect}
        onTranscode={handleTranscode}
        onDelete={handleDelete}
        onPageChange={setPage}
      />
      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  );
}

export default Dashboard;
