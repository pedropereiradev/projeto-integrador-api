import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import type { CreateItemSchema } from './item.request';
import type ItemService from './item.service';

class ItemController {
  private _service: ItemService;

  constructor(private itemService: ItemService) {
    this._service = itemService;
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { listId } = req.params;
      const { description, name, price, quantity } =
        req.body as CreateItemSchema;

      const response = await this._service.create(
        { description, name, price, quantity },
        listId,
      );

      return res.status(httpStatus.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  }

  async checkItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId } = req.params;

      const response = await this._service.checkItem(itemId);

      return res.status(httpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId } = req.params;

      await this._service.delete(itemId);

      return res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId } = req.params;
      const { description, name, price, quantity } =
        req.body as CreateItemSchema;

      const response = await this._service.update(
        { description, name, price, quantity },
        itemId,
      );

      return res.status(httpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default ItemController;
