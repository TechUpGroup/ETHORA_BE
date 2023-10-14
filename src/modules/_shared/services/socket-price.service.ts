import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';

@Injectable()
export class SocketPriceService {
  private client: WebSocket;

  constructor() {
    this.connectToWSS();
  }

  private connectToWSS() {
    const wssUrl = 'wss://hermes.pyth.network/ws';

    this.client = new WebSocket(wssUrl);

    this.client.on('open', () => {
      console.log('Connected to WSS server');

      const request = {
        type: 'subscribe',
        ids: [
          "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
          "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
          "84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1",
          "a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b",
          "3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
          "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
          "5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52",
          "385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
          "765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2",
          "f2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e",
          "ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
          "dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
          "8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026",
          "f0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a",
          "8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
          "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
        ]
    };
      this.client.send(JSON.stringify(request));
    });

    this.client.on('message', (data) => {
      console.log('Received:', data);
    });

    this.client.on('close', (code, reason) => {
      console.log(`Connection closed with code ${code} and reason: ${reason}`);
    });
  }

  public send(data: string) {
    if (this.client.readyState === WebSocket.OPEN) {
      this.client.send(data);
    }
  }
}