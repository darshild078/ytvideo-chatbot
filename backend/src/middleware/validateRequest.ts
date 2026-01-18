import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateRequest(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
}

export const videoAnalyzeSchema = z.object({
    url: z.string().url().refine(
        (url) => url.includes('youtube.com') || url.includes('youtu.be'),
        { message: 'Must be a valid YouTube URL' }
    ),
});

export const chatQuerySchema = z.object({
    videoId: z.string().min(1, 'Video ID is required'),
    question: z.string().min(1, 'Question is required').max(500, 'Question too long'),
    sessionId: z.string().optional(),
});
