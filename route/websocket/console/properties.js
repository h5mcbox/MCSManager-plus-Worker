const response = require("../../../helper/Response");
var serverModel = require("../../../model/ServerModel");
const { WebSocketObserver } = require("../../../model/WebSocketModel");

//获取配置
WebSocketObserver().define("server/properties", data => {
  let [serverName, configName = "server.properties"] = data.body;
  serverModel
    .ServerManager()
    .getServer(serverName)
    .propertiesRead(configName, (err, properties) => {
      if (err) {
        response.wsMsgWindow(data.ws, `${configName} 文件不存在或读取出错！请自行检查或确认是否存在以及格式正确.`);
        return {
          run: serverModel.ServerManager().getServer(serverName).isRun(),
          serverName,
          configName,
          properties: []
        };
      }
      return {
        run: serverModel.ServerManager().getServer(serverName).isRun(),
        serverName,
        configName,
        properties
      };
    });
});
//获取配置列表
WebSocketObserver().define("server/propertiesList", data => {
  let serverName = data.body.trim();
  let list = serverModel
    .ServerManager()
    .getServer(serverName)
    .propertiesList();
  return { list };
});

//更新配置
WebSocketObserver().define("server/properties_update", data => {
  let config = data.body;
  let properties = config.properties;
  try {
    serverModel
      .ServerManager()
      .getServer(config.serverName)
      .propertiesSave(config.configName, properties, err => {
        if (err) throw err;
        response.wsMsgWindow(data.ws, `${config.configName} 更新完毕`);
        return true;
      });
  } catch (err) {
    MCSERVER.error(`${config.configName} 重读出错`, err);
    return false;
    response.wsMsgWindow(data.ws, `${config.configName} 重读出错:` + err);
  }
});

//从文件重新读取
WebSocketObserver().define("server/properties_update_reload", data => {
  let [serverName, filename = "server.properties"] = data.body;
  try {
    serverModel
      .ServerManager()
      .getServer(serverName)
      .propertiesRead(filename, () => {
        //再读一次
        let properties = serverModel.ServerManager().getServer(serverName).properties;
        if (properties == undefined) {
          response.wsMsgWindow(data.ws, "properties 文件不存在或读取出错，请先开启服务器以生成文件.");
          return;
        }
        //将数据在来一次，前端路由会动态处理
        return {
          run: serverModel.ServerManager().getServer(serverName).isRun(),
          serverName: serverName,
          properties: properties
        };
        //信息框
        response.wsMsgWindow(data.ws, "properties 配置重读刷新完毕");
      });
  } catch (err) {
    MCSERVER.error("properties 更新出错", err);
    response.wsMsgWindow(data.ws, "properties 更新出错:" + err);
  }
});
