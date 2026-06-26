import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : null;

        // Extract error details — supports structured responses from ZodPipe
        let error: unknown;
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const responseObj = exceptionResponse as Record<string, unknown>;
            error = responseObj.errors ?? responseObj.message ?? 'Internal server error';
        } else if (typeof exceptionResponse === 'string') {
            error = exceptionResponse;
        } else if (exception instanceof Error) {
            error = exception.message;
        } else {
            error = 'Internal server error';
        }

        res.status(status).json({
            success: false,
            error,
            timestamp: new Date().toISOString(),
        });
    }
}
