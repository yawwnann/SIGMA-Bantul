import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MonitoringService } from '../../monitoring/monitoring.service';

@Injectable()
export class RequestTrackingInterceptor implements NestInterceptor {
  constructor(private monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;

        // Track request asynchronously (don't block response)
        this.monitoringService.trackRequest().catch((err) => {
          console.error('Error tracking request:', err);
        });
      }),
    );
  }
}
