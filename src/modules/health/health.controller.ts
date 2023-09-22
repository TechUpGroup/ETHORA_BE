import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
  MongooseHealthIndicator,
} from "@nestjs/terminus";
import config from "common/config";

@ApiTags("@default")
@Controller("health")
export class HealthController {
  constructor(
    private healthCheck: HealthCheckService,
    private http: HttpHealthIndicator,
    private mongooseHealth: MongooseHealthIndicator,
  ) {}

  @Get("ping")
  @HealthCheck()
  async ping(): Promise<HealthCheckResult> {
    return this.healthCheck.check([]);
  }

  @Get("check")
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const checkProvider = config.network_supported.map(
      (network) => () => this.http.pingCheck(`chain[${network}]`, config.getEthereumProvider(network)),
    );
    return this.healthCheck.check([...checkProvider, () => this.mongooseHealth.pingCheck("database")]);
  }
}
