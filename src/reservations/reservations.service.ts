import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';

import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Passenger } from './entities/passenger.entity';
import { Seat, SeatStatus } from '../flights/entities/seat.entity';
import { Flight } from '../flights/entities/flight.entity';
import { CacheKeys, TTL } from '../common/cache-keys';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,

    @InjectRepository(Passenger)
    private readonly passengerRepo: Repository<Passenger>,

    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,

    @InjectRepository(Flight)
    private readonly flightRepo: Repository<Flight>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly dataSource: DataSource,
  ) {}

  async createReservation(
    flightId: string,
    createReservationDto: CreateReservationDto,
  ) {
    // 1. Validar que el vuelo existe
    const flight = await this.flightRepo.findOne({ where: { id: flightId } });
    if (!flight) {
      throw new NotFoundException(`Vuelo con id ${flightId} no encontrado`);
    }

    // 2. Validar que el asiento existe y pertenece al vuelo
    const seat = await this.seatRepo.findOne({
      where: { id: createReservationDto.seat_id, flight_id: flightId },
    });
    if (!seat) {
      throw new NotFoundException(
        `Asiento con id ${createReservationDto.seat_id} no encontrado en vuelo ${flightId}`,
      );
    }

    // 3. Usar transacción para validar disponibilidad y evitar race conditions
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // 3a. Validar que el asiento está disponible (con lock pesimista)
      const seatInTransaction = await queryRunner.manager.findOne(Seat, {
        where: { id: createReservationDto.seat_id, flight_id: flightId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seatInTransaction) {
        throw new NotFoundException('El asiento ya no existe');
      }

      if (seatInTransaction.status !== SeatStatus.AVAILABLE) {
        throw new ConflictException(
          `El asiento no está disponible. Estado actual: ${seatInTransaction.status}`,
        );
      }

      // 3b. Cambiar estado del asiento a BOOKED
      seatInTransaction.status = SeatStatus.BOOKED;
      await queryRunner.manager.save(seatInTransaction);

      // 4. Buscar o crear el pasajero
      let passenger = await queryRunner.manager.findOne(Passenger, {
        where: { email: createReservationDto.passenger.email },
      });

      if (!passenger) {
        passenger = queryRunner.manager.create(Passenger, {
          name: createReservationDto.passenger.name,
          email: createReservationDto.passenger.email,
          document_id: createReservationDto.passenger.document_id,
        });
        passenger = await queryRunner.manager.save(passenger);
      }

      // 5. Crear la reservación con estado PENDING
      const reservation = queryRunner.manager.create(Reservation, {
        flight_id: flightId,
        seat_id: createReservationDto.seat_id,
        passenger_id: passenger.id,
        status: ReservationStatus.PENDING,
      });

      const savedReservation = await queryRunner.manager.save(reservation);

      // Commit de la transacción
      await queryRunner.commitTransaction();

      // 6. Invalidar caches después de confirmar la transacción
      // Invalida el cache de asientos del vuelo
      const seatsCacheKey = CacheKeys.flightSeats(flightId);
      await this.cacheManager.del(seatsCacheKey);

      // Invalida el cache de búsqueda de vuelos (todas las búsquedas que incluyan este vuelo)
      // En este caso, invalidamos patrones pero TypeORM cache-manager no soporta wildcards
      // Se podría implementar con Redis KEYS, pero por simplicidad dejamos que expire

      return savedReservation;
    } catch (error) {
      // Rollback automático en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmReservation(id: string) {
    // Primero se valida contra BD; la cache no es fuente de verdad.
    const reservation = await this.reservationRepo.findOne({ where: { id } });

    if (!reservation) {
      throw new NotFoundException('La reservación no existe');
    }
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        "Solo las reservaciones en estado 'pending' pueden ser confirmadas",
      );
    }

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmation_code = this.generateConfirmationCode();
    const updatedReservation = await this.reservationRepo.save(reservation);
    const cacheKey = CacheKeys.reservation(id);

    // Se refresca la cache de la reservacion con el estado confirmado.
    await this.cacheManager.set(cacheKey, updatedReservation, TTL.RESERVATION);

    return updatedReservation;
  }

  private generateConfirmationCode(): string {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CONF-${randomStr}`;
  }
}
