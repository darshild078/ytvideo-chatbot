import { Router } from 'express';
import { validateRequest, videoAnalyzeSchema } from '../middleware/validateRequest.js';
import * as videoController from '../controllers/video.controller.js';

const router = Router();

router.post('/analyze', validateRequest(videoAnalyzeSchema), videoController.analyzeVideo);
router.get('/:videoId/status', videoController.getVideoStatus);
router.get('/:videoId/transcript', videoController.getTranscript);

export default router;
