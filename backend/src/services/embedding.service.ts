import axios from 'axios';
import { logger } from '../utils/logger.js';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Create axios instance with longer timeout for large batches
const pythonClient = axios.create({
    baseURL: PYTHON_SERVICE_URL,
    timeout: 300000, // 5 minutes timeout for embedding generation
});

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        logger.info(`Generating embeddings for ${texts.length} texts`);

        const response = await pythonClient.post('/generate-embeddings', {
            texts,
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to generate embeddings');
        }

        const embeddings: number[][] = response.data.embeddings;
        logger.info(`Generated ${embeddings.length} embeddings of dimension ${response.data.dimensions}`);

        return embeddings;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Embedding generation failed: ${error.message}`);
        }
        throw error;
    }
}

export async function generateSingleEmbedding(text: string): Promise<number[]> {
    const embeddings = await generateEmbeddings([text]);
    return embeddings[0];
}
