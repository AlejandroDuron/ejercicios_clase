import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './entities/reservation.entity';
import { Passenger } from './entities/passenger.entity';
import { Seat } from '../flights/entities/seat.entity';
import { Flight } from '../flights/entities/flight.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Passenger, Seat, Flight])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
