"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

interface Props {
  tradeId: string;
  screenshots: string[];
  onUpdate: (urls: string[]) => void;
}

export default function ScreenshotUpload({ tradeId, screenshots, onUpdate }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (screenshots.length >= 5) {
      alert("Maximum 5 screenshots per trade.");
      return;
    }

    setUploading(true);

    try {
      // Compress image
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${tradeId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("trade-screenshots")
        .upload(path, compressed, { contentType: compressed.type });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("trade-screenshots")
        .getPublicUrl(path);

      onUpdate([...screenshots, urlData.publicUrl]);
    } catch (err: any) {
      console.error("Upload failed:", err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(url: string) {
    // Extract path from URL
    const parts = url.split("/trade-screenshots/");
    if (parts[1]) {
      await supabase.storage.from("trade-screenshots").remove([parts[1]]);
    }
    onUpdate(screenshots.filter((s) => s !== url));
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm text-text-secondary">
        Screenshots ({screenshots.length}/5)
      </label>

      <div className="flex flex-wrap gap-3">
        {screenshots.map((url) => (
          <div key={url} className="group relative">
            <img
              src={url}
              alt="Screenshot"
              onClick={() => setPreview(url)}
              className="h-24 w-32 cursor-pointer rounded-lg border border-border object-cover transition-opacity hover:opacity-80"
            />
            <button
              onClick={() => handleDelete(url)}
              className="absolute -top-2 -right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-loss text-xs text-white group-hover:flex"
            >
              ×
            </button>
          </div>
        ))}

        {screenshots.length < 5 && (
          <label className="flex h-24 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border text-text-secondary transition-colors hover:border-accent hover:text-accent">
            {uploading ? (
              <span className="text-xs">Uploading...</span>
            ) : (
              <span className="text-2xl">+</span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Full-size preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="Preview" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
    </div>
  );
}
