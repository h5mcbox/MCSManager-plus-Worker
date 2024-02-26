const { wsResponseError } = require("../helper/Response");
const Observer = require("./Observer");

const WebSocketModel = new Observer;

//事件二次转发  监听ws/req即可监听所有Websocket请求
WebSocketModel.listener("ws/req", "", data => {
  try {
    let result=WebSocketModel.emit(data.header.RequestKey, data);
    if(!result)throw "Method not found";
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