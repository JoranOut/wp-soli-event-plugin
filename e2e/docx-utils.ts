/**
 * Minimal ZIP reader for .docx assertions — enough to pull one entry
 * (word/document.xml) out of a downloaded document without adding a
 * dependency. Walks the central directory and inflates the entry with zlib.
 */
import { inflateRawSync } from 'zlib';

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;

export function readZipEntry(buf: Buffer, entryName: string): string | null {
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
        if (buf.readUInt32LE(i) === EOCD_SIG) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) {
        throw new Error('Not a zip file: end-of-central-directory not found');
    }

    const entryCount = buf.readUInt16LE(eocd + 10);
    let offset = buf.readUInt32LE(eocd + 16);

    for (let i = 0; i < entryCount; i++) {
        if (buf.readUInt32LE(offset) !== CENTRAL_SIG) {
            throw new Error('Corrupt zip: bad central directory header');
        }
        const method = buf.readUInt16LE(offset + 10);
        const compressedSize = buf.readUInt32LE(offset + 20);
        const nameLength = buf.readUInt16LE(offset + 28);
        const extraLength = buf.readUInt16LE(offset + 30);
        const commentLength = buf.readUInt16LE(offset + 32);
        const localOffset = buf.readUInt32LE(offset + 42);
        const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength);

        if (name === entryName) {
            const localNameLength = buf.readUInt16LE(localOffset + 26);
            const localExtraLength = buf.readUInt16LE(localOffset + 28);
            const dataStart = localOffset + 30 + localNameLength + localExtraLength;
            const data = buf.subarray(dataStart, dataStart + compressedSize);
            return method === 0 ? data.toString('utf8') : inflateRawSync(data).toString('utf8');
        }
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return null;
}
