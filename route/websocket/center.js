const { WebSocketObserver } = require("../../model/WebSocketModel");
const counter = require("../../core/counter");
const tools = require("../../core/tools");
const response = require("../../helper/Response");
const serverModel = require("../../model/ServerModel");
const { hash } = require("../../core/CryptoMine");
const fs = require("fs");
const os = require("os");
const mversion = require("../../helper/version");

const MB_SIZE = 1024 * 1024;
let serverM = serverModel.ServerManager();

//设置要定时清除的数据
counter.initData(() => {
  counter.set("notPermssionCounter", 0);
  counter.set("login", 0);
  counter.set("maybeLogin", 0);
  counter.set("passwordError", 0);
  counter.set("csrfCounter", 0);
});

const osUtils = require("os-utils");
//系统CPU
var cacheCPU = 0;
let cacheSystemInfo = null;
let usage = process.memoryUsage();

//init 记录器
MCSERVER.logCenter.initLogData("CPU", 24);
MCSERVER.logCenter.initLogData("RAM", 24);

// 数据缓存，以避免频繁请求带来的损耗
setInterval(function () {
  // CPU 值缓存
  osUtils.cpuUsage(function (v) {
    cacheCPU = (v * 100).toFixed(2);
    MCSERVER.dataCenter.cacheCPU = cacheCPU;
  });
  let sockec = 0;
  let banipc = 0;
  //统计在线 Ws
  for (let k in MCSERVER.allSockets) {
    if (MCSERVER.allSockets[k] == null) continue;
    sockec++;
  }
  //统计封号ip数量
  for (let k in MCSERVER.login) MCSERVER.login[k] > 10 ? banipc++ : banipc;

  //缓存值
  cacheSystemInfo = {
    rss: (usage.rss / MB_SIZE).toFixed(1),
    heapTotal: (usage.heapTotal / MB_SIZE).toFixed(1),
    heapUsed: (usage.heapUsed / MB_SIZE).toFixed(1),
    sysTotalmem: (os.totalmem() / MB_SIZE).toFixed(1),
    sysFreemem: (os.freemem() / MB_SIZE).toFixed(1),
    cpu: cacheCPU,
    uptime: os.uptime(),
    //more
    serverCounter: serverM.getServerCounter(),
    runServerCounter: serverM.getRunServerCounter(),
    WebsocketCounter: sockec,
    loginCounter: counter.get("login"), //登陆次数
    //banip: banipc, //封的ip
    banip: -1,
    //passwordError: counter.get("passwordError"), //密码错误次数
    passwordError: -1,
    userCounter: -1,
    userOnlineCounter: -1,
    csrfCounter: counter.get("csrfCounter"), //可能存在的CSRF攻击次数
    notPermssionCounter: counter.get("notPermssionCounter"), //API的无权访问
    root: mversion.root,
    verisonA: mversion.verisonA,
    verisonB: mversion.verisonB,
    system: mversion.system,
    isPanel: false
  };

  let useMemBai = ((os.freemem() / os.totalmem()) * 100).toFixed(0);
  //压入记录器
  MCSERVER.logCenter.pushLogData("CPU", tools.getMineTime(), parseInt(cacheCPU));
  MCSERVER.logCenter.pushLogData("RAM", tools.getMineTime(), 100 - useMemBai);

  setTimeout(() => counter.save(), 0); //让其异步地去保存
}, MCSERVER.localProperty.data_center_times);

//重启逻辑
WebSocketObserver().define("center/restart", data => {
  MCSERVER.log("Worker重启...");
  return process.nextTick(() => {
    process.send({ restart: "./app.js" });
    process.emit("SIGINT");
  });
});

//更新逻辑
WebSocketObserver().define("center/update", async data => {
  let { sign: remoteSign, buffer } = data.body;
  let now = Math.floor(Date.now() / 1000);
  let timeWindow = Math.floor(now / 120);
  let timeKey = hash.hmac(MCSERVER.localProperty.MasterKey, timeWindow.toString());
  let sign = hash.hmac(timeKey, buffer);
  if (sign !== remoteSign) return false;

  const target_path = "./app.apkg";
  fs.writeFileSync("./app.backup.apkg", fs.readFileSync(target_path))
  fs.writeFileSync(target_path, buffer);
  MCSERVER.log("[ 软件更新 ] Backend执行软件更新");

  MCSERVER.log("Worker重启...");
  return process.nextTick(() => {
    process.send({ restart: "./app.js" });
    process.emit("SIGINT");
  });
});

//数据中心
WebSocketObserver().define("center/show", data => cacheSystemInfo);
