const { wsResponseError, wsResponse } = require("../helper/Response");
const RPCHandler = require("./RPCHandler");

const WebSocketModel = new RPCHandler;

//事件二次转发  监听ws/req即可监听所有Websocket请求
WebSocketModel.define("ws/req", "", async data => {
  try {
    let [success, result] = await WebSocketModel.emit(data.header.RequestKey, data);
    wsResponse(data, result);
    if (!success) throw "Method not found";
  } catch (err) {
    wsResponseError(data, err);
    throw err;
  }
});

module.exports = {
  WebSocketObserver() {
    return WebSocketModel;
  }
}