const { z } = require("zod");

const shortenSchema = z.object({
  longUrl: z
    .string()
    .max(2048)
    .url()
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "longUrl must use http or https",
    }),
  customAlias: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9-]+$/,
      "customAlias may only contain letters, numbers, and hyphens",
    )
    .optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(5).optional(),
});

module.exports = { shortenSchema };
