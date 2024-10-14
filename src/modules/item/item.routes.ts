import { validateRequest } from '@src/core/middlewares/validate-request.middleware';
import { Router } from 'express';
import ItemController from './item.controller';
import { createItemSchema } from './item.request';
import ItemService from './item.service';

const router = Router();

const itemService = new ItemService();
const itemController = new ItemController(itemService);

router.post(
  '/:listId',
  validateRequest(createItemSchema),
  itemController.create.bind(itemController),
);

export default router;