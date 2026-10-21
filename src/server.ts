import { app } from "./app";
import { config } from "./config";
import { cleanupImages } from "./images";

cleanupImages().catch(() => {});
setInterval(() => cleanupImages().catch(() => {}), 6 * 3600_000).unref();

Bun.serve({ port: config.port, hostname: "127.0.0.1", fetch: app.fetch });
console.log(`FxGithub listening on 127.0.0.1:${config.port}`);
