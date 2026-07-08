import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';

describe('FlightsController', () => {
  let controller: FlightsController;
  let flightsService: any;

  beforeEach(async () => {
    flightsService = {
      searchFlights: jest.fn(),
      getSeatMap: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlightsController],
      providers: [
        {
          provide: FlightsService,
          useValue: flightsService,
        },
      ],
    }).compile();

    controller = module.get<FlightsController>(FlightsController);
  });

  it('delegates seat map lookup to service', async () => {
    const flightId = 'flight-123';
    const seats = [
      { id: 'seat-1', seat_number: '1A', status: 'available' },
    ];

    flightsService.getSeatMap.mockResolvedValue(seats);

    const result = await controller.getSeatMap(flightId);

    expect(flightsService.getSeatMap).toHaveBeenCalledWith(flightId);
    expect(result).toEqual(seats);
  });

  it('delegates flight search to service', async () => {
    const flights = [{ id: 'flight-1' }];
    flightsService.searchFlights.mockResolvedValue(flights);

    const result = await controller.searchFlights('SAL', 'MIA', '2026-07-10');

    expect(flightsService.searchFlights).toHaveBeenCalledWith(
      'SAL',
      'MIA',
      '2026-07-10',
    );
    expect(result).toEqual(flights);
  });
});
