import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreatePassengerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  document_id: string;
}

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  seat_id: string;

  @IsNotEmpty()
  passenger: CreatePassengerDto;
}
