const { z } = require("zod");

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(72),
});

module.exports = { credentialsSchema };
