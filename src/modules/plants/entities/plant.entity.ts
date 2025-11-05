import { ApiProperty } from '@nestjs/swagger';

/**
 * Plant Entity
 * 
 * Represents a power plant in the database
 * Maps to the 'plants' table
 */
export class Plant {
  @ApiProperty({ description: 'Plant ID', example: 1001 })
  id!: number;

  @ApiProperty({ description: 'Plant name', example: 'South Texas Project' })
  name!: string;

  @ApiProperty({ description: 'State ID (foreign key)', example: 1 })
  stateId!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

/**
 * PlantGeneration Entity
 * 
 * Represents generation data for a plant in a specific year
 * Maps to the 'plant_generations' table
 */
export class PlantGeneration {
  @ApiProperty({ description: 'Generation record ID', example: 12345 })
  id!: number;

  @ApiProperty({ description: 'Plant ID (foreign key)', example: 1001 })
  plantId!: number;

  @ApiProperty({ description: 'Generation year', example: 2023 })
  year!: number;

  @ApiProperty({ description: 'Net generation in MWh', example: 21787144.5 })
  netGeneration!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
