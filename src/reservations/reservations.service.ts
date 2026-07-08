import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  Inject 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';


import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CacheKeys, TTL } from '../common/cache-keys';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async confirmReservation(id: string) {
    const reservation = await this.reservationRepo.findOne({ where: { id } });

    if (!reservation) {
      throw new NotFoundException('La reservación no existe');
    }
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Solo las reservaciones en estado "pending" pueden ser confirmadas');
    }

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmation_code = this.generateConfirmationCode();
    const updatedReservation = await this.reservationRepo.save(reservation);
    const cacheKey = CacheKeys.reservation(id);

    await this.cacheManager.set(cacheKey, updatedReservation, TTL.RESERVATION);

    return updatedReservation;
  }

  private generateConfirmationCode(): string {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CONF-${randomStr}`;
  }
}