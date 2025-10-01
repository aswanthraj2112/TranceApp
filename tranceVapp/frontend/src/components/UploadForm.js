import React, { useState } from 'react';
import axios from 'axios';
import useApi from '../hooks/useApi';
import { useAppConfig } from '../contexts/AppConfigContext';

function UploadForm({ onSuccess }) {
  const api = useApi();
  const { maxUploadSizeMb } = useAppConfig();
  const sizeLimitMb = Number(maxUploadSizeMb) || 512;
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const onFileChange = (event) => {
    const [selectedFile] = event.target.files;
    const limitBytes = sizeLimitMb * 1024 * 1024;
    if (selectedFile && selectedFile.size > limitBytes) {
      setMessage(`File is too large. Maximum allowed size is ${sizeLimitMb} MB.`);
      event.target.value = '';
      setFile(null);
      setProgress(0);
      return;
    }

    setFile(selectedFile || null);
    setProgress(0);
    setMessage('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setMessage('Please select a video file to upload.');
      return;
    }

    setIsUploading(true);
    setMessage('');

    try {
      const initiateResponse = await api.post('/videos/initiate-upload', {
        filename: file.name,
        fileType: file.type,
      });

      const { uploadUrl, videoId } = initiateResponse.data;

      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          }
        },
      });

      await api.post('/videos/finalize-upload', { videoId, filename: file.name });
      setMessage('Upload completed successfully.');
      setFile(null);
      setProgress(0);
      onSuccess();
    } catch (error) {
      console.error('Upload failed', error);
      setMessage('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <input type="file" accept="video/*" onChange={onFileChange} disabled={isUploading} />
      <button type="submit" disabled={!file || isUploading}>
        {isUploading ? 'Uploading...' : 'Start Upload'}
      </button>
      {isUploading && <progress value={progress} max="100">{progress}%</progress>}
      <p>Maximum file size: {sizeLimitMb} MB</p>
      {message && <p>{message}</p>}
    </form>
  );
}

export default UploadForm;
