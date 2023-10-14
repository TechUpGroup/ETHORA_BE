import { Injectable } from '@nestjs/common';
import { FEED_IDS } from 'common/constants/price';
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
        ids: Object.values(FEED_IDS)
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