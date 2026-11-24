/**
 * Sniffs the real content type of a raw upload from its magic bytes.
 *
 * `file.mimetype` is supplied by the client and can be forged, so a document
 * upload must be checked against its actual header before it is stored and
 * served back with that content type.
 */
export type SniffedDocumentType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function sniffDocumentType(buffer: Buffer): SniffedDocumentType | null {
  if (buffer.length >= 4) {
    const head = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('latin1');
    if (head.includes('%PDF-')) return 'application/pdf';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
