/*
 * @Author: Copyright(c) 2020 Suwings
 * @Date: 2020-10-08 13:28:28
 * @LastEditTime: 2021-02-12 12:02:24
 * @Description: 身份验证
 */
const serverModel = require("../model/ServerModel");

module.exports.isMaster = (key) => {
  return key===MCSERVER.localProperty.MasterKey;
};
module.exports.hasServer = (key, serverName) => {
  var isMaster=key===MCSERVER.localProperty.MasterKey;
  if (!isMaster) return false;

  return serverModel.ServerManager().isExist(serverName);
};
