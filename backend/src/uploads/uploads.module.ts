import { Module } from '@nestjs/common';
import { EventImageService } from './event-image.service';

@Module({
  providers: [EventImageService],
  exports: [EventImageService],
})
export class UploadsModule {}
