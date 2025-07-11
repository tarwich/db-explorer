declare module 'winston-browser' {
  import { Logger, TransportStream } from 'winston';

  export function createLogger(options?: any): Logger;

  export namespace transports {
    class Http extends TransportStream {
      constructor(options: { url: string; method?: string });
    }
  }
}
