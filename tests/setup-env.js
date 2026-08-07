process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.MONGO_URI =
  "mongodb://localhost:27017,localhost:27018,localhost:27019/urlshortener_test?replicaSet=rs0";
process.env.REDIS_URL = "redis://localhost:6379/1";
process.env.JWT_SECRET = "test-secret";
