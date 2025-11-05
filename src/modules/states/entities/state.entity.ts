import { ApiProperty } from "@nestjs/swagger";

/**
 * State Entity
 *
 * Represents a US state in the database
 * Maps to the 'states' table
 */
export class State {
  @ApiProperty({ description: "State ID", example: 1 })
  id!: number;

  @ApiProperty({ description: "State code (2 letters)", example: "TX" })
  code!: string;

  @ApiProperty({ description: "State name", example: "Texas" })
  name!: string;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt!: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt!: Date;
}

/**
 * StateGeneration Entity
 *
 * Represents aggregated generation data for a state in a specific year
 * Maps to the 'state_generations' table
 */
export class StateGeneration {
  @ApiProperty({ description: "Generation record ID", example: 123 })
  id!: number;

  @ApiProperty({ description: "State ID (foreign key)", example: 1 })
  stateId!: number;

  @ApiProperty({ description: "Generation year", example: 2023 })
  year!: number;

  @ApiProperty({
    description: "Total generation in MWh",
    example: 544038647.01,
  })
  totalGeneration!: number;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt!: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt!: Date;
}
