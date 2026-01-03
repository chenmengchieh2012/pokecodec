import QRCode from 'qrcode';
import { gzip } from 'pako';
import { BindPayload } from '../../../src/dataAccessObj/BindPayload';

export class QRCodeHelper {
    /**
     * Compresses data, generates a hash, and creates a QR code Data URL.
     * Replicates the logic from the extension's QRCodeHelper.
     * @param payload The data object to encode.
     * @returns A Promise that resolves to the QR code Data URL.
     */
    public static async generateCompressedQRCode(payload: BindPayload): Promise<string> {
        // 1. Calculate Hash (CRC)
        const payloadString = JSON.stringify(payload);
        const hash = await this.sha256(payloadString);

        const finalData = {
            ...payload,
            hash: hash
        };

        // 2. Compress
        const finalJson = JSON.stringify(finalData);
        const compressed = gzip(finalJson);
        
        // 3. Convert to Base64
        const base64Data = this.uint8ArrayToBase64(compressed);

        // 4. Prefix with "GZIP:"
        const qrContent = `GZIP:${base64Data}`;

        // 5. Generate QR Code
        return await QRCode.toDataURL(qrContent);
    }

    private static async sha256(message: string): Promise<string> {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    private static uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}
