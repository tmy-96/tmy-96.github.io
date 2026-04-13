/**
 * Custom hook for managing product image uploads to Supabase Storage.
 *
 * Handles uploading images to the `product-images` bucket, generating
 * public URLs for display, and deleting images when products are updated.
 * Images are stored at the path: product-images/{productId}/{filename}
 */
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  PRODUCT_IMAGE_PATH_PATTERN,
} from '../constants/imageUpload';
import { UUID_PATTERN } from '../constants/security';

/** Return type of the useProductImageStorage hook. */
export interface UseProductImageStorageReturn {
  uploading: boolean;
  error: string | null;
  /** Upload a file to Supabase Storage and return the storage path. */
  uploadImage: (file: File, productId: string) => Promise<string | null>;
  /** Delete an image from Supabase Storage by its storage path. */
  deleteImage: (path: string) => Promise<void>;
  /** Generate a public URL for a stored image path. */
  getPublicUrl: (path: string) => string;
}

export function useProductImageStorage(): UseProductImageStorageReturn {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload an image file to Supabase Storage.
   * @param file - The image file to upload.
   * @param productId - The product's UUID, used as the storage folder.
   * @returns The storage path on success, null on failure.
   */
  const uploadImage = useCallback(
    async (file: File, productId: string): Promise<string | null> => {
      setUploading(true);
      setError(null);

      if (!UUID_PATTERN.test(productId)) {
        setUploading(false);
        setError('Invalid product id.');
        return null;
      }

      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
        setUploading(false);
        setError('Unsupported image format.');
        return null;
      }

      // Generate a unique filename to prevent collisions.
      // Derive extension from MIME type rather than filename to avoid mismatches
      // (e.g. a file named "photo.txt" with MIME type "image/jpeg").
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
      };
      const safeExt = mimeToExt[file.type] ?? 'jpg';
      const fileName = `${Date.now()}.${safeExt}`;
      const storagePath = `${productId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      setUploading(false);

      if (uploadError) {
        setError(uploadError.message);
        return null;
      }

      return storagePath;
    },
    []
  );

  /**
   * Delete an image from Supabase Storage.
   * @param path - The storage path of the image to delete.
   */
  const deleteImage = useCallback(async (path: string): Promise<void> => {
    if (!PRODUCT_IMAGE_PATH_PATTERN.test(path)) {
      setError('Invalid image path.');
      return;
    }

    const { error: deleteError } = await supabase.storage
      .from('product-images')
      .remove([path]);

    if (deleteError) {
      setError(deleteError.message);
    }
  }, []);

  /**
   * Generate a public URL for an image stored in Supabase Storage.
   * @param path - The storage path of the image.
   * @returns The publicly accessible URL.
   */
  const getPublicUrl = useCallback((path: string): string => {
    if (!PRODUCT_IMAGE_PATH_PATTERN.test(path)) {
      return '';
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);

    return data.publicUrl;
  }, []);

  return { uploading, error, uploadImage, deleteImage, getPublicUrl };
}
