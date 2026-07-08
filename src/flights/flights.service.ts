import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Flight } from './entities/flight.entity';
import { Seat } from './entities/seat.entity';
import { CacheKeys, TTL } from '../common/cache-keys';

@Injectable()
export class FlightsService {
  constructor(
    @InjectRepository(Flight)
    private flightRepo: Repository<Flight>,
    @InjectRepository(Seat)
    private seatRepo: Repository<Seat>,
    @Inject(CACHE_MANAGER)
    private cache: Cache,
  ) {}

  findFlightById(flightId: string) {
    // Validacion rapida de existencia para responder 404 desde el controlador.
    return this.flightRepo.findOne({ where: { id: flightId } });
  }

  getSeatsByFlightId(flightId: string) {
    // Se ordena por numero de asiento para una respuesta estable del mapa.
    return this.seatRepo.find({
      where: { flight_id: flightId },
      order: { seat_number: 'ASC' },
    });
  }

  async searchFlights(origin: string, destination: string, date: string) {
    const key = CacheKeys.flightSearch(origin, destination, date);

    // 1. Buscar en caché
    const cached = await this.cache.get<Flight[]>(key);
    if (cached) {
      console.log(`[CACHE HIT] ${key}`);
      return cached;
    }

    console.log(`[CACHE MISS] ${key} — consultando BD`);

    // 2. Consultar BD
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const flights = await this.flightRepo
      .createQueryBuilder('flight')
      .where('flight.origin = :origin', { origin })
      .andWhere('flight.destination = :destination', { destination })
      .andWhere('flight.departure_time BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getMany();

    // TTL definido en segundos y convertido a ms para el adapter actual.
    await this.cache.set(key, flights, TTL.FLIGHT_SEARCH * 1000);

    console.log(`[CACHE SET] ${key} por ${TTL.FLIGHT_SEARCH}s`);

    return flights;
  }
}
