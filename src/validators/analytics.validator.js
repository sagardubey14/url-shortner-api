const { z } = require("zod");

// Analytics documents are purged after 30 days, so a longer window is meaningless.
const analyticsQuerySchema = z.object({
  days: z
    .string()
    .regex(/^\d+$/, "days must be a whole number")
    .transform(Number)
    .pipe(z.number().min(1).max(30))
    .default(30),
});

module.exports = { analyticsQuerySchema };
