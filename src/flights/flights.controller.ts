import { Controller, Get, Query } from '@nestjs/common';
import { FlightsService } from './flights.service';

@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  // Ejercicio 1: GET /flights?origin=SAL&destination=MIA&date=2026-07-10
  @Get()
  searchFlights(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('date') date: string,
  ) {
    return this.flightsService.searchFlights(origin, destination, date);
  }
}