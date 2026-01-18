import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
    formattedTime?: string;
    confidence?: number;
    createdAt: Date;
}

export interface IChatHistory extends Document {
    videoId: string;
    sessionId: string;
    messages: IChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
    {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Number },
        formattedTime: { type: String },
        confidence: { type: Number },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const chatHistorySchema = new Schema<IChatHistory>(
    {
        videoId: { type: String, required: true, index: true },
        sessionId: { type: String, required: true, index: true },
        messages: { type: [chatMessageSchema], default: [] },
    },
    { timestamps: true }
);

chatHistorySchema.index({ videoId: 1, sessionId: 1 });

export const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', chatHistorySchema);
