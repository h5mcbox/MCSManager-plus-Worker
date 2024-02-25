const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");

WebSocketObserver().listener("menu", data => {
  //Object {ws: WebSocket, req: IncomingMessage, user: undefined, header: Object, body: "[body 开始]
  //Object {RequestKey: "req", RequestValue: "some"}

  if (data.WsSession.login == false) {
    response.wsMsgWindow(data.ws, "身份信息丢失，请重新登陆补全身份信息");
    return response.wsResponse(data, false);
  }
  return response.wsResponse(data, true);
});
