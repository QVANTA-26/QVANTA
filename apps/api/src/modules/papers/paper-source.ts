import axios from 'axios';
import { AppError } from '../../lib/errors';

/**
 * What the Paper Lab managed to pull out of a learner-supplied source. Either
 * readable text (an arXiv abstract page, an HTML paper, a blog post) or the raw
 * PDF bytes, which we send to Google Gemini as inline document data.
 */
export type PaperSource =
  | { kind: 'text'; text: string; sourceUrl?: string }
  | { kind: 'pdf'; dataBase64: string; sourceUrl?: string };

/** Hard ceiling for a downloaded source, kept well under the request body limit. */
const MAX_FETCH_BYTES = 15 * 1024 * 1024;
/** Roughly 6 MB of PDF, which inflates to about 8 MB once base64 encoded. */
const MAX_PDF_BASE64_CHARS = 8_000_000;
/** Enough of a paper to find its circuits without blowing the prompt budget. */
const MAX_TEXT_CHARS = 60_000;
/** Below this, the page we fetched was almost certainly a JS shell or a block page. */
const MIN_USEFUL_TEXT_CHARS = 200;

const USER_AGENT =
  'Mozilla/5.0 (compatible; QVANTA-PaperLab/1.0; +https://www.qvantaindustry.space)';

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/,
  /\.localhost$/,
  /\.local$/,
  /\.internal$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

/**
 * The API fetches whatever URL a learner pastes, so this is a real trust
 * boundary: only public http(s) hosts are allowed, which keeps the request from
 * being turned into a probe of the internal network.
 */
export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw AppError.validation('That does not look like a valid paper link.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw AppError.validation('Only http(s) paper links are supported.');
  }

  const host = url.hostname.toLowerCase();
  const blocked =
    host === '::1' ||
    host === '[::1]' ||
    PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
  if (blocked) {
    throw AppError.validation('That link points to a private address, which is not allowed.');
  }

  return url;
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
};

/** Very small HTML-to-text pass: enough for arXiv/abstract pages and blog posts. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const looksLikePdf = (buffer: Buffer): boolean =>
  buffer.subarray(0, 5).toString('latin1').startsWith('%PDF');

function fetchErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 403 || status === 401) {
      return 'That site refused the download. Try opening the PDF yourself and uploading the file instead.';
    }
    if (status === 404) {
      return 'That paper link returned 404. Check the URL, or upload the PDF instead.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'The paper took too long to download. Try again, or upload the PDF instead.';
    }
  }
  return 'Could not download that link. Try again, or upload the PDF instead.';
}

/** Downloads a paper link and classifies it as HTML text or a PDF. */
export async function fetchPaperFromUrl(rawUrl: string): Promise<PaperSource> {
  const target = assertPublicHttpUrl(rawUrl);
  const sourceUrl = target.toString();

  let response;
  try {
    response = await axios.get<ArrayBuffer>(sourceUrl, {
      responseType: 'arraybuffer',
      timeout: 20_000,
      maxRedirects: 5,
      maxContentLength: MAX_FETCH_BYTES,
      maxBodyLength: MAX_FETCH_BYTES,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/pdf,*/*',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });
  } catch (error) {
    throw AppError.badRequest(fetchErrorMessage(error));
  }

  const buffer = Buffer.from(response.data);
  const contentType = String(response.headers['content-type'] ?? '').toLowerCase();

  if (contentType.includes('application/pdf') || looksLikePdf(buffer)) {
    return { kind: 'pdf', dataBase64: buffer.toString('base64'), sourceUrl };
  }

  const text = htmlToText(buffer.toString('utf8')).slice(0, MAX_TEXT_CHARS);
  if (text.length < MIN_USEFUL_TEXT_CHARS) {
    throw AppError.badRequest(
      'That page did not contain readable text. Some publishers block automated reads — download the PDF and upload it instead.'
    );
  }

  return { kind: 'text', text, sourceUrl };
}

/** Accepts a bare base64 payload or a `data:application/pdf;base64,...` URL. */
export function paperSourceFromUpload(pdfBase64: string): PaperSource {
  const payload = pdfBase64.replace(/^data:[^;]+;base64,/, '').trim();

  if (!payload) {
    throw AppError.validation('The uploaded PDF was empty.');
  }
  if (payload.length > MAX_PDF_BASE64_CHARS) {
    throw AppError.validation('Please upload a PDF smaller than 6 MB.');
  }

  const buffer = Buffer.from(payload, 'base64');
  if (buffer.byteLength === 0 || !looksLikePdf(buffer)) {
    throw AppError.validation('That file does not look like a PDF.');
  }

  return { kind: 'pdf', dataBase64: buffer.toString('base64') };
}
