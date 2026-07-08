import { CacheModule } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { FlightsService } from '../src/flights/flights.service';
import { TTL } from '../src/common/cache-keys';
import { Flight } from '../src/flights/entities/flight.entity';
import { Seat } from '../src/flights/entities/seat.entity';

describe('Flights cache integration (Redis)', () => {
  let moduleRef: TestingModule;
  let flightsService: FlightsService;
  let redis: Redis;

  const mockFlights = [
    {
      id: 'flight-1',
      origin: 'SAL',
      destination: 'MIA',
      departure_time: new Date('2026-07-10T10:00:00.000Z'),
      arrival_time: new Date('2026-07-10T14:00:00.000Z'),
      price: 199.99,
      status: 'scheduled',
    },
  ];

  const getMany = jest.fn().mockResolvedValue(mockFlights);
  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany,
  };

  const flightRepoMock = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    findOne: jest.fn(),
  };

  const seatRepoMock = {
    find: jest.fn(),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          useFactory: async () => {
            // En Jest (CommonJS) usamos require para evitar el error de import dinamico.
            const { createKeyv } = require('@keyv/redis');
            return {
              stores: [createKeyv('redis://localhost:6379')],
            };
          },
        }),
      ],
      providers: [
        FlightsService,
        {
          provide: getRepositoryToken(Flight),
          useValue: flightRepoMock,
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: seatRepoMock,
        },
      ],
    }).compile();

    flightsService = moduleRef.get(FlightsService);
    redis = new Redis('redis://localhost:6379');
    await redis.ping();
  });

  beforeEach(async () => {
    await redis.flushdb();
    jest.clearAllMocks();
    flightRepoMock.createQueryBuilder.mockReturnValue(queryBuilder);
    getMany.mockResolvedValue(mockFlights);
  });

  afterAll(async () => {
    if (redis) {
      await redis.quit();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('cachea flight search en Redis y evita segunda consulta a BD', async () => {
    const origin = 'SAL';
    const destination = 'MIA';
    const date = '2026-07-10';

    // Primera llamada: miss en cache, consulta BD y escribe en Redis.
    const first = await flightsService.searchFlights(origin, destination, date);

    // Segunda llamada: hit en cache, no debe volver a consultar BD.
    const second = await flightsService.searchFlights(origin, destination, date);

    expect(first).toEqual(mockFlights);
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(mockFlights[0].id);
    expect(second[0].origin).toBe('SAL');
    expect(second[0].destination).toBe('MIA');
    expect(typeof second[0].departure_time).toBe('string');
    expect(flightRepoMock.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledTimes(1);

    // Verifica que se genero al menos una llave en Redis.
    const keys = await redis.keys('*');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('expira la cache y vuelve a consultar BD cuando vence el TTL', async () => {
    const origin = 'SAL';
    const destination = 'MIA';
    const date = '2026-07-10';
    const originalTtl = TTL.FLIGHT_SEARCH;

    // Reducimos temporalmente el TTL a 1 segundo para validar expiracion real.
    TTL.FLIGHT_SEARCH = 1;

    try {
      await flightsService.searchFlights(origin, destination, date);
      await flightsService.searchFlights(origin, destination, date);

      expect(flightRepoMock.createQueryBuilder).toHaveBeenCalledTimes(1);

      await new Promise((resolve) => setTimeout(resolve, 1300));

      await flightsService.searchFlights(origin, destination, date);

      // Tras vencer el TTL, se debe volver a consultar la BD.
      expect(flightRepoMock.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(getMany).toHaveBeenCalledTimes(2);
    } finally {
      TTL.FLIGHT_SEARCH = originalTtl;
    }
  });
});
