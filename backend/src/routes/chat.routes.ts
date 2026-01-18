import { Router } from 'express';
import { validateRequest, chatQuerySchema } from '../middleware/validateRequest.js';
import * as chatController from '../controllers/chat.controller.js';

const router = Router();

router.post('/query', validateRequest(chatQuerySchema), chatController.handleQuery);
router.get('/history/:videoId/:sessionId', chatController.getChatHistory);

export default router;
