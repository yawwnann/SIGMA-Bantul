import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestTrackingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next): Observable<any> {
    const startTime = Date.now();
    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        // Simple logging instead of MonitoringService
        if (responseTime > 1000) {
          console.log(`[RequestTracking] Slow request: ${responseTime}ms`);
        }
      }),
    );
  }
}
