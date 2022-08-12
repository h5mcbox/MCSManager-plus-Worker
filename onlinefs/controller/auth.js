const express = require("express");
const router = express.Router();
const { FileOperateStructure } = require("../model/fsoperate_session");
const permission = require("../../helper/Permission");
const serverModel = require("../../model/ServerModel");
const {hash}=require("../../core/CryptoMine");
const pathm = require("path");

const SERVERS_DIR = "./server/server_core/";

router.all("/auth_master/pwd", (req, res) => {
  let now=Math.floor(Date.now()/1000);
  if(!req.session["logined"]||(now > req.session["loginExpired"])){
    let timeWindow=Math.floor(now/15);
    let timeKey=hash.hmac(MCSERVER.localProperty.MasterKey,timeWindow.toString());
    let isOk = req.query["key"]===timeKey;
    //基础检查
    if (!isOk) {
      res.send("[ 权限阻止 ] 您未获授权");
      return;
    }
    req.session["logined"]=true;
    req.session["loginExpired"]=now+600;
  }

  // 判断是否为管理员
  MCSERVER.log("[Online Fs]", "Backend访问服务端存放目录");
  const absServersDir = pathm.normalize(pathm.join(pathm.join(__dirname, "../../"), SERVERS_DIR));
  req.session.fsos = new FileOperateStructure(absServersDir, "./");
  req.session.fsoperate = {};
  req.session.fsoperate.tmp = [];
  req.session.save();
  res.redirect("/public/onlinefs_public");
});

//自定义扩展
router.all("/auth/:servername", (req, res) => {
  let serverName = req.params.servername;

  let now=Math.floor(Date.now()/1000);
  if(!(req.session["tlogined"]||[])[serverName]||(now > (req.session["tloginExpired"]||[])[serverName])){
    let timeWindow=Math.floor(now/15);
    let timeKey=hash.hmac(MCSERVER.localProperty.MasterKey,serverName+timeWindow.toString());
    let isOk = req.query["key"]===timeKey;
    //基础检查
    if (!isOk) {
      res.send("[ 权限阻止 ] 您未获授权");
      return;
    }
    if(!req.session["tlogined"]){
      req.session["tlogined"]=[];
      req.session["tloginExpired"]=[];
    }
    req.session["tlogined"][serverName]=true;
    req.session["tloginExpired"][serverName]=now+600;
  }


  let dataModel = null;
  if (serverModel.ServerManager().isExist(serverName) ) {
    dataModel = serverModel.ServerManager().getServer(serverName).dataModel || null;
  }
  if (!dataModel || !dataModel.cwd) {
    res.send("[ 权限阻止 ] dataModel 空，无权限操作的服务器！");
    return;
  }
  let cwd = null;
  if (!pathm.isAbsolute(dataModel.cwd)) cwd = pathm.normalize(pathm.join(pathm.join(__dirname, "../../"), dataModel.cwd));
  else cwd = dataModel.cwd;
  MCSERVER.log("[Online Fs]","访问服务器", serverName, "根:", cwd);

  req.session.fsos = new FileOperateStructure(cwd, "./");
  req.session.fsoperate = {};
  req.session.fsoperate.tmp = [];
  req.session.save();
  res.redirect("/public/onlinefs_public");
});

router.all("/logout", (req, res) => {
  req.session.fsos = null;
  req.session.fsoperate = null;
  res.send("<script> window.close();</script>");
});

module.exports = router;
