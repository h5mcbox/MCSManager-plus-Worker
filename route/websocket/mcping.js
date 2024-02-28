const { WebSocketObserver } = require("../../model/WebSocketModel");
const serverModel = require("../../model/ServerModel");
const response = require("../../helper/Response");

// 保存配置
WebSocketObserver().define("mcping/config_save", data => {
  const jsonObject = data.body;
  const serverName = jsonObject.mcpingServerName;
  const mcserver = serverModel.ServerManager().getServer(serverName);
  mcserver.dataModel.mcpingConfig = {
    mcpingName: jsonObject.mcpingConfig.mcpingName || "",
    mcpingHost: jsonObject.mcpingConfig.mcpingHost || "",
    mcpingPort: jsonObject.mcpingConfig.mcpingPort || "",
    mcpingMotd: jsonObject.mcpingConfig.mcpingMotd || ""
  };
  // console.log('mcping mcserver.dataModel:', mcserver.dataModel)
  mcserver.dataModel.save();
  return true;
});

// 获取配置
// 获取配置是公开的，任何人可以获取到你填写的配置，无权限控制
WebSocketObserver().define("mcping/config", data => {
  const serverName = data.body || "";
  if (serverName) {
    const mcserver = serverModel.ServerManager().getServer(serverName);
    mcserver.dataModel.save();
    return mcserver.dataModel.mcpingConfig;
  }
  return false;
});
