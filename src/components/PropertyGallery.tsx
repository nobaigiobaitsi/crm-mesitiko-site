import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import type { Photo } from "../domain/model";
import { preparePhoto } from "../lib/images";
import type { PhotoRepository } from "../services/photos";
import { ErrorNotice } from "./Common";

export function PropertyGallery({
  propertyId,
  repository,
  canWrite,
  canDelete,
}: {
  propertyId: string;
  repository: PhotoRepository;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState("");
  const refresh = useCallback(
    async () => setPhotos(await repository.list(propertyId)),
    [repository, propertyId],
  );
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await repository.list(propertyId);
        if (active) setPhotos(data);
      } catch (error) {
        if (active) setError((error as Error).message);
      }
    }
    void load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 240000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [repository, propertyId]);
  async function upload(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      if (photos.length + files.length > 20)
        throw new Error("Έως 20 φωτογραφίες ανά ακίνητο.");
      for (const file of files)
        await repository.upload(
          propertyId,
          await preparePhoto(file),
          file.name,
        );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      try {
        await refresh();
      } catch (error) {
        setError((error as Error).message);
      }
      setBusy(false);
    }
  }
  async function remove(photo: Photo) {
    setBusy(true);
    setError("");
    try {
      await repository.remove(photo);
      await refresh();
      setConfirm("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="linked-section gallery"
      aria-label="Φωτογραφίες ακινήτου"
    >
      <h3>
        Φωτογραφίες<span className="count">{photos.length}</span>
      </h3>
      <ErrorNotice message={error} />
      <div className="photo-grid">
        {photos.map((photo) => (
          <figure key={photo.id}>
            {photo.url ? (
              <a href={photo.url} target="_blank" rel="noreferrer">
                <img src={photo.url} alt={photo.caption} />
              </a>
            ) : (
              <p className="empty">Η εικόνα δεν είναι διαθέσιμη.</p>
            )}
            <figcaption>{photo.caption}</figcaption>
            {canDelete && (
              <button
                type="button"
                disabled={busy}
                className="icon-btn photo-delete"
                aria-label={`Διαγραφή φωτογραφίας ${photo.caption}`}
                onClick={() => setConfirm(photo.id)}
              >
                <Trash2 size={16} />
              </button>
            )}
            {confirm === photo.id && (
              <div className="photo-confirm">
                <span>Διαγραφή φωτογραφίας;</span>
                <button disabled={busy} onClick={() => void remove(photo)}>
                  Διαγραφή
                </button>
                <button disabled={busy} onClick={() => setConfirm("")}>
                  Ακύρωση
                </button>
              </div>
            )}
          </figure>
        ))}
      </div>
      {!photos.length && (
        <p className="muted">Δεν έχουν προστεθεί φωτογραφίες.</p>
      )}
      {canWrite && (
        <label className={`secondary photo-upload ${busy ? "disabled" : ""}`}>
          <ImagePlus size={17} />
          {busy ? "Αποθήκευση φωτογραφιών…" : "Προσθήκη φωτογραφιών"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = "";
              void upload(files);
            }}
          />
        </label>
      )}
      <p className="field-hint">
        JPEG, PNG, WebP · Αυτόματη συμπίεση · Οι φωτογραφίες είναι διαθέσιμες
        στους εξουσιοδοτημένους συνεργάτες.
      </p>
    </section>
  );
}
