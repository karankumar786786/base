import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

function isPathOptional(schema: any, path: (string | number)[]): boolean {
  if (!schema) return false;

  let current = schema;
  
  const unwrap = (val: any): any => {
    while (val && val._def) {
      const typeName = val._def.typeName;
      if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
        val = val._def.innerType;
      } else if (typeName === 'ZodEffects') {
        val = val._def.schema;
      } else {
        break;
      }
    }
    return val;
  };

  current = unwrap(current);

  if (path.length === 0) {
    return schema._def?.typeName === 'ZodOptional' || schema._def?.typeName === 'ZodNullable' || schema._def?.typeName === 'ZodDefault';
  }

  const [head, ...tail] = path;

  if (current && current._def && current._def.typeName === 'ZodObject') {
    const fieldSchema = current._def.shape()[head];
    if (!fieldSchema) return false;

    const isOptionalField = 
      fieldSchema._def?.typeName === 'ZodOptional' || 
      fieldSchema._def?.typeName === 'ZodNullable' ||
      fieldSchema._def?.typeName === 'ZodDefault';

    if (tail.length === 0) {
      return isOptionalField;
    }
    return isPathOptional(fieldSchema, tail);
  }

  return false;
}

function getValueAtPath(obj: any, path: (string | number)[]): any {
  if (obj === null || obj === undefined) return undefined;
  let current = obj;
  for (const part of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function getOptionalPaths(schema: any, value: any, currentPath: (string | number)[] = []): Array<{ path: string; type: string }> {
  if (!schema) return [];

  let current = schema;
  let isOptional = false;
  let isNullable = false;
  let isDefault = false;
  let expectedType: string | undefined;

  const unwrap = (val: any): any => {
    while (val && val._def) {
      const typeName = val._def.typeName;
      if (typeName === 'ZodOptional') {
        isOptional = true;
        val = val._def.innerType;
      } else if (typeName === 'ZodNullable') {
        isNullable = true;
        val = val._def.innerType;
      } else if (typeName === 'ZodDefault') {
        isDefault = true;
        val = val._def.innerType;
      } else if (typeName === 'ZodEffects') {
        val = val._def.schema;
      } else {
        break;
      }
    }
    return val;
  };

  current = unwrap(current);

  if (current && current._def) {
    const typeName = current._def.typeName;
    if (typeName === 'ZodString') expectedType = 'string';
    else if (typeName === 'ZodNumber') expectedType = 'number';
    else if (typeName === 'ZodBoolean') expectedType = 'boolean';
    else if (typeName === 'ZodObject') expectedType = 'object';
    else if (typeName === 'ZodArray') expectedType = 'array';
    else if (typeName === 'ZodEnum') expectedType = 'enum';
    else expectedType = typeName.replace(/^Zod/, '').toLowerCase();
  }

  const val = getValueAtPath(value, currentPath);

  if ((isOptional || isDefault) && val === undefined) {
    return [{
      path: currentPath.join('.'),
      type: expectedType || 'any'
    }];
  }

  if (current && current._def && current._def.typeName === 'ZodObject') {
    const shape = current._def.shape();
    const result: Array<{ path: string; type: string }> = [];
    for (const key of Object.keys(shape)) {
      result.push(...getOptionalPaths(shape[key], value, [...currentPath, key]));
    }
    return result;
  }

  return [];
}

type ZodPipeOptions = {
  body?: ZodSchema;
  query?: ZodSchema;
  param?: ZodSchema;
};

export const ZodPipe = (options: ZodPipeOptions) => {
  @Injectable()
  class ZodValidationPipe implements PipeTransform {
    async transform(value: unknown, metadata: ArgumentMetadata) {
      let schema: ZodSchema | undefined;
      switch (metadata.type) {
        case 'body':
          schema = options.body;
          break;

        case 'query':
          schema = options.query;
          break;

        case 'param':
          schema = options.param;
          break;

        default:
          return value;
      }

      if (!schema) {
        return value;
      }

      try {
        return await schema.parseAsync(value);
      } catch (error) {
        if (
          error instanceof ZodError ||
          (error && typeof error === 'object' && (error as any).name === 'ZodError')
        ) {
          throw new BadRequestException({
            message: 'Validation failed',
            type: metadata.type,
            errors: [
              ...(error as ZodError).issues.map((issue) => {
                const isOptional = isPathOptional(schema, issue.path);
                let message = issue.message;
                if (isOptional) {
                  if (issue.message === 'Required' || issue.code === 'invalid_type') {
                    message = 'optional';
                  }
                } else {
                  if (
                    issue.message === 'Required' ||
                    (issue.code === 'invalid_type' &&
                      ((issue as any).received === 'undefined' || (issue as any).received === 'null'))
                  ) {
                    message = 'required';
                  }
                }

                const errObj: any = {
                  path: issue.path.join('.'),
                  message,
                };
                if ('expected' in issue) {
                  errObj.type = (issue as any).expected;
                }
                if ('options' in issue) {
                  errObj.options = (issue as any).options;
                }
                return errObj;
              }),
              ...getOptionalPaths(schema, value).map((opt) => ({
                path: opt.path,
                message: 'optional',
                type: opt.type
              }))
            ],
          });
        }

        throw error;
      }
    }
  }

  return ZodValidationPipe;
};