import type { PaperAnalysis } from '@qvanta/types';
import { AppError } from '../../lib/errors';
import { extractPaperAnalysis } from './paper-extract';
import { fetchPaperFromUrl, paperSourceFromUpload } from './paper-source';

export interface AnalyzePaperInput {
  url?: string;
  pdfBase64?: string;
}

/**
 * Resolves the learner's link or upload into paper text/PDF, then asks Google
 * Gemini to lift out the circuits. A link is preferred when both are provided.
 */
export async function analyzePaper(input: AnalyzePaperInput): Promise<PaperAnalysis> {
  if (input.url) {
    return extractPaperAnalysis(await fetchPaperFromUrl(input.url));
  }

  if (input.pdfBase64) {
    return extractPaperAnalysis(paperSourceFromUpload(input.pdfBase64));
  }

  throw AppError.validation('Paste a paper link or upload a PDF to analyse.');
}
