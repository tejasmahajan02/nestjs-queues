import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url:
    process.env.REDIS_URI ??
    `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
}));
