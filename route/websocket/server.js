const { WebSocketObserver } = require("../../model/WebSocketModel");
const serverModel = require("../../model/ServerModel");
const response = require("../../helper/Response");
const mcPingProtocol = require("../../helper/MCPingProtocol");

WebSocketObserver().define("server/view", data => {
  let value = serverModel.ServerManager().getServerList();
  return {
    items: value
  };
});

WebSocketObserver().define("server/get", data => {
  //服务器名在 data.body 里面
  let serverName = data.body.trim();
  let mcserver = serverModel.ServerManager().getServer(serverName);
  if (mcserver == null) {
    response.wsMsgWindow(data.ws, "服务端 " + serverName + " 不存在！请刷新或自行检查。");
    return false;
  }

  let serverData = mcserver.dataModel;
  serverData.serverName = serverName;
  serverData.run = mcserver.isRun();
  serverData.mcpingResult = mcPingProtocol.QueryMCPingTask(serverName);
  return serverData;
});

WebSocketObserver().define("server/create", data => {

  let ServerConfig = data.body;
  let serverName = ServerConfig.serverName.trim();
  if (serverName.indexOf(".") != -1) {
    response.wsMsgWindow(data.ws, '不可包含 "." 字符');
    return false;
  }
  try {
    serverModel.createServer(serverName, ServerConfig);
  } catch (err) {
    response.wsMsgWindow(data.ws, "创建出错:" + err);
    return false;
  }
  response.wsMsgWindow(data.ws, "创建完成√")
  return true;
});

WebSocketObserver().define("server/create_dir", data => {

  let ServerConfig = data.body;
  try {
    serverModel.createServerDir(ServerConfig.serverName, ServerConfig.cwd);
    response.wsMsgWindow(data.ws, "创建服务器目录已完成 √");
    return true;
  } catch (e) {
    response.wsMsgWindow(data.ws, "创建目录" + ServerConfig.cwd + "出错");
    return false;
  }
});

WebSocketObserver().define("server/rebuilder", data => {

  let ServerConfig = data.body;
  let oldServerName = ServerConfig.oldServerName.trim();
  let newServerName = ServerConfig.serverName.trim();
  const server = serverModel.ServerManager().getServer(oldServerName);
  if (server.isRun()) {
    response.wsMsgWindow(data.ws, "实例正在运行，参数无法修改，请先关闭实例");
    return false;
  }
  if (oldServerName != newServerName) {
    // 暂时性禁止服务器标识名修改，重构版本后将会优化此功能
    response.wsMsgWindow(data.ws, "服务器标识名不可再更改");
    return false;
    // serverModel.ServerManager().reServerName(oldServerName, newServerName);
    // serverModel.builder(newServerName, ServerConfig);
    //serverModel.loadALLMinecraftServer();
  } else {
    serverModel.builder(oldServerName, ServerConfig);
  }
  response.wsMsgWindow(data.ws, "修改完成√");
  return true;
});

WebSocketObserver().define("server/delete", data => {

  let serverName = data.body.trim();
  try {
    serverModel.deleteServer(serverName);

    response.wsMsgWindow(data.ws, "删除服务器完成√");
    return true;
  } catch (e) {
    response.wsMsgWindow(data.ws, "删除服务器失败" + e);
    return false;
  }
});

//服务器批量启动与关闭
WebSocketObserver().define("server/opt_all", data => {
  let command = data.body.trim();

  try {
    let servers = serverModel.ServerManager().getServerObjects();
    for (let k in servers) {
      try {
        let server = servers[k];
        if (command == "start") {
          server.start();
        } else {
          // 临时性的关闭自动重启
          let isRestart = server.dataModel.autoRestart;
          if (isRestart) {
            server.dataModel.autoRestart = false;
            server._onceStopRestart = true;
          }
          server.stopServer();
        }
      } catch (serverErr) {
        MCSERVER.error("批量开启某服务器失败:", serverErr);
        continue;
      }
    }
    return true;
  } catch (err) {
    response.wsMsgWindow(data.ws, "执行失败:" + err);
    return false;
  }
});
