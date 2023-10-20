import redisStore from "cache-manager-redis-store";
import { Network } from "common/enums/network.enum";
import aggregatePaginate from "common/libs/mongoose-aggregate-paginate-v2";
import config from "config";
import { isNil } from "lodash";
import { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

import { CacheModuleOptions } from "@nestjs/cache-manager";
import { MongooseModuleOptions } from "@nestjs/mongoose";
import { ContractName } from "common/constants/contract";

class Config {
  get nodeEnv(): string {
    return this.getString("node_env");
  }

  get cron() {
    const isDisableCron = Boolean(JSON.parse(process.env.DISABLE_CRON || "false"));
    return this.getBoolean("cron") && !isDisableCron;
  }

  get server() {
    return {
      host: this.getString("server.host"),
      port: this.getNumber("server.port"),
      url: this.getString("server.url"),
    };
  }

  get isDevelopment() {
    return this.nodeEnv === "development";
  }

  get mongoose(): { uri: string; options: MongooseModuleOptions } {
    // Use this to allow empty strings to pass the `required` validator
    Schema.Types.String.checkRequired((v) => typeof v === "string");
    return {
      uri: this.getString("mongodb.uri"),
      options: {
        directConnection: true,
        connectionFactory: (connection) => {
          connection.plugin(mongoosePaginate);
          connection.plugin(aggregatePaginate);
          return connection;
        },
      },
    };
  }

  get swagger() {
    return {
      name: this.getString("swagger.name"),
      description: this.getString("swagger.description"),
      doc_url: this.getString("swagger.doc_url"),
      version: this.getString("swagger.version"),
      is_auth: this.getBoolean("swagger.is_auth"),
      username: this.getString("swagger.username"),
      password: this.getString("swagger.password"),
    };
  }

  get redisConfig(): CacheModuleOptions {
    return {
      isGlobal: true,
      store: redisStore,
      url: this.getString("redis.uri"),
      prefix: `${this.getString("redis.prefix")}_${this.nodeEnv}_`,
      ttl: 10,
    };
  }

  get encrypt() {
    return {
      secretKey: this.getString("encrypt.secretKey"),
    };
  }

  get ws() {
    return {
      priceUpdate: {
        url: this.getString("ws.priceUpdate.url"),
      },
    };
  }

  get jwt() {
    return {
      secret: this.getString("jwt.secret"),
      accessExpirationMinutes: this.getNumber("jwt.access_expiration_minutes"),
      refreshExpirationDays: this.getNumber("jwt.refresh_expiration_days"),
    };
  }

  get fallbackLanguage(): string {
    return this.getString("i18n.fallback_language");
  }

  // ethereum config
  get syncEvent() {
    const numberBlockResync = 10;
    return {
      numberBlockResync,
      blockPerSync: 1000 - numberBlockResync,
    };
  }

  get network_supported() {
    const networks = this.getArray<Network>("network_supported");
    const allNetworks = Object.values(Network);
    const networkSupport = networks.filter((network) => allNetworks.includes(network));
    if (networkSupport.length !== networks.length) {
      throw new Error(`network_supported environment variable: ${networks} is not Network enum`);
    }
    return networkSupport;
  }

  get graphql() {
    return {};
  }

  get cacheTime() {
    return 60 * 60;
  }

  getChainId(network: Network) {
    return this.getNumber(`blockchain.${network}.chain_id`);
  }

  getEthereumProvider(network: Network) {
    return this.getBlockChainInfo(network, "provider");
  }

  listRPC(network: Network) {
    return network === Network.goerli
      ? [
          "https://arbitrum-goerli.publicnode.com",
          "https://arbitrum-goerli.public.blastapi.io",
          "https://endpoints.omniatech.io/v1/arbitrum/goerli/public",
          "https://goerli-rollup.arbitrum.io/rpc",
        ]
      : ["https://base.publicnode.com", "https://base.meowrpc.com", "https://1rpc.io/base", "https://base.drpc.org"];
  }

  getContract(network: Network, key: ContractName) {
    const address = this.getBlockChainInfo(network, `contract.${key}.address`);
    const blocknumber_creator = this.getBlockChainInfo(network, `contract.${key}.blocknumber_creator`);
    return {
      address,
      blocknumber_creator: Number(blocknumber_creator || 0),
    };
  }

  getGraphql(network: Network) {
    const uri = this.getBlockChainInfo(network, `graphql.uri`);
    const burnedUri = this.getBlockChainInfo(network, `graphql.burnedUri`);
    const mainnetDummyUri = this.getBlockChainInfo(network, `graphql.mainnetDummyUri`);
    return {
      uri,
      burnedUri,
      mainnetDummyUri,
    };
  }

  private getBlockChainInfo(network: Network, key: string) {
    return this.getString(`blockchain.${network}.${key}`);
  }

  private getString(key: string): string {
    const value = config.get<string>(key);
    if (isNil(value)) {
      throw new Error(key + " environment variable does not set");
    }

    return value.toString().replace(/\\n/g, "\n");
  }

  private getArray<T = string>(key: string): T[] {
    const value = config.get<T[]>(key);
    if (!Array.isArray(value)) {
      throw new Error(key + " environment variable is not array");
    }
    return value;
  }

  private getNumber(key: string): number {
    const value = this.getString(key);
    try {
      return Number(value);
    } catch {
      throw new Error(key + " environment variable is not a number");
    }
  }

  private getBoolean(key: string): boolean {
    const value = this.getString(key);
    try {
      return Boolean(JSON.parse(value));
    } catch {
      throw new Error(key + " env var is not a boolean");
    }
  }
}

export default new Config();
