import { createContext, useContext } from "react";

/**
 * Host-provided image uploader. Receives the picked `File`, uploads it wherever
 * the host stores assets (S3, Cloudinary, your API, …), and resolves to a hosted
 * absolute URL. The builder writes that URL into the block's `src`/`thumbnailUrl`.
 *
 * When no uploader is supplied, the image fields stay URL-only.
 */
export type ImageUploadFn = (file: File) => Promise<string>;

export const ImageUploadContext = createContext<ImageUploadFn | undefined>(undefined);

/** The uploader supplied via `<EmailBuilder onImageUpload={…} />`, if any. */
export function useImageUpload(): ImageUploadFn | undefined {
    return useContext(ImageUploadContext);
}
