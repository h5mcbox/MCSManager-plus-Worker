const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const serverModel = require("../../model/ServerModel");
const { LogHistory } = require("../../helper/LogHistory");

//日志缓存记录器
MCSERVER.consoleLog = {};

//控制台信息广播
function selectWebsocket(serverName, callback) {
  for (let client of Object.values(MCSERVER.allSockets)) {
    if (client["console"] === serverName) {
      callback(client);
    }
  }
}

//服务器异常
serverModel.ServerManager().on("error", data => {
  MCSERVER.infoLog("Error".red, "[" + data.serverName + "] >>> 异常", true);
  selectWebsocket(data.serverName, (socket) => {
    response.wsMsgWindow(socket.ws, "服务器异常:" + data.msg);
  });
});

//服务器退出
serverModel.ServerManager().on("exit", data => {
  MCSERVER.log("[" + data.serverName + "] >>> 进程退出");
  let server = serverModel.ServerManager().getServer(data.serverName);
  if (server.dataModel.autoRestart) {
    //自动重启
    setTimeout(() => {
      serverModel.startServer(data.serverName);
    }, 5000);
    selectWebsocket(data.serverName, (socket) => response.wsMsgWindow(socket.ws, "检测到服务器关闭，稍后将根据任务自动重启！"));
    return;
  }
  //输出到标准输出
  server.printlnCommandLine("服务端 " + data.serverName + " 关闭.");
  // 告知前端已关闭
  selectWebsocket(data.serverName, (socket) => response.wsMsgWindow(socket.ws, "服务器关闭"));
  // 传递服务器关闭事件
  serverModel.ServerManager().emit("exit_next", data);
  // 历史记录类释放
  serverModel.ServerManager().getServer(data.serverName).logHistory.delete();
  serverModel.ServerManager().getServer(data.serverName).logHistory = null;
});

//服务器开启
serverModel.ServerManager().on("open", data => {
  MCSERVER.log("[" + data.serverName + "] >>> 进程创建");
  // 传递开启服务端事件
  serverModel.ServerManager().emit("open_next", {
    serverName: data.serverName
  });

  // 为此服务端创建历史记录类
  const serverInstance = serverModel.ServerManager().getServer(data.serverName);
  serverInstance.logHistory = new LogHistory(data.serverName);

  // 仅发送给正在监听控制台的用户
  selectWebsocket(data.serverName, (socket) => {
    response.wsMsgWindow(socket.ws, "服务器运行");
    // 传递服务器开启事件
  });
});

//控制请求监听控制台实例
WebSocketObserver().define("server/console/ws", data => {
  let { serverName, userName } = data.body;

  MCSERVER.log("[" + serverName + "] >>> 准许控制台监听");

  // 设置监听终端
  data.WsSession["console"] = serverName;

  // 重置用户历史指针
  const instanceLogHistory = serverModel.ServerManager().getServer(serverName).logHistory;
  if (instanceLogHistory) instanceLogHistory.setPoint(userName, 0);
  return null;
});

//前端退出控制台界面
WebSocketObserver().define("server/console/remove", data => {
  //单页退出时触发
  var serverName = data.body.trim();
  for (let client of Object.values(MCSERVER.allSockets)) {
    if (client.console === serverName) {
      client.console = undefined;
      return true;
    }
  }
  return false;
});

// 缓冲区定时发送频率，默认限制两秒刷新缓冲区
const consoleBuffer = {};
setInterval(() => {
  const totalBuffers = {};
  for (const serverName in consoleBuffer) {
    try {
      let data = consoleBuffer[serverName];
      const server = serverModel.ServerManager().getServer(serverName);
      // 此实例可能已经失去联系，可能被删除，可能被改名
      if (!server || !data) {
        consoleBuffer[serverName] = undefined;
        delete consoleBuffer[serverName];
        continue;
      }
      const logHistory = server.logHistory;
      if (logHistory) logHistory.writeLinedata;
      // 发送前端的标准，前端只识别 \r\n ，不可是\n
      data = data.replace(/\n/gim, "\r\n");
      data = data.replace(/\r\r\n/gim, "\r\n");
      //刷新每个服务器的缓冲数据
      totalBuffers[serverName] = data;
      // 释放内存并删除键
      consoleBuffer[serverName] = undefined;
      delete consoleBuffer[serverName];
    } catch (error) {
      MCSERVER.log("实例", serverName, "日志周期性广播任务错误:");
      console.log(error);
      continue;
    }
  }
  if (Object.keys(totalBuffers).length > 0) {
    for (let client of Object.values(MCSERVER.allSockets)) {
      response.wsSend(client.ws, "server/console/ws", totalBuffers);
    }
  }
}, MCSERVER.localProperty.console_send_times);
//控制台标准输出流
serverModel.ServerManager().on("console", data => {
  // 加入到缓冲区
  if (!consoleBuffer[data.serverName]) consoleBuffer[data.serverName] = "";
  consoleBuffer[data.serverName] += data.msg;
});

const { autoLoadModule } = require("../../core/tools");
autoLoadModule("route/websocket/console", "console/", (path) => {
  require(path);
});
