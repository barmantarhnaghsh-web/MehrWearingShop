import { AnyZodObject, ZodEffects, ZodTypeAny } from 'zod';
import { RequestHandler } from 'express';

type Schema = AnyZodObject | ZodEffects<ZodTypeAny>;

/**
 * Validate & parse request parts with Zod.
 * Parsed values replace the originals (req.body / req.query / req.params),
 * so downstream code never sees untrusted input.
 */
export function validate(schemas: { body?: Schema; query?: Schema; params?: Schema }): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.assign(req.query, parsed);
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}
