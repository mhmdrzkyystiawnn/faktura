import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createApp } from './common/app.factory';

async function bootstrap() {
  const app = await createApp();
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
  console.log(`Faktura API running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
