import "./env.js";
import { buildServer } from "./app.js";

const app = buildServer();
const port = Number(process.env.PORT ?? 3000);

app.listen({
  port,
  host: "0.0.0.0"
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
