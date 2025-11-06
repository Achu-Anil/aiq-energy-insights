import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";

/**
 * E2E tests for Plants API endpoints
 *
 * Tests full request-response cycle including:
 * - HTTP routing
 * - DTO validation
 * - Error handling
 * - Response formatting
 *
 * Prerequisites:
 * - Database must be running with seed data
 * - Redis is optional (graceful fallback)
 */
describe("Plants API (E2E)", () => {
  let app: INestApplication;
  const TEST_YEAR = parseInt(process.env.TEST_SEED_YEAR || "2023", 10);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    app.setGlobalPrefix("api/v1");

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/plants", () => {
    it("should return top 10 plants by default", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(10);

          if (res.body.length > 0) {
            const plant = res.body[0];
            expect(plant).toHaveProperty("id");
            expect(plant).toHaveProperty("plantId");
            expect(plant).toHaveProperty("name");
            expect(plant).toHaveProperty("state");
            expect(plant).toHaveProperty("netGeneration");
            expect(plant).toHaveProperty("percentOfState");
            expect(plant).toHaveProperty("rank");
          }
        });
    });

    it("should respect top parameter", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?top=5")
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    it("should filter by state code", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?state=TX")
        .expect(200)
        .expect((res) => {
          res.body.forEach((plant: any) => {
            expect(plant.state.code).toBe("TX");
          });
        });
    });

    it("should filter by year", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/plants?year=${TEST_YEAR}`)
        .expect(200)
        .expect((res) => {
          res.body.forEach((plant: any) => {
            expect(plant.year).toBe(TEST_YEAR);
          });
        });
    });

    it("should combine multiple filters", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/plants?top=3&state=CA&year=${TEST_YEAR}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeLessThanOrEqual(3);
          res.body.forEach((plant: any) => {
            expect(plant.state.code).toBe("CA");
            expect(plant.year).toBe(TEST_YEAR);
          });
        });
    });

    it("should validate top parameter minimum", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?top=0")
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("top must be at least 1");
        });
    });

    it("should validate top parameter maximum", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?top=101")
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("top cannot exceed 100");
        });
    });

    it("should validate state code format", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?state=TEX")
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            "state must be exactly 2 characters"
          );
        });
    });

    it("should validate state code pattern", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?state=t1")
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("2 uppercase letters");
        });
    });

    it("should return 404 for invalid state code", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?state=XX")
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain("State with code 'XX' not found");
        });
    });

    it("should validate year minimum", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?year=1899")
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("year must be 1900 or later");
        });
    });

    it("should validate year maximum", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?year=2101")
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("year cannot exceed 2100");
        });
    });

    it("should reject non-whitelisted parameters", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?hacker=injection")
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("should not exist");
        });
    });

    it("should transform query parameters to correct types", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?top=5")
        .expect(200)
        .expect((res) => {
          // If transformation works, the query succeeds
          expect(res.body).toBeDefined();
        });
    });

    it("should return plants ordered by generation DESC", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?top=3")
        .expect(200)
        .expect((res) => {
          if (res.body.length > 1) {
            expect(res.body[0].netGeneration).toBeGreaterThanOrEqual(
              res.body[1].netGeneration
            );
          }
        });
    });

    it("should include correct rank values", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?top=5")
        .expect(200)
        .expect((res) => {
          res.body.forEach((plant: any, index: number) => {
            expect(plant.rank).toBe(index + 1);
          });
        });
    });
  });

  describe("GET /api/v1/plants/:id", () => {
    let validPlantId: number;

    beforeAll(async () => {
      // Get a valid plant ID for tests
      const res = await request(app.getHttpServer())
        .get("/api/v1/plants?top=1")
        .expect(200);

      if (res.body.length > 0) {
        validPlantId = res.body[0].plantId;
      }
    });

    it("should return plant details by ID", () => {
      if (!validPlantId) {
        return;
      }

      return request(app.getHttpServer())
        .get(`/api/v1/plants/${validPlantId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("name");
          expect(res.body).toHaveProperty("state");
          expect(res.body).toHaveProperty("generations");
          expect(Array.isArray(res.body.generations)).toBe(true);
        });
    });

    it("should return 404 for non-existent plant ID", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants/999999")
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain("Plant with ID 999999 not found");
        });
    });

    it("should handle invalid ID format", () => {
      return request(app.getHttpServer()).get("/api/v1/plants/abc").expect(400);
    });

    it("should include generation history", () => {
      if (!validPlantId) {
        return;
      }

      return request(app.getHttpServer())
        .get(`/api/v1/plants/${validPlantId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.generations).toBeDefined();
          expect(Array.isArray(res.body.generations)).toBe(true);

          if (res.body.generations.length > 0) {
            const gen = res.body.generations[0];
            expect(gen).toHaveProperty("year");
            expect(gen).toHaveProperty("netGeneration");
          }
        });
    });
  });

  describe("Error handling", () => {
    it("should return structured error response", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants?top=0")
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty("statusCode");
          expect(res.body).toHaveProperty("message");
          expect(res.body).toHaveProperty("error");
          expect(res.body.statusCode).toBe(400);
        });
    });

    it("should handle database errors gracefully", () => {
      return request(app.getHttpServer())
        .get("/api/v1/plants/999999")
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toBe("Not Found");
        });
    });
  });

  describe("Performance", () => {
    it("should respond within 200ms for simple query", (done) => {
      const start = Date.now();

      request(app.getHttpServer())
        .get("/api/v1/plants?top=10")
        .expect(200)
        .end(() => {
          const duration = Date.now() - start;
          expect(duration).toBeLessThan(200);
          done();
        });
    }, 300);
  });
});
