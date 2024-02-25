const Observer = require("./Observer");

const WebSocketModel = new Observer;

//事件二次转发  监听ws/req即可监听所有Websocket请求
WebSocketModel.listener("ws/req", "", data => {
  WebSocketModel.emit(data.header.RequestKey, data);
});

module.exports = {
  WebSocketObserver() {
    return WebSocketModel;
  }
}