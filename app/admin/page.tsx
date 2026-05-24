"use client";

import { useEffect, useRef, useState } from "react";

interface ImageEntry {
  url: string;
  pathname: string;
}

export default function AdminPage() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchImages() {
    const res = await fetch("/api/images");
    const data = await res.json();
    if (data.images) setImages(data.images);
  }

  useEffect(() => {
    fetchImages();
  }, []);

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!fileArray.length) return;
    setUploading(true);
    setStatus(`Uploading ${fileArray.length} image(s)…`);

    let uploaded = 0;
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const form = new FormData();
      form.append("file", file);
      form.append("order", String(images.length + i));
      try {
        const res = await fetch("/api/upload-image", { method: "POST", body: form });
        if (res.ok) uploaded++;
      } catch {
        // continue
      }
    }

    await fetchImages();
    setUploading(false);
    setStatus(`✅ Uploaded ${uploaded} of ${fileArray.length} image(s)`);
    setTimeout(() => setStatus(""), 3000);
  }

  async function deleteImage(img: ImageEntry) {
    if (!confirm("Remove this image?")) return;
    await fetch("/api/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname: img.pathname }),
    });
    fetchImages();
  }

  return (
    <div className="min-h-screen bg-[#0f1117] px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm mb-3 block">
            ← Back to home
          </a>
          <h1 className="text-white text-2xl font-bold">Reward Images</h1>
          <p className="text-gray-500 text-sm mt-1">
            Images shown in order — checkpoint 1 gets image 1, etc.
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Or drop files directly into <code className="bg-[#2a2d3a] px-1 rounded">public/album/</code>
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
        >
          + Upload Images
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
          }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
        className={`w-full border-2 border-dashed rounded-2xl p-8 text-center mb-8 transition-all ${
          dragOver
            ? "border-indigo-400 bg-indigo-950/20"
            : "border-[#2a2d3a] bg-[#1a1d27]"
        }`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-300 text-sm">{status}</span>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Drag & drop images here to upload multiple at once
          </p>
        )}
      </div>

      {status && !uploading && (
        <p className="text-green-400 text-sm mb-6">{status}</p>
      )}

      {images.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-600 text-lg mb-2">No images yet</p>
          <p className="text-gray-700 text-sm">Upload images to reward readers at each checkpoint</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img, i) => (
            <div
              key={img.url}
              className="relative group rounded-xl overflow-hidden border border-[#2a2d3a] bg-[#1a1d27] aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Checkpoint ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <p className="text-white text-xs font-bold">Checkpoint {i + 1}</p>
                <button
                  onClick={() => deleteImage(img)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg transition-all"
                >
                  Remove
                </button>
              </div>
              <div className="absolute top-2 left-2">
                <span className="text-xs bg-black/70 text-white px-2 py-0.5 rounded-full">
                  #{i + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
