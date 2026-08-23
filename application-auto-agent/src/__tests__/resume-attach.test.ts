import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  assignFileToInput,
  fileFromResumeBytes,
  tryAttachResume,
  type ResumeBytes,
} from '../content/autofill-engine';

class MockDataTransfer {
  private list: File[] = [];
  items = {
    add: (file: File) => {
      this.list.push(file);
    },
  };
  get files() {
    const files = this.list;
    return {
      length: files.length,
      item: (i: number) => files[i] || null,
      0: files[0],
      [Symbol.iterator]: function* () { yield* files; },
    } as unknown as FileList;
  }
}

function mockFileInput() {
  let files: FileList | null = null;
  const listeners: Record<string, Array<(ev: Event) => void>> = {};
  const input = {
    type: 'file',
    get files() {
      return files;
    },
    set files(next: FileList | null) {
      files = next;
    },
    addEventListener(type: string, fn: (ev: Event) => void) {
      (listeners[type] ||= []).push(fn);
    },
    dispatchEvent(ev: Event) {
      for (const fn of listeners[ev.type] || []) fn(ev);
      return true;
    },
  };
  return input as unknown as HTMLInputElement;
}

describe('resume attachment helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('DataTransfer', MockDataTransfer);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a File with the correct filename and MIME type', () => {
    const bytes = new TextEncoder().encode('%PDF-1.4 mock resume').buffer;
    const file = fileFromResumeBytes({
      bytes,
      fileName: 'Gowtham_Resume.pdf',
      mimeType: 'application/pdf',
    });
    expect(file.name).toBe('Gowtham_Resume.pdf');
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBeGreaterThan(0);
  });

  it('assignFileToInput populates the file input and fires change', () => {
    const input = mockFileInput();
    const onChange = vi.fn();
    input.addEventListener('change', onChange);
    const file = new File([new Uint8Array([1, 2, 3])], 'resume.pdf', { type: 'application/pdf' });
    expect(assignFileToInput(input, file)).toBe(true);
    expect(input.files?.length).toBe(1);
    expect(input.files?.[0]?.name).toBe('resume.pdf');
    expect(onChange).toHaveBeenCalled();
  });

  it('tryAttachResume returns false when resume metadata and fetcher are missing', async () => {
    const input = mockFileInput();
    expect(await tryAttachResume(input, null)).toBe(false);
    expect(input.files?.length || 0).toBe(0);
  });

  it('tryAttachResume attaches when authenticated fetchResume succeeds', async () => {
    const input = mockFileInput();
    const payload: ResumeBytes = {
      bytes: new TextEncoder().encode('pdf-bytes').buffer,
      fileName: 'CareerAI_Resume.pdf',
      mimeType: 'application/pdf',
    };
    const ok = await tryAttachResume(
      input,
      { fileName: 'CareerAI_Resume.pdf', downloadUrl: '/api/extension/resume/download' },
      'http://localhost:3000',
      async () => payload,
    );
    expect(ok).toBe(true);
    expect(input.files?.[0]?.name).toBe('CareerAI_Resume.pdf');
  });

  it('tryAttachResume returns false when download yields no bytes (missing resume)', async () => {
    const input = mockFileInput();
    const ok = await tryAttachResume(
      input,
      { downloadUrl: '/api/extension/resume/download' },
      'http://localhost:3000',
      async () => null,
    );
    expect(ok).toBe(false);
    expect(input.files?.length || 0).toBe(0);
  });

  it('tryAttachResume does not invent a file when resume metadata is missing', async () => {
    const input = mockFileInput();
    const fetchSpy = vi.fn(async () => ({
      bytes: new TextEncoder().encode('should-not-run').buffer,
      fileName: 'other-user.pdf',
      mimeType: 'application/pdf',
    }));
    // Without downloadUrl, even if a fetcher exists, callers must pass resume meta.
    // Runner only invokes tryAttach when profileRes.resume is present.
    expect(await tryAttachResume(input, null)).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(input.files?.length || 0).toBe(0);
  });

  it('tryAttachResume attaches only the bytes returned for the provided user resume URL', async () => {
    const input = mockFileInput();
    const ok = await tryAttachResume(
      input,
      { fileName: 'Gowtham_Resume.pdf', downloadUrl: '/api/extension/resume/download' },
      'http://localhost:3000',
      async (meta) => {
        expect(meta.downloadUrl).toBe('/api/extension/resume/download');
        expect(meta.fileName).toBe('Gowtham_Resume.pdf');
        return {
          bytes: new TextEncoder().encode('gowtham-only').buffer,
          fileName: 'Gowtham_Resume.pdf',
          mimeType: 'application/pdf',
        };
      },
    );
    expect(ok).toBe(true);
    expect(input.files?.[0]?.name).toBe('Gowtham_Resume.pdf');
  });

  it('failed download leaves the file input empty (manual intervention only after report)', async () => {
    const input = mockFileInput();
    const ok = await tryAttachResume(
      input,
      { fileName: 'Gowtham_Resume.pdf', downloadUrl: '/api/extension/resume/download' },
      'http://localhost:3000',
      async () => null,
    );
    expect(ok).toBe(false);
    expect(input.files?.length || 0).toBe(0);
  });

  it('file input receives the stored resume after successful attach', async () => {
    const input = mockFileInput();
    await tryAttachResume(
      input,
      { fileName: 'stored.pdf', downloadUrl: '/api/extension/resume/download', mimeType: 'application/pdf' },
      undefined,
      async () => ({
        bytes: new Uint8Array([37, 80, 68, 70]).buffer,
        fileName: 'stored.pdf',
        mimeType: 'application/pdf',
      }),
    );
    expect(input.files?.[0]?.name).toBe('stored.pdf');
    expect(input.files?.[0]?.type).toBe('application/pdf');
  });
});
