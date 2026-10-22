type OutputEntry = {
    headers: Record<string, string>;
    filename?: string;
    name?: string;
    type?: string;
    data: Uint8Array<ArrayBuffer>;
};
export declare function parse(multipartBodyBuffer: Buffer, boundary: string): OutputEntry[];
export declare function generateBoundary(prefix?: string): string;
export declare function encode(data: Record<string, (string | File)[]>, boundary?: string): Promise<Buffer>;
export {};
