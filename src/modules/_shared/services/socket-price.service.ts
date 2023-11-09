import { Injectable } from "@nestjs/common";
import config from "common/config";
import { FEED_IDS } from "common/constants/price";
import WebSocket from "ws";

@Injectable()
export class SocketPriceService {
  public pairPrice: any = {};
  private client: WebSocket;

  constructor() {
    this.connectToWSS();
  }

  private connectToWSS() {
    const wssUrl = config.ws.priceUpdate.url;

    this.client = new WebSocket(wssUrl);

    this.client.on("open", () => {
      console.log("Connected to WSS server");

      const request = {
        type: "subscribe",
        ids: Object.values(FEED_IDS),
      };
      this.client.send(JSON.stringify(request));
    });

    this.client.on("message", (data) => {
      try {
        const json = JSON.parse(data.toString());
        if (json.type === "price_update") {
          this.updatePairPriceToMem(json);
        }
      } catch (e) {
        console.error(e);
      }
      // console.log('Received:', data);
    });

    this.client.on("close", (code, reason) => {
      console.log(`Connection closed with code ${code} and reason: ${reason}`);
      // reconnect
      this.connectToWSS();
    });
  }

  private updatePairPriceToMem(json: any) {
    const {
      id,
      price: { price, publish_time },
    } = json.price_feed;

    if (!this.pairPrice[id]) {
      this.pairPrice[id] = [];
    }

    this.pairPrice[id].unshift({ price, publish_time });
    this.pairPrice[id].splice(15);
  }

  public send(data: string) {
    if (this.client.readyState === WebSocket.OPEN) {
      this.client.send(data);
    }
  }
}
