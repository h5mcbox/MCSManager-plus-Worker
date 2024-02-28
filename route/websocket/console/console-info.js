const response = require("../../../helper/Response");
var serverModel = require("../../../model/ServerModel");
const permssion = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");
const os = require("os");

const mcPingProtocol = require("../../../helper/MCPingProtocol");

//控制台信息获取
WebSocketObserver().define("server/console", data => {
  // permssion.needLogin(req, res);
  let serverName = data.body.trim();
  let serverData = serverModel.ServerManager().getServer(serverName);
  let sysMonery = ((os.freemem() / 1024 / (os.totalmem() / 1024)) * 100).toFixed(2);
  // let cpu = MCSERVER.dataCenter.cacheCPU;
  return {
    serverData: serverData.dataModel,
    run: serverData.isRun(),
    sysMonery: sysMonery,
    sysCpu: MCSERVER.dataCenter.cacheCPU,
    CPUlog: MCSERVER.logCenter.CPU,
    RAMlog: MCSERVER.logCenter.RAM,
    mcping: mcPingProtocol.QueryMCPingTask(serverName) || {
      current_players: "--",
      max_players: "--"
    }
  };
});
