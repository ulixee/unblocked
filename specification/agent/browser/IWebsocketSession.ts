export interface IWebsocketEvents {
    'message-received': { id: string; name: string, payload: string };
  }