import type { SupabaseClient } from "@supabase/supabase-js";
import type { Photo } from "../domain/model";

const BUCKET = "property-photos";
export function createPhotoRepository(client: SupabaseClient) {
  const storage = client.storage.from(BUCKET);
  return {
    async list(propertyId: string): Promise<Photo[]> {
      const { data, error } = await client
        .from("crm_photos")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at")
        .order("id");
      if (error) throw error;
      const photos = data as Photo[];
      if (!photos.length) return [];
      const signed = await storage.createSignedUrls(
        photos.map((photo) => photo.path),
        300,
      );
      if (signed.error) throw signed.error;
      return photos.map((photo, index) => ({
        ...photo,
        url: signed.data[index]?.signedUrl || undefined,
      }));
    },
    async upload(propertyId: string, blob: Blob, caption: string) {
      const id = crypto.randomUUID(),
        path = `${propertyId}/${id}.jpg`;
      const upload = await storage.upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const metadata = await client
        .from("crm_photos")
        .insert({
          id,
          property_id: propertyId,
          path,
          caption: caption.slice(0, 200),
        });
      if (metadata.error) {
        await storage.remove([path]);
        throw metadata.error;
      }
    },
    async remove(photo: Photo) {
      const file = await storage.remove([photo.path]);
      if (file.error) throw file.error;
      const metadata = await client
        .from("crm_photos")
        .delete()
        .eq("id", photo.id)
        .select("id");
      if (metadata.error) throw metadata.error;
      if (!metadata.data?.length)
        throw new Error(
          "Η φωτογραφία δεν διαγράφηκε από την εγγραφή. Ανανεώστε και δοκιμάστε ξανά.",
        );
    },
  };
}
export type PhotoRepository = ReturnType<typeof createPhotoRepository>;
