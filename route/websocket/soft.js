const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");

//获取信息
WebSocketObserver().define("soft/view", data => {
  return {
    softConfig: MCSERVER.softConfig
  };
});

//更新配置
WebSocketObserver().define("soft/update", data => {
  let newConfig = data.body;
  if (newConfig) {
    for (let k in MCSERVER.softConfig) {
      if (k == "__filename__") continue;
      MCSERVER.softConfig[k] = newConfig[k];
    }
  }
  MCSERVER.softConfig.save();
  response.wsMsgWindow(data.ws, "修改完成，部分内容重启控制面板生效 √");
});
