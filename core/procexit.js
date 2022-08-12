// MCserver Manger 程序退出
const serverModel = require("../model/ServerModel");
const counter = require("./counter");

let _endFlag = false;
process.on("SIGINT", function () {
  if (_endFlag) return;
  _endFlag = true;
  MCSERVER.infoLog("PROCESS", "Worker正在结束与回收资源,请稍等...");

  // 保存
  counter.save();
  serverModel.ServerManager().saveAllMinecraftServer();

  // 关闭所有服务器
  let servers = serverModel.ServerManager().getServerObjects();
  for (let k in servers) {
    let server = servers[k];
    try {
      server.stopServer();
    } catch (serverErr) {
      continue;
    }
  }

  // 异步等待3秒，控制面板自动结束
  setTimeout(() => {
    MCSERVER.infoLog("PROCESS", "EXIT...");
    process.exit(0);
  }, 3000);
});
