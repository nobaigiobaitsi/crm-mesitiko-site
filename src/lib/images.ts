export async function preparePhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Επιλέξτε JPEG, PNG ή WebP.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Η αρχική εικόνα πρέπει να είναι μικρότερη από 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height) throw new Error("Μη έγκυρη εικόνα.");
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Δεν υποστηρίζεται η επεξεργασία εικόνων.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Αποτυχία συμπίεσης.")),
        "image/jpeg",
        0.82,
      ),
    );
    if (blob.size > 2 * 1024 * 1024)
      throw new Error(
        "Η συμπιεσμένη εικόνα ξεπερνά τα 2 MB. Επιλέξτε μικρότερη εικόνα.",
      );
    return blob;
  } finally {
    bitmap.close();
  }
}
