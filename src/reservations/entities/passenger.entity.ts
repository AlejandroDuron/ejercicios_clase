import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Reservation } from './reservation.entity';

@Entity('passengers')
export class Passenger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  document_id: string;

  @OneToMany(() => Reservation, (r) => r.passenger)
  reservations: Reservation[];
}
