import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        mongoose.connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

export async function disconnectDatabase(): Promise<void> {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
}
