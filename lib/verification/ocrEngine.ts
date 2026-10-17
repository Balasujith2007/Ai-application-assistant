import { createWorker } from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number; // 0.0 - 1.0
  error?: string;
}

/**
 * Robust OCR processing using Tesseract.js.
 * Handles timeouts, crashes, image errors, and sanitizes OCR output.
 * Treats all OCR output strictly as untrusted input.
 */
export async function runOcrOnImage(imageBuffer: Buffer, timeoutMs = 25000): Promise<OcrResult> {
  let worker: any = null;
  let timer: NodeJS.Timeout | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`OCR processing timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    });

    const ocrPromise = (async () => {
      worker = await createWorker('eng');
      const ret = await worker.recognize(imageBuffer);
      const rawText = ret.data?.text || '';
      const confidence = typeof ret.data?.confidence === 'number' ? Math.max(0, Math.min(1, ret.data.confidence / 100)) : 0;

      // Sanitize extracted text: remove null bytes and untrusted control characters
      const sanitizedText = rawText
        .replace(/\0/g, '')
        .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
        .trim();

      return {
        text: sanitizedText,
        confidence
      };
    })();

    const result = await Promise.race([ocrPromise, timeoutPromise]);
    return result;
  } catch (err: any) {
    console.error('[OCR Engine] Error running OCR on image:', err?.message || err);
    return {
      text: '',
      confidence: 0,
      error: err?.message || 'OCR extraction failed'
    };
  } finally {
    if (timer) clearTimeout(timer);
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        // Ignore worker cleanup warnings
      }
    }
  }
}
