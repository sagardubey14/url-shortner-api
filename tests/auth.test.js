jest.mock("../src/models/user.model");

const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../src/models/user.model");
const app = require("../src/app");

describe("POST /api/auth/register", () => {
  beforeEach(() => jest.resetAllMocks());

  it("creates a user with a hashed password and returns 201 without the password", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (doc) => ({
      _id: "u1",
      email: doc.email,
    }));

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "u1", email: "a@b.com" });
    const stored = User.create.mock.calls[0][0].password;
    expect(stored).not.toBe("password123");
    expect(await bcrypt.compare("password123", stored)).toBe(true);
  });

  it("returns 409 when the email is already registered", async () => {
    User.findOne.mockResolvedValue({ _id: "u1" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("returns 400 for a short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "short" });

    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns a JWT carrying the user id for valid credentials", async () => {
    const hash = await bcrypt.hash("password123", 4);
    User.findOne.mockResolvedValue({
      _id: "u1",
      email: "a@b.com",
      password: hash,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).sub).toBe("u1");
  });

  it("returns 401 for a wrong password", async () => {
    const hash = await bcrypt.hash("password123", 4);
    User.findOne.mockResolvedValue({ _id: "u1", password: hash });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it("returns 401 for an unknown email", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "x@y.com", password: "password123" });

    expect(res.status).toBe(401);
  });
});
