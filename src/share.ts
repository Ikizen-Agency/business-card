/** How "Compartir" behaves, decided from what the browser can do. Pure: no DOM. */

/** `files`: the card image plus the link; `link`: the link alone; `copy`: clipboard. */
export type ShareMode = 'files' | 'link' | 'copy';

export interface ShareCapabilities {
  /** `navigator.share` exists. */
  hasShare: boolean;
  /** `navigator.canShare({ files })` accepted the image. */
  canShareFiles: boolean;
  /**
   * The image has already been rendered. Sharing must start while the tap is
   * still fresh, so an image that is not ready is skipped, never awaited.
   */
  imageReady: boolean;
}

export function shareMode({ hasShare, canShareFiles, imageReady }: ShareCapabilities): ShareMode {
  if (!hasShare) return 'copy';
  return canShareFiles && imageReady ? 'files' : 'link';
}

export interface ShareContent {
  title: string;
  text: string;
  url: string;
}

/**
 * The data handed to `navigator.share`. With a file, the URL is repeated at
 * the end of the text: several apps keep the text and the image but drop `url`.
 */
export function sharePayload<F>(
  mode: Exclude<ShareMode, 'copy'>,
  content: ShareContent,
  file?: F,
): ShareContent & { files?: F[] } {
  if (mode === 'link' || file === undefined) return { ...content };
  return { ...content, text: `${content.text} ${content.url}`, files: [file] };
}
