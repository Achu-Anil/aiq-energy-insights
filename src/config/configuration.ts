/**
 * Application Configuration Interface
 *
 * Defines the structure of the application configuration object.
 * All configuration is loaded from environment variables with sensible defaults.
 */
export interface Config {
  /** Server port number */
  port: number;

  /** Database connection settings */
  database: {
    /** PostgreSQL host */
    host: string;
    /** PostgreSQL port */
    port: number;
    /** Database username */
    username: string;
    /** Database password */
    password: string;
    /** Database name */
    database: string;
  };

  /** JWT authentication settings (for future use) */
  jwt: {
    /** Secret key for signing JWT tokens */
    secret: string;
    /** Token expiration time (e.g., "24h", "7d") */
    expiresIn: string;
  };
}

/**
 * Configuration Factory
 *
 * Loads configuration from environment variables with fallback defaults.
 * Called during application bootstrap to initialize configuration.
 *
 * Environment Variables:
 * - PORT: Server port (default: 3000)
 * - DB_HOST: Database host (default: localhost)
 * - DB_PORT: Database port (default: 5432)
 * - DB_USERNAME: Database user (default: postgres)
 * - DB_PASSWORD: Database password (default: password)
 * - DB_NAME: Database name (default: aiq_energy_insights)
 * - JWT_SECRET: JWT secret key (default: your-secret-key)
 * - JWT_EXPIRES_IN: JWT expiration (default: 24h)
 *
 * Note: In production, always set these via environment variables.
 * Never use default values in production deployments.
 *
 * @returns {Config} Complete configuration object
 */
export const config = (): Config => ({
  port: parseInt(process.env.PORT || "3000", 10),
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "aiq_energy_insights",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },
});
