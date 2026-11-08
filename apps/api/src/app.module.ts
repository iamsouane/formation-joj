import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { TripsModule } from './modules/trips/trips.module';

@Module({
  imports: [CoreModule, TripsModule],
})
export class AppModule {}
