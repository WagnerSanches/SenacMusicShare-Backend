import { buildApp } from './app.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = buildApp();

const start = async () => {
  try {
    await app.listen({ port: Number(PORT), host: HOST });
    app.log.info(`Server running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
