import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): string {
    return "Hello World! Welcome to AIQ Backend Challenge API";
  }

  getHealth(): { status: string; timestamp: string } {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
    };
  }
}
