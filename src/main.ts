import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MailProducer } from './modules/mail/mail.producer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const mailProducer = app.get(MailProducer);
  mailProducer.sendMail({
    to: 'admin@app.com',
    sub: `[Update] App Restarted`,
    body: `App restarted at ${new Date().toLocaleString('en-GB')}`,
  });

  const port = configService.get<number>('NODE_PORT', 5000);
  await app.listen(port, '0.0.0.0');
  Logger.debug(`This application is running on: ${await app.getUrl()}`);
}
bootstrap();
