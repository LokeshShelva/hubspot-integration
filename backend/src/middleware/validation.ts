import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

/**
 * Generic validation middleware factory for Zod schemas
 */
export const validateSchema = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      
      // Replace the original body with validated and transformed data
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors into a user-friendly format
        const formattedErrors = error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.path.length > 0 ? err.path.reduce((obj: any, key: any) => obj?.[key], req.body) : req.body
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'The request data is invalid',
          details: formattedErrors
        });
        return;
      }
      
      console.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during validation'
      });
    }
  };
};

export default {
  validateSchema,
};
