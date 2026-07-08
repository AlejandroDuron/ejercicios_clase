import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Flight } from './flight.entity';

export enum SeatStatus {
  AVAILABLE = 'available',
  HELD = 'held',
  BOOKED = 'booked',
}

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  flight_id: string;

  @Column()
  seat_number: string;

  @Column()
  class: string;

  @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
  status: SeatStatus;

  @ManyToOne(() => Flight, (flight) => flight.seats)
  @JoinColumn({ name: 'flight_id' })
  flight: Flight;
}
