import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { orderRouter } from "./routes/orders";
import { influencerRouter } from "./routes/influencers";
import { auditRouter } from "./routes/audits";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/orders", orderRouter);
app.use("/api/influencers", influencerRouter);
app.use("/api/audits", auditRouter);

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "TRUST-Protocol-Backend",
    timestamp: new Date().toISOString(),
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[TRUST Backend] Server listening on port ${PORT}`);
  });
}

export default app;
