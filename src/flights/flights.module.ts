import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { Flight } from './entities/flight.entity';
import { Seat } from './entities/seat.entity';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flight, Seat]),
    ReservationsModule,
  ],
  controllers: [FlightsController],
  providers: [FlightsService],
  exports: [FlightsService],
})
export class FlightsModule {}
