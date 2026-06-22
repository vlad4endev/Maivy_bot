import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../lib/auth";

export type MediaUploadKind = "image" | "video" | "video_note";

const ACCEPT_BY_KIND: Record<MediaUploadKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/quicktime,video/webm",
  video_note: "video/mp4,video/quicktime",
};

const MAX_SIZE_BY_KIND: Record<MediaUploadKind, number> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  video_note: 50 * 1024 * 1024,
};

const LABEL_BY_KIND: Record<MediaUploadKind, string> = {
  image: "фото",
  video: "видео",
  video_note: "кружок (видео)",
};

interface MediaUploadProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: MediaUploadKind;
  hint?: string;
  pathPlaceholder?: string;
}

function isStorageRef(value: string): boolean {
  return value.startsWith("storage:");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function MediaUpload({
  label,
  value,
  onChange,
  kind,
  hint,
  pathPlaceholder,
}: MediaUploadProps) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const preview = useQuery(
    api.media.getMediaPreview,
    token && value ? { token, mediaRef: value } : "skip",
  );

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showManualPath, setShowManualPath] = useState(
    () => Boolean(value) && !isStorageRef(value) && !value.startsWith("http"),
  );

  const handlePickFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token) {
      return;
    }

    const maxSize = MAX_SIZE_BY_KIND[kind];
    if (file.size > maxSize) {
      setError(`Файл слишком большой. Максимум ${formatFileSize(maxSize)}.`);
      return;
    }

    setError("");
    setUploading(true);

    try {
      const uploadUrl = await generateUploadUrl({ token });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки (${response.status})`);
      }

      const result = (await response.json()) as { storageId: string };
      onChange(`storage:${result.storageId}`);
      setShowManualPath(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    onChange("");
    setError("");
  };

  return (
    <div className="form-group media-upload">
      <label>{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_BY_KIND[kind]}
        capture={kind === "image" ? "environment" : undefined}
        className="media-upload-input"
        onChange={(e) => void handleFileChange(e)}
      />

      <div className="media-upload-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handlePickFile}
          disabled={uploading || !token}
        >
          {uploading
            ? "Загрузка..."
            : `Загрузить ${LABEL_BY_KIND[kind]} с устройства`}
        </button>
        {value ? (
          <button type="button" className="btn btn-sm" onClick={handleClear}>
            Очистить
          </button>
        ) : null}
      </div>

      {error ? <div className="error-msg media-upload-error">{error}</div> : null}

      {hint ? (
        <p className="media-upload-hint">{hint}</p>
      ) : (
        <p className="media-upload-hint">
          До {formatFileSize(MAX_SIZE_BY_KIND[kind])}. Файл сохраняется в Convex и доступен боту
          без ручного копирования в assets/.
        </p>
      )}

      {preview?.url && kind === "image" ? (
        <div className="media-upload-preview">
          <img src={preview.url} alt="Предпросмотр" />
        </div>
      ) : null}

      {preview?.url && (kind === "video" || kind === "video_note") ? (
        <div className="media-upload-preview">
          <video src={preview.url} controls playsInline />
        </div>
      ) : null}

      {value ? (
        <p className="media-upload-ref">
          {isStorageRef(value) ? "Загружено в хранилище" : `Путь: ${value}`}
        </p>
      ) : null}

      <button
        type="button"
        className="media-upload-toggle-path"
        onClick={() => setShowManualPath((open) => !open)}
      >
        {showManualPath ? "Скрыть ручной путь" : "Или указать путь в assets/ вручную"}
      </button>

      {showManualPath ? (
        <input
          className="media-upload-path"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={pathPlaceholder}
        />
      ) : null}
    </div>
  );
}
