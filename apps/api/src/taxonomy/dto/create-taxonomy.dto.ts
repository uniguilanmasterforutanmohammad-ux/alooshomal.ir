import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTaxonomyDto {
  @ApiProperty({ example: 'تهران' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
