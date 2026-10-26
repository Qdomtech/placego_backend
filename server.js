require("dotenv").config({ quiet: true });
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { verifyMailer } = require("./src/utils/mailer");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  verifyMailer();
  const server = app.listen(PORT, () => {
    console.log(`PlaceGo API running on http://localhost:${PORT} (${process.env.NODE_ENV || "development"})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down…`);
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();
