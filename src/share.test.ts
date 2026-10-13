import { describe, expect, it } from 'vitest';
import { shareMode, sharePayload } from './share.ts';

describe('shareMode', () => {
  it('shares the image with the link when the share sheet takes files and the image is ready', () => {
    expect(shareMode({ hasShare: true, canShareFiles: true, imageReady: true })).toBe('files');
  });

  it('shares the link alone when files are not accepted', () => {
    expect(shareMode({ hasShare: true, canShareFiles: false, imageReady: true })).toBe('link');
  });

  it('shares the link alone when the image is not ready yet, rather than making the tap wait', () => {
    expect(shareMode({ hasShare: true, canShareFiles: true, imageReady: false })).toBe('link');
  });

  it('copies the link when there is no share sheet at all', () => {
    expect(shareMode({ hasShare: false, canShareFiles: false, imageReady: false })).toBe('copy');
    // A browser that claims file support without navigator.share still cannot share.
    expect(shareMode({ hasShare: false, canShareFiles: true, imageReady: true })).toBe('copy');
  });
});

describe('sharePayload', () => {
  const base = { title: 'Ikizen', text: 'Hacemos que te recuerden.', url: 'https://example.com/johny/' };

  it('sends title, text and url for a link', () => {
    expect(sharePayload('link', base)).toEqual(base);
  });

  it('repeats the url inside the text when a file goes along, since many apps drop `url` then', () => {
    const file = { name: 'card.png' };
    const payload = sharePayload('files', base, file);
    expect(payload.files).toEqual([file]);
    expect(payload.url).toBe(base.url);
    expect(payload.text).toBe('Hacemos que te recuerden. https://example.com/johny/');
  });
});
