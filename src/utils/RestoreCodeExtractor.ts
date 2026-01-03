import * as zlib from 'zlib';
import { BindPayload } from '../dataAccessObj/BindPayload';


export class RestoreCodeExtractor {
    public static extract(code: string): BindPayload {
        if (!code.startsWith('GZIP:')) {
            throw new Error('Invalid format. Code must start with "GZIP:"');
        }

        const base64Data = code.substring(5);
        const compressed = Buffer.from(base64Data, 'base64');
        const jsonString = zlib.gunzipSync(compressed).toString();
        const data = JSON.parse(jsonString);

        return data as BindPayload;
    }
}
