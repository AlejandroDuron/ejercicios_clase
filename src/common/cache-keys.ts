export const CacheKeys = {
  flightSearch: (origin: string, dest: string, date: string) =>
    `flights:search:${origin}:${dest}:${date}`,

  flightSeats: (flightId: string) =>
    `flights:${flightId}:seats`,

  reservation: (reservationId: string) =>
    `reservation:${reservationId}`,

  seatHold: (seatId: string) =>
    `seat:hold:${seatId}`,
};

export const TTL = {
  FLIGHT_SEARCH: 60,
  FLIGHT_SEATS: 30,
  RESERVATION: 600,
  SEAT_HOLD: 900,
};