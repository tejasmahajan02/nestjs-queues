import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url:
    process.env.REDIS_URL ??
    `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
}));
