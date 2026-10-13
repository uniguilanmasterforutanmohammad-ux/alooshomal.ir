import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'خطای داخلی سرور' };

    const message =
      typeof payload === 'string'
        ? payload
        : (payload as { message?: string | string[] }).message ?? 'خطای نامشخص';

    // Optional machine-readable code (e.g. FULLNAME_REQUIRED) for clients that
    // must branch on the failure reason rather than the message text.
    const code =
      typeof payload === 'object' && payload !== null && 'code' in payload
        ? (payload as { code?: string }).code
        : undefined;

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
