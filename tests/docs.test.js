const request = require("supertest");
const app = require("../src/app");

const EXPECTED_OPERATIONS = [
  ["get", "/health"],
  ["post", "/api/auth/register"],
  ["post", "/api/auth/login"],
  ["post", "/api/shorten"],
  ["get", "/{code}"],
  ["get", "/api/links"],
  ["delete", "/api/links/{code}"],
  ["get", "/api/analytics/{code}"],
];

const PROTECTED = [
  ["post", "/api/shorten"],
  ["get", "/api/links"],
  ["delete", "/api/links/{code}"],
  ["get", "/api/analytics/{code}"],
];

describe("API docs", () => {
  let spec;

  beforeAll(async () => {
    const res = await request(app).get("/api-docs.json");
    expect(res.status).toBe(200);
    spec = res.body;
  });

  it("serves an OpenAPI 3 document", () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBeTruthy();
  });

  it.each(EXPECTED_OPERATIONS)("documents %s %s", (method, path) => {
    expect(spec.paths[path]?.[method]).toBeDefined();
    expect(
      Object.keys(spec.paths[path][method].responses).length,
    ).toBeGreaterThan(0);
  });

  it.each(PROTECTED)(
    "marks %s %s as requiring a bearer token",
    (method, path) => {
      expect(spec.paths[path][method].security).toEqual([{ bearerAuth: [] }]);
      expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
        type: "http",
        scheme: "bearer",
      });
    },
  );

  it("serves Swagger UI at /api-docs", async () => {
    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("swagger-ui");
  });

  it("is not shadowed by the redirect route", async () => {
    const res = await request(app).get("/api-docs").redirects(1);
    expect(res.status).toBe(200);
  });
});
