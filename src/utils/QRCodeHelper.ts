import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { QrcodeGenerator } from './QrcodeGenerator';

export class QRCodeHelper {
    /**
     * Compresses data, generates a hash, and creates a QR code Data URL.
     * @param payload The data object to encode.
     * @returns A Promise that resolves to the QR code Data URL.
     */
    public static async generateCompressedQRCode(payload: any): Promise<string> {
        // 1. Calculate Hash (CRC)
        const payloadString = JSON.stringify(payload);
        const hash = crypto.createHash('sha256').update(payloadString).digest('hex');

        const finalData = {
            ...payload,
            hash: hash
        };

        // 2. Compress
        const finalJson = JSON.stringify(finalData);
        const compressed = zlib.gzipSync(finalJson);
        const base64Data = compressed.toString('base64');

        // 3. Prefix with "GZIP:"
        const qrContent = `GZIP:${base64Data}`;

        // 4. Check Capacity (Log only)
        // QR Code Capacity Check (Version 40, Byte Mode, Level M ~= 2331 chars)
        const maxCapacity = 2331;
        console.log(`[QRCodeHelper] Payload Size: ${qrContent.length} chars. Usage: ~${((qrContent.length / maxCapacity) * 100).toFixed(1)}% of max limit (Level M).`);

        // 5. Generate QR Code
        return await QrcodeGenerator.generate(qrContent);
    }
}
