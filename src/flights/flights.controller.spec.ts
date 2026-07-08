import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CacheKeys, TTL } from '../common/cache-keys';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';

describe('FlightsController - Seat Map Cache', () => {
  let controller: FlightsController;
  let flightsService: any;
  let cacheManager: any;

  beforeEach(async () => {
    flightsService = {
      searchFlights: jest.fn(),
      findFlightById: jest.fn(),
      getSeatsByFlightId: jest.fn(),
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlightsController],
      providers: [
        {
          provide: FlightsService,
          useValue: flightsService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    controller = module.get<FlightsController>(FlightsController);
  });

  it('returns seats from cache on cache hit', async () => {
    const flightId = 'flight-123';
    const key = CacheKeys.flightSeats(flightId);
    const cachedSeats = [
      { id: 'seat-1', seat_number: '1A', status: 'available' },
    ];

    cacheManager.get.mockResolvedValue(cachedSeats);

    const result = await controller.getSeatMap(flightId);

    expect(cacheManager.get).toHaveBeenCalledWith(key);
    expect(result).toEqual(cachedSeats);
    expect(flightsService.findFlightById).not.toHaveBeenCalled();
    expect(flightsService.getSeatsByFlightId).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('throws 404 when flight does not exist and does not cache error response', async () => {
    const flightId = 'missing-flight';

    cacheManager.get.mockResolvedValue(undefined);
    flightsService.findFlightById.mockResolvedValue(null);

    await expect(controller.getSeatMap(flightId)).rejects.toThrow(
      NotFoundException,
    );

    expect(flightsService.getSeatsByFlightId).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('queries DB on cache miss and caches seats for 30 seconds', async () => {
    const flightId = 'flight-456';
    const key = CacheKeys.flightSeats(flightId);
    const seats = [
      { id: 'seat-2', seat_number: '5A', status: 'available' },
      { id: 'seat-3', seat_number: '5B', status: 'held' },
    ];

    cacheManager.get.mockResolvedValue(undefined);
    flightsService.findFlightById.mockResolvedValue({ id: flightId });
    flightsService.getSeatsByFlightId.mockResolvedValue(seats);

    const result = await controller.getSeatMap(flightId);

    expect(cacheManager.get).toHaveBeenCalledWith(key);
    expect(flightsService.findFlightById).toHaveBeenCalledWith(flightId);
    expect(flightsService.getSeatsByFlightId).toHaveBeenCalledWith(flightId);
    expect(cacheManager.set).toHaveBeenCalledWith(
      key,
      seats,
      TTL.FLIGHT_SEATS * 1000,
    );
    expect(result).toEqual(seats);
  });
});
