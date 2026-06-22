import "express-async-errors";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth.routes";
import { agentInstallerRoutes } from "./routes/agent-installer.routes";
import { agentRoutes } from "./routes/agent.routes";
import { apiRoutes } from "./routes/resource.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();
const parseOrigins = (...values: Array<string | undefined>) =>
  values.flatMap((value) =>
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean),
  );

const allowedOrigins = new Set([
  ...parseOrigins(env.frontendUrl, env.frontendPublicUrl, env.corsOrigin),
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);

    console.warn(`CORS blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    api: "online",
    product: "N-SCOPE Command Center API",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/agent-installers", agentInstallerRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`N-SCOPE Command Center API running on port ${env.port}`);
});
