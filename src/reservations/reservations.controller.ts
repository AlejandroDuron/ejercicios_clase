import { Controller, Patch, Param } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Patch(':id/confirm')
  async confirmReservation(@Param('id') id: string) {
    return this.reservationsService.confirmReservation(id);
  }
}

