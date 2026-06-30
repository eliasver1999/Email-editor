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

/**
 * Host-provided uploader for arbitrary files (the File/Download block) — same
 * contract as {@link ImageUploadFn}: take the picked `File`, store it, resolve to
 * a hosted URL. Supplied via `<EmailBuilder onFileUpload={…} />`; falls back to
 * `onImageUpload` when omitted (one S3 handler can serve both). No uploader →
 * the File block stays URL-only.
 */
export type FileUploadFn = (file: File) => Promise<string>;

export const FileUploadContext = createContext<FileUploadFn | undefined>(undefined);

/** The effective file uploader (`onFileUpload`, falling back to `onImageUpload`), if any. */
export function useFileUpload(): FileUploadFn | undefined {
    return useContext(FileUploadContext);
}
