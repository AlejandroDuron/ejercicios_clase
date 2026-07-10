import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { FlightsService } from './flights.service';
import { ReservationsService } from '../reservations/reservations.service';
import { Seat } from './entities/seat.entity';
import { CreateReservationDto } from '../reservations/dto/create-reservation.dto';

@Controller('flights')
export class FlightsController {
  constructor(
    private readonly flightsService: FlightsService,
    private readonly reservationsService: ReservationsService,
  ) {}

  // Ejercicio 1: GET /flights?origin=SAL&destination=MIA&date=2026-07-10
  @Get()
  searchFlights(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('date') date: string,
  ) {
    return this.flightsService.searchFlights(origin, destination, date);
  }

  // Ejercicio 2: GET /flights/:id/seats
  @Get(':id/seats')
  async getSeatMap(@Param('id') flightId: string): Promise<Seat[]> {
    return this.flightsService.getSeatMap(flightId);
  }

  // Ejercicio 3: POST /flights/:id/reservations
  @Post(':id/reservations')
  async createReservation(
    @Param('id') flightId: string,
    @Body() createReservationDto: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(
      flightId,
      createReservationDto,
    );
  }
}
