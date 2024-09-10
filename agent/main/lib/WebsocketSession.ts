import Resolvable from '@ulixee/commons/lib/Resolvable';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { IWebsocketEvents } from '@ulixee/unblocked-specification/agent/browser/IWebsocketSession';
import { IncomingMessage, createServer } from 'http';
import { Socket, Server } from 'net';
import { Server as WebsocketServer, type createWebSocketStream } from 'ws';

// Not sure where to import this from
type Websocket = Parameters<typeof createWebSocketStream>[0];

export type WebsocketCallback = (name: string, payload: string) => void;

const SCRIPT_PLACEHOLDER = '';

export class WebsocketSession extends TypedEventEmitter<IWebsocketEvents> {
  readonly isReady: Promise<void>;
  port: number;
  secret = Math.random().toString();

  // We store resolvable when we received websocket message before, receiving
  // targetId, this way we can await this, and still trigger get proper ids.
  clientIdToTargetId = new Map<string, Resolvable<string> | string>();

  private server: Server;
  private wss: WebsocketServer;

  constructor() {
    super();
    this.server = createServer();
    this.wss = new WebsocketServer({ noServer: true });
  }

  async initialize(): Promise<void> {
    const resolver = new Resolvable<void>(3e3);

    this.server.on('error', resolver.reject);
    this.server.listen(0, () => {
      const address = this.server.address();
      if (typeof address === 'string') {
        throw new Error('Unexpected server address format (string)');
      }
      this.port = address.port;
      resolver.resolve();
    });

    this.server.on('upgrade', this.handleUpgrade.bind(this));
    this.wss.on('connection', this.handleConnection.bind(this));

    return resolver.promise;
  }

  close(): void {
    this.wss.close();
    this.server.close();
  }

  registerWebsocketFrameId(url: string, frameId: string): void {
    const parsed = new URL(url);
    if (parsed.searchParams.get('secret') !== this.secret) return;
    const clientId = parsed.searchParams.get('clientId');
    if (!clientId) return;

    const targetId = this.clientIdToTargetId.get(clientId);
    if (targetId instanceof Resolvable) {
      targetId.resolve(frameId);
    }
    this.clientIdToTargetId.set(clientId, frameId);
  }

  injectWebsocketCallbackIntoScript(script: string): string {
    // We could do this as a simple template script but this logic might get
    // complex over time and we want typescript to be able to check proxyScript();
    const scriptBody = this.proxyScript
      .toString()
      // eslint-disable-next-line no-template-curly-in-string
      .replaceAll('${this.port}', this.port.toString())
      // eslint-disable-next-line no-template-curly-in-string
      .replaceAll('${this.secret}', this.secret)
      // Use function otherwise replace will try todo some magic
      .replace('SCRIPT_PLACEHOLDER', () => script);

    const wsScript = `(function ${scriptBody})();`;
    return wsScript;
  }

  private proxyScript(): void {
    const clientId = Math.random();
    const url = `localhost:${this.port}?secret=${this.secret}&clientId=${clientId}`;
    // This will signal to network manager we are trying to make websocket connection
    // This is needed later to map clientId to frameId
    // void fetch(`http://${url}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let callback: WebsocketCallback = (): void => {};
    try {
      const socket = new WebSocket(`ws://${url}`);
      socket.addEventListener('open', _event => {
        callback = (name, payload) => {
          socket.send(JSON.stringify({ name, payload }));
        };
      });
    } catch {}

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    SCRIPT_PLACEHOLDER;
  }

  private handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void {
    const url = new URL(request.url, 'ws://localhost');
    // Close and dont send 403 so this acts as an invisible websocket server
    if (url.searchParams.get('secret') !== this.secret) {
      socket.destroy();
    }

    const clientId = url.searchParams.get('clientId');
    this.wss.handleUpgrade(request, socket as Socket, head, ws => {
      this.wss.emit('connection', ws, request, clientId);
    });
  }

  private handleConnection(ws: Websocket, request: IncomingMessage, clientId: string): void {
    // TODO handle somehow or blow up
    ws.on('error', console.error);
    ws.on('message', this.handleMessage.bind(this, clientId));
  }

  private async handleMessage(clientId: string, data: Buffer): Promise<void> {
    const { name, payload } = JSON.parse(data.toString());
    let frameId = this.clientIdToTargetId.get(clientId);
    if (!frameId) {
      const resolvable = new Resolvable<string>();
      this.clientIdToTargetId.set(clientId, resolvable);
      frameId = await resolvable.promise;
    } else if (frameId instanceof Resolvable) {
      frameId = await frameId.promise;
    }

    this.emit('message-received', { id: frameId, name, payload });
  }
}
