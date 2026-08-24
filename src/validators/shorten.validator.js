const { z } = require("zod");

const shortenSchema = z.object({
  longUrl: z.string().url(),
  customAlias: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9-]+$/,
      "customAlias may only contain letters, numbers, and hyphens",
    )
    .optional(),
  tags: z.array(z.string().max(50)).max(5).optional(),
});

module.exports = { shortenSchema };
