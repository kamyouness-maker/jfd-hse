import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { photosApi, isOnline } from '../api/client';
import { savePhotoLocal } from '../db/localDB';
import { v4 as uuidv4 } from 'uuid';

function compressImage(file, maxSize = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height / width) * maxSize);
          width = maxSize;
        } else {
          width = Math.round((width / height) * maxSize);
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    };
    img.src = url;
  });
}

export default function PhotoCapture({ checklistItemId, onPhotoAdded, disabled }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Seules les images sont autorisées');
      return;
    }

    setUploading(true);
    try {
      // Compress locally
      const compressed = await compressImage(file);

      if (isOnline()) {
        // Upload to server
        const formData = new FormData();
        formData.append('photo', compressed, 'photo.jpg');
        const response = await photosApi.upload(checklistItemId, formData);
        if (response.data.success) {
          onPhotoAdded(response.data.data);
          toast.success('Photo ajoutée');
        }
      } else {
        // Store locally as base64
        const reader = new FileReader();
        reader.onload = async (e) => {
          const photoId = uuidv4();
          const localPhoto = {
            id: photoId,
            checklist_item_id: checklistItemId,
            data: e.target.result,
            filename: `${photoId}.jpg`,
            mime_type: 'image/jpeg',
            created_at: new Date().toISOString(),
            pendingSync: 1,
            isLocal: true,
          };
          await savePhotoLocal(localPhoto);
          onPhotoAdded(localPhoto);
          toast.success('Photo enregistrée localement');
        };
        reader.readAsDataURL(compressed);
      }
    } catch (err) {
      console.error('Photo error:', err);
      toast.error("Erreur lors de l'ajout de la photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Camera capture (mobile) */}
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
        title="Prendre une photo"
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        Photo
      </button>

      {/* File upload (PC) */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        title="Choisir un fichier"
      >
        <Upload className="w-3.5 h-3.5" />
        Fichier
      </button>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
