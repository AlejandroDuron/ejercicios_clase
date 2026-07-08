import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Passenger } from './passenger.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  flight_id: string;

  @Column()
  seat_id: string;

  @Column()
  passenger_id: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ nullable: true })
  confirmation_code: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Passenger, (p) => p.reservations)
  @JoinColumn({ name: 'passenger_id' })
  passenger: Passenger;
}
