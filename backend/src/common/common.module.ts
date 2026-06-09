import { Module, Global } from '@nestjs/common';
import { BantulBoundaryService } from './services/bantul-boundary.service';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [BantulBoundaryService],
  exports: [BantulBoundaryService],
})
export class CommonModule {}
