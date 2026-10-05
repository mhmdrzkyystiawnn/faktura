import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import serverless from 'serverless-http';

let app: any = null;

async function ensureApp() {
  if (!app) {
    const instance = await NestFactory.create(AppModule);
    instance.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await instance.init();
    app = instance.getHttpAdapter();
  }
  return app;
}

export const handler = async (event: any, context: any) => {
  const adapter = await ensureApp();
  return serverless(adapter)(event, context);
};
