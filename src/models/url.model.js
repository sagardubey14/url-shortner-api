const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    shortCode: { type: String, required: true, unique: true },
    longUrl: { type: String, required: true },
    customAlias: { type: String, unique: true, sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clickCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    tags: { type: [String], default: [] },
    metadata: {
      title: String,
      description: String,
      image: String,
    },
  },
  { timestamps: true },
);

urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
urlSchema.index({ userId: 1, createdAt: -1 });
urlSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Url", urlSchema);
