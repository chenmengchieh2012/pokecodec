import * as zlib from 'zlib';

export interface MinimizedMove {
    id: number;
    pp: number;
    maxPP: number;
}

export interface RestoreData {
    secret: string;
    party: any[]; 
    lockId: number;
    timestamp: number;
}

export class RestoreCodeExtractor {
    public static extract(code: string): RestoreData {
        if (!code.startsWith('GZIP:')) {
            throw new Error('Invalid format. Code must start with "GZIP:"');
        }

        const base64Data = code.substring(5);
        const compressed = Buffer.from(base64Data, 'base64');
        const jsonString = zlib.gunzipSync(compressed).toString();
        const data = JSON.parse(jsonString);

        return data as RestoreData;
    }
}
