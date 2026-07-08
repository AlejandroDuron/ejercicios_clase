import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Seat } from './seat.entity';

@Entity('flights')
export class Flight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  origin: string;

  @Column()
  destination: string;

  @Column({ type: 'timestamptz' })
  departure_time: Date;

  @Column({ type: 'timestamptz' })
  arrival_time: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 'scheduled' })
  status: string;

  @OneToMany(() => Seat, (seat) => seat.flight, { cascade: true })
  seats: Seat[];
}
