import * as QRCode from 'qrcode';

export class QrcodeGenerator {
    /**
     * Generates a QR code Data URL from a string
     * @param data The data to encode
     * @returns A Promise that resolves to the Data URL
     */
    public static async generate(data: string): Promise<string> {
        try {
            return await QRCode.toDataURL(data, {
                errorCorrectionLevel: 'M',
                margin: 4,
                width: 600
            });
        } catch (err) {
            console.error('[QrcodeGenerator] Error generating QR code:', err);
            throw err;
        }
    }

    /**
     * Generates a QR code Data URL from an object (JSON stringified)
     * @param data The object to encode
     * @returns A Promise that resolves to the Data URL
     */
    public static async generateFromObject(data: any): Promise<string> {
        return this.generate(JSON.stringify(data));
    }
}
