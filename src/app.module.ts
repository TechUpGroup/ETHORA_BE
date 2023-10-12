import config from "common/config";
import { I18nAllExceptionFilter } from "common/filters/i18n-all-exception.filter";
import { JobModule } from "modules/_jobs/job.module";
import { SharedModule } from "modules/_shared/shared.module";
import { AcceptLanguageResolver, I18nModule, QueryResolver } from "nestjs-i18n";
import { join } from "path";

import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { UsersModule } from "modules/users/users.module";
import { AuthModule } from "modules/auth/auth.module";
import { TradesModule } from "modules/trades/trades.module";
import { HealthModule } from "modules/health/health.module";
import { TransformInterceptor } from "common/interceptors/transform.interceptor";
import { LeaderboardModule } from "modules/leaderboard/leaderboard.module";
import { BlocksModule } from "modules/blocks/blocks.module";
import { ContractsModule } from "modules/contracts/contracts.module";
import { EthPairsModule } from "modules/eth-pair/eth-pair.module";
import { DashboardModule } from "modules/dashboard/dashboard.module";

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
    BlocksModule,
    HealthModule,
    ContractsModule,
    EthPairsModule,
    // jobs module
    JobModule,
    // app modules
    AuthModule,
    UsersModule,
    TradesModule,
    LeaderboardModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: I18nAllExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
