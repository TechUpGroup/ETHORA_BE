import config from "common/config";
import { Network } from "common/enums/network.enum";

export const NetworkAvailable: { [ky in Network]?: Network } = config.network_supported.reduce((a, b) => {
  a[b] = b;
  return a;
}, {});

export const allNetworks = Object.values(NetworkAvailable);
