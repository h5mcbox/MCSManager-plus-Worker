const { WebSocketObserver } = require("../../../model/WebSocketModel");
const permssion = require("../../../helper/Permission");
const serverModel = require("../../../model/ServerModel");

const HISTORY_SIZE_LINE = 1024;

// 正序历史记录路由
WebSocketObserver().define("server/console/history", data => {
  let { serverName = "", userName } = data.body;
  const logHistory = serverModel.ServerManager().getServer(serverName).logHistory;
  if (!logHistory) {
    return "[控制面板]: 暂无任何历史记录.\r\n";
  }
  let returnText = "";
  logHistory.readLine(userName, HISTORY_SIZE_LINE, (sendText) => {
    if (sendText) {
      sendText = sendText.replace(/\n/gim, "\r\n");
      sendText = sendText.replace(/\r\r\n/gim, "\r\n");
      returnText = sendText;
    } else {
      returnText = "[控制面板]: 无法再读取更多的服务端日志.\r\n";
    }
  });
  return returnText;
});

/*
// 首次进入终端使用,倒序历史记录路由
WebSocketObserver().listener("server/console/history_reverse", data => {
  let bodyJson = data.body;
  let serverName = bodyJson["serverName"] || "";

  const logHistory = serverModel.ServerManager().getServer(serverName).logHistory;
  if (!logHistory) return;
  logHistory.readLineOnce("", HISTORY_SIZE_LINE * 3, (sendText) => {
    if (sendText) {
      sendText = sendText.replace(/\n/gim, "\r\n");
      sendText = sendText.replace(/\r\r\n/gim, "\r\n");
      response.wsResponse(data, "terminalBack", sendText);
    }
  });
});

// 历史指针重置路由
WebSocketObserver().listener("server/console/history_reset", data => {
  let bodyJson = data.body;
  let serverName = bodyJson["serverName"] || "";
  const logHistory = serverModel.ServerManager().getServer(serverName).logHistory;
  if (!logHistory) return;
  logHistory.setPoint("", 0);
  return response.wsResponse(data, true);
});*/
