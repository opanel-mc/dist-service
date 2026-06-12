import https from "https";
import { createApp, getSSLConfig } from "./app";
import { statsService } from "./services/stats";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const app = createApp();
const ssl = getSSLConfig();

if (ssl) {
  https.createServer(ssl, app).listen(PORT, () => {
    console.log(`dist-service listening on port ${PORT} (SSL)`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`dist-service listening on port ${PORT}`);
  });
}

function shutdown() {
  statsService.flushSync();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", () => statsService.flushSync());
