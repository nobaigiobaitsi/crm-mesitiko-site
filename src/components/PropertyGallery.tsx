import { useCallback, useEffect, useRef, useState } from "react";
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
  const dragSource = useRef<string | null>(null);
  const mutationInProgress = useRef(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  function clearDrag() {
    dragSource.current = null;
    setDraggedId(null);
    setDropTarget(null);
  }
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
        if (active && !mutationInProgress.current && !dragSource.current)
          setPhotos(data);
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
    if (!files.length || !canWrite || mutationInProgress.current) return;
    mutationInProgress.current = true;
    setBusy(true);
    setError("");
    try {
      if (photos.length + files.length > 40)
        throw new Error("Έως 40 φωτογραφίες ανά ακίνητο.");
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
      mutationInProgress.current = false;
      setBusy(false);
    }
  }
  async function move(index: number, target: number) {
    if (
      !canWrite ||
      mutationInProgress.current ||
      index === target ||
      index < 0 ||
      target < 0 ||
      index >= photos.length ||
      target >= photos.length
    )
      return;
    mutationInProgress.current = true;
    setBusy(true);
    setError("");
    try {
      const ordered = [...photos];
      const [photo] = ordered.splice(index, 1);
      ordered.splice(target, 0, photo);
      await repository.reorder(
        propertyId,
        ordered.map((item) => item.id),
      );
      setPhotos(ordered);
      setAnnouncement(
        `Η φωτογραφία μετακινήθηκε στη θέση ${target + 1}. Η σειρά αποθηκεύτηκε.`,
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      mutationInProgress.current = false;
      setBusy(false);
    }
  }
  async function remove(photo: Photo) {
    if (!canDelete || mutationInProgress.current) return;
    mutationInProgress.current = true;
    setBusy(true);
    setError("");
    try {
      await repository.remove(photo);
      await refresh();
      setConfirm("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      mutationInProgress.current = false;
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
      {canWrite && photos.length > 1 && (
        <p className="photo-drag-hint">
          Σύρετε μια φωτογραφία πάνω σε άλλη για να αλλάξετε τη σειρά. Η πρώτη
          γίνεται εξώφυλλο. Η σειρά αποθηκεύεται αυτόματα.
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className="photo-grid" aria-busy={busy}>
        {photos.map((photo, index) => (
          <figure
            key={photo.id}
            draggable={canWrite && !busy && photos.length > 1}
            className={`${draggedId === photo.id ? "photo-dragging" : ""} ${dropTarget === photo.id ? "photo-drop-target" : ""}`}
            onDragStart={(event) => {
              if (
                !canWrite ||
                busy ||
                (event.target as HTMLElement).closest("button")
              ) {
                event.preventDefault();
                return;
              }
              dragSource.current = photo.id;
              setDraggedId(photo.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", photo.id);
            }}
            onDragOver={(event) => {
              if (
                !canWrite ||
                busy ||
                !dragSource.current ||
                dragSource.current === photo.id
              )
                return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget(photo.id);
            }}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              )
                setDropTarget(null);
            }}
            onDrop={(event) => {
              if (!dragSource.current || !canWrite || busy) return;
              event.preventDefault();
              const source = photos.findIndex(
                (item) => item.id === dragSource.current,
              );
              clearDrag();
              void move(source, index);
            }}
            onDragEnd={clearDrag}
          >
            {photo.url ? (
              <a
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                draggable={false}
              >
                <img src={photo.url} alt={photo.caption} draggable={false} />
              </a>
            ) : (
              <p className="empty">Η εικόνα δεν είναι διαθέσιμη.</p>
            )}
            <figcaption>
              {index === 0 && <strong>Εξώφυλλο · </strong>}
              {photo.caption}
            </figcaption>
            {canWrite && (
              <div className="photo-order-actions">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => void move(index, index - 1)}
                  aria-label="Προηγούμενη θέση"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={busy || index === photos.length - 1}
                  onClick={() => void move(index, index + 1)}
                  aria-label="Επόμενη θέση"
                >
                  →
                </button>
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => void move(index, 0)}
                >
                  Εξώφυλλο
                </button>
              </div>
            )}
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
        στους εξουσιοδοτημένους συνεργάτες. Με «Δημοσίευση» εμφανίζονται όλες
        στο site, με την πρώτη ως εξώφυλλο. Οι αλλαγές φωτογραφιών χρειάζονται
        νέα δημοσίευση.
      </p>
    </section>
  );
}
