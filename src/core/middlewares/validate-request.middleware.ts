import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { type AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(httpStatus.BAD_REQUEST).json({ error: error.errors });
      }
    }

    return next();
  };
};
