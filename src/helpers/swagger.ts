import config from "common/config";
import basicAuth from "express-basic-auth";

import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from "@nestjs/swagger";

export default (app: INestApplication) => {
  if (config.swagger.is_auth) {
    app.use(
      config.swagger.doc_url,
      basicAuth({
        challenge: true,
        users: {
          [config.swagger.username]: config.swagger.password,
        },
      }),
    );
  }

  const options = new DocumentBuilder()
    .setTitle(config.swagger.name)
    .setDescription(config.swagger.description)
    .setVersion(config.swagger.version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);

  const customSwaggerOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      tagsSorter: "alpha",
      operationsSorter: "alpha",
      persistAuthorization: true,
    },
    customJs: `/custom-swagger.js`,
  };
  SwaggerModule.setup(config.swagger.doc_url, app, document, customSwaggerOptions);
};
