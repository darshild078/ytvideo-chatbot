import Groq from 'groq-sdk';

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
    if (!groqClient) {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error('GROQ_API_KEY environment variable is not set');
        }

        groqClient = new Groq({ apiKey });
    }

    return groqClient;
}

export const MODELS = {
    STAGE1_FILTER: 'llama-3.1-8b-instant',
    STAGE2_GENERATE: 'llama-3.3-70b-versatile',
} as const;
