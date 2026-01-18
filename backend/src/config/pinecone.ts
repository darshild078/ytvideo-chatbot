import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export async function initializePinecone(): Promise<Pinecone> {
    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
        throw new Error('PINECONE_API_KEY environment variable is not set');
    }

    try {
        pineconeClient = new Pinecone({ apiKey });
        console.log('✅ Connected to Pinecone');
        return pineconeClient;
    } catch (error) {
        console.error('Failed to initialize Pinecone:', error);
        throw error;
    }
}

export function getPineconeClient(): Pinecone {
    if (!pineconeClient) {
        throw new Error('Pinecone client not initialized. Call initializePinecone first.');
    }
    return pineconeClient;
}

export function getPineconeIndex() {
    const indexName = process.env.PINECONE_INDEX_NAME || 'youtube-transcripts';
    return getPineconeClient().index(indexName);
}
