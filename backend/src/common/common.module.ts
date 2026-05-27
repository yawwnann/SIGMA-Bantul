import { Module, Global } from '@nestjs/common';
import { BantulBoundaryService } from './services/bantul-boundary.service';

@Global()
@Module({
  providers: [BantulBoundaryService],
  exports: [BantulBoundaryService],
})
export class CommonModule {}
