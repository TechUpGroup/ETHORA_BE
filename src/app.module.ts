import config from "common/config";
import { I18nAllExceptionFilter } from "common/filters/i18n-all-exception.filter";
import { JobModule } from "modules/_jobs/job.module";
import { SharedModule } from "modules/_shared/shared.module";
import { AcceptLanguageResolver, I18nModule, QueryResolver } from "nestjs-i18n";
import { join } from "path";

import { CacheModule, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { UsersModule } from "modules/users/users.module";
import { AuthModule } from "modules/auth/auth.module";
import { TradesModule } from "modules/trades/trades.module";
import { HealthModule } from "modules/health/health.module";

@Module({
  imports: [
    // global module
    ...(config.cron ? [ScheduleModule.forRoot()] : []),
    MongooseModule.forRoot(config.mongoose.uri, config.mongoose.options),
    CacheModule.register({ isGlobal: true }),
    // CacheModule.register(config.redisConfig),
    I18nModule.forRoot({
      fallbackLanguage: config.fallbackLanguage,
      loaderOptions: {
        path: join(__dirname, "/i18n/"),
        watch: config.isDevelopment,
      },
      resolvers: [{ use: QueryResolver, options: ["lang"] }, AcceptLanguageResolver],
    }),
    SharedModule,
    HealthModule,
    // jobs module
    JobModule,
    // app modules
    AuthModule,
    UsersModule,
    TradesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: I18nAllExceptionFilter },
    // { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class AppModule {}
