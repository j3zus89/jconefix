declare module 'qz-tray' {
  interface QzWebsocketConnectOptions {
    host?: string | string[];
    usingSecure?: boolean;
    port?: {
      secure: number[];
      insecure: number[];
      portIndex?: number;
    };
    retries?: number;
    delay?: number;
    keepAlive?: number;
  }

  interface QzSecurity {
    setCertificatePromise(
      handler:
        | (() => Promise<string>)
        | ((resolve: (v: string) => void, reject: (e?: unknown) => void) => void),
      options?: { rejectOnFailure?: boolean }
    ): void;
    setSignaturePromise(
      factory:
        | ((toSign: string) => (resolve: (v: string) => void, reject: (e?: unknown) => void) => void)
        | ((toSign: string) => Promise<string>)
    ): void;
    setSignatureAlgorithm(algorithm: 'SHA1' | 'SHA256' | 'SHA512'): void;
  }

  interface QzWebsocket {
    connect(options?: QzWebsocketConnectOptions): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  }

  interface QzApi {
    getVersion(): Promise<string>;
  }

  interface QzPrinters {
    find(
      query?: string,
      signature?: string,
      signingTimestamp?: number
    ): Promise<string[] | string>;
  }

  const qz: {
    websocket: QzWebsocket;
    security: QzSecurity;
    api: QzApi;
    printers: QzPrinters;
  };
  export default qz;
}
