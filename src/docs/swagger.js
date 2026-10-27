const path = require("node:path");
const swaggerJsdoc = require("swagger-jsdoc");

const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "URL Shortener API",
      version: "1.0.0",
      description:
        "Create and manage short links, redirect through them, and read click analytics.",
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string", example: "Short URL not found" },
          },
        },
        ValidationError: {
          type: "object",
          required: ["error", "details"],
          properties: {
            error: { type: "string", example: "Validation failed" },
            details: { type: "object", description: "Zod flattened error" },
          },
        },
        HealthStatus: {
          type: "object",
          properties: {
            write: { type: "string", enum: ["healthy", "unhealthy"] },
            read: { type: "string", enum: ["healthy", "unhealthy"] },
            redis: { type: "string", enum: ["healthy", "unhealthy"] },
          },
        },
        Credentials: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "ada@example.com",
            },
            password: { type: "string", minLength: 8, maxLength: 72 },
          },
        },
        Link: {
          type: "object",
          properties: {
            _id: { type: "string" },
            shortCode: { type: "string", example: "15FTGg" },
            longUrl: { type: "string", format: "uri" },
            customAlias: { type: "string" },
            clickCount: { type: "integer" },
            isActive: { type: "boolean" },
            tags: { type: "array", items: { type: "string" } },
            metadata: {
              type: "object",
              description:
                "OpenGraph data, backfilled asynchronously after creation",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                image: { type: "string", format: "uri" },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing, invalid or expired token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        TooManyRequests: {
          description: "Rate limit exceeded; see the Retry-After header",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        ValidationFailed: {
          description: "Request failed validation",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationError" },
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, "..", "routes", "*.js")],
});

module.exports = spec;
