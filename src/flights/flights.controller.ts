import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CacheKeys, TTL } from '../common/cache-keys';
import { FlightsService } from './flights.service';
import { Seat } from './entities/seat.entity';

@Controller('flights')
export class FlightsController {
  constructor(
    private readonly flightsService: FlightsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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

  @Get(':id/seats')
  async getSeatMap(@Param('id') flightId: string): Promise<Seat[]> {
    // La llave incluye el id del vuelo para aislar el mapa de asientos por vuelo.
    const cacheKey = CacheKeys.flightSeats(flightId);

    // Cache-aside: si existe en Redis, evitamos tocar la BD.
    const cachedSeats = await this.cacheManager.get<Seat[]>(cacheKey);
    if (cachedSeats) {
      return cachedSeats;
    }

    // Regla del ejercicio: no devolver asientos si el vuelo no existe.
    const flight = await this.flightsService.findFlightById(flightId);
    if (!flight) {
      throw new NotFoundException(`Vuelo con id ${flightId} no encontrado`);
    }

    const seats = await this.flightsService.getSeatsByFlightId(flightId);

    // Se guarda 30s en cache (constante en segundos convertida a ms al set).
    await this.cacheManager.set(cacheKey, seats, TTL.FLIGHT_SEATS * 1000);

    return seats;
  }
}
