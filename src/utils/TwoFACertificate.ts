import * as crypto from 'crypto';

export class TwoFACertificate {
    private static readonly DIGITS = 6;
    private static readonly PERIOD = 30;

    /**
     * Generates a random base32 secret
     */
    public static generateSecret(length: number = 20): string {
        const buffer = crypto.randomBytes(length);
        return this.base32Encode(buffer).replace(/=/g, '');
    }

    /**
     * Verifies a TOTP token
     * @param secret The base32 encoded secret
     * @param token The token to verify
     * @param window The number of windows to check (default 1, meaning check current, previous, and next 30s)
     * @returns The counter (time step) if verified, or -1 if failed
     */
    public static verifyToken(secret: string, token: string, window: number = 1): number {
        if (!secret || !token) {
            return -1;
        }
        
        const currentCounter = Math.floor(Date.now() / 1000 / this.PERIOD);
        
        // Check current time and surrounding windows
        for (let i = -window; i <= window; i++) {
            const counter = currentCounter + i;
            const generatedToken = this.generateToken(secret, counter);
            if (generatedToken === token) {
                return counter;
            }
        }
        return -1;
    }

    /**
     * Verifies a TOTP token and checks for replay attacks
     * @param secret The base32 encoded secret
     * @param token The token to verify
     * @param lastVerifiedCounter The last successfully verified counter
     * @param window The number of windows to check
     * @returns Object containing validity and the new counter (if valid)
     */
    public static verifyTokenWithState(
        secret: string, 
        token: string, 
        lastVerifiedCounter: number, 
        window: number = 1
    ): { isValid: boolean, newCounter: number } {
        const verifiedCounter = this.verifyToken(secret, token, window);
        
        if (verifiedCounter === -1) {
            return { isValid: false, newCounter: lastVerifiedCounter };
        }

        if (verifiedCounter <= lastVerifiedCounter) {
            return { isValid: false, newCounter: lastVerifiedCounter };
        }

        return { isValid: true, newCounter: verifiedCounter };
    }

    /**
     * Generates a TOTP token for a specific counter (time step)
     */
    public static generateToken(secret: string, counter: number): string {
        const decodedSecret = this.base32Decode(secret);
        const buffer = Buffer.alloc(8);
        for (let i = 7; i >= 0; i--) {
            buffer[i] = counter & 0xff;
            counter = counter >> 8;
        }

        const hmac = crypto.createHmac('sha1', decodedSecret);
        hmac.update(buffer);
        const digest = hmac.digest();

        const offset = digest[digest.length - 1] & 0xf;
        const code = ((digest[offset] & 0x7f) << 24) |
            ((digest[offset + 1] & 0xff) << 16) |
            ((digest[offset + 2] & 0xff) << 8) |
            (digest[offset + 3] & 0xff);

        const strCode = (code % Math.pow(10, this.DIGITS)).toString();
        return strCode.padStart(this.DIGITS, '0');
    }

    // Simple Base32 implementation (RFC 4648)
    private static base32Encode(buffer: Buffer): string {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let output = '';
        let bits = 0;
        let value = 0;

        for (let i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;
            while (bits >= 5) {
                output += alphabet[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }
        if (bits > 0) {
            output += alphabet[(value << (5 - bits)) & 31];
        }
        return output;
    }

    private static base32Decode(encoded: string): Buffer {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
        const length = Math.floor(cleaned.length * 5 / 8);
        const buffer = Buffer.alloc(length);
        
        let bits = 0;
        let value = 0;
        let index = 0;

        for (let i = 0; i < cleaned.length; i++) {
            const char = cleaned[i];
            const val = alphabet.indexOf(char);
            value = (value << 5) | val;
            bits += 5;
            if (bits >= 8) {
                buffer[index++] = (value >>> (bits - 8)) & 0xff;
                bits -= 8;
            }
        }
        return buffer;
    }
}
