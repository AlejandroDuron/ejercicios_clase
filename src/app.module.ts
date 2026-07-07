import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis-yet';

import { FlightsModule } from './flights/flights.module';
import { ReservationsModule } from './reservations/reservations.module';

import { Flight } from './flights/entities/flight.entity';
import { Seat } from './flights/entities/seat.entity';
import { Reservation } from './reservations/entities/reservation.entity';
import { Passenger } from './reservations/entities/passenger.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') ?? '5432'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [Flight, Seat, Reservation, Passenger],
        synchronize: true,
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get<string>('REDIS_HOST'),
        port: parseInt(config.get<string>('REDIS_PORT') ?? '6379'),
      }),
    }),

    FlightsModule,
    ReservationsModule,
  ],
})
export class AppModule {}