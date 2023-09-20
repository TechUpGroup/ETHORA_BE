import { AppModule } from "app.module";
import chalk from "chalk";
import config from "common/config";
import morgan from "morgan";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import setupSwagger from "./helpers/swagger";

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));

  setupSwagger(app);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(config.server.port, config.server.host);

  console.info(chalk.greenBright(`server running on http://localhost:${config.server.port}${config.swagger.doc_url}`));
}
void bootstrap();
