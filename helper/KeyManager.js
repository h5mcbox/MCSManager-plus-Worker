const serverModel = require("../model/ServerModel");

module.exports.isMaster = (key) => {
  return key===MCSERVER.localProperty.MasterKey;
};
module.exports.hasServer = (key, serverName) => {
  var isMaster=key===MCSERVER.localProperty.MasterKey;
  if (!isMaster) return false;

  return serverModel.ServerManager().isExist(serverName);
};
