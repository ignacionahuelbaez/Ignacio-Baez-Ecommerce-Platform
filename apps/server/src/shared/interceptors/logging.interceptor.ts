import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// Minimal structured request logging: one JSON-shaped line per request via Nest's
// built-in Logger, enough to trace what happened in a single instance's logs
// without pulling in a dedicated logging stack.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, originalUrl } = request;
    const userId = request.user?.id;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(method, originalUrl, response.statusCode, startedAt, userId),
        error: (err) =>
          this.log(method, originalUrl, err.status || 500, startedAt, userId, err.message),
      }),
    );
  }

  private log(
    method: string,
    path: string,
    statusCode: number,
    startedAt: number,
    userId?: string,
    error?: string,
  ) {
    const durationMs = Date.now() - startedAt;
    this.logger.log(
      JSON.stringify({ method, path, statusCode, durationMs, userId: userId ?? null, error }),
    );
  }
}
