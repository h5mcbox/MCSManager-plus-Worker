/* eslint-disable no-unused-vars */
//入口文件更新
(function(){
  var fs=require("fs");
  fs.writeFileSync("./app.js",fs.readFileSync("./app.js"));
  var sharedObject=require.main.exports;
  if(sharedObject.mode==="recovery"){
    fs.writeFileSync("./app.apkg",fs.readFileSync(sharedObject.PACKAGEFILE));
    fs.unlinkSync(sharedObject.PACKAGEFILE);
    console.log("新版本文件损坏,还原更新...");
    process.send({restart:"./app.js"});
    process.exit();
  }else if(sharedObject.mode==="normal"){
    if(fs.existsSync("./app.backup.apkg")){
      fs.unlinkSync("./app.backup.apkg")
    };
  }
})();
//运行时环境检测
try {
  let versionNum = parseInt(process.version.replace(/v/gim, "").split(".")[0]);
  //尽管我们建议最低版本为 v14 版本
  if (versionNum < 14) {
    console.log("[ WARN ] 您的 Node 运行环境版本似乎低于我们要求的版本.");
    console.log("[ WARN ] 可能会出现未知情况,建议您更新 Node 版本 (>=14.0.0)");
  }
} catch (err) {
  //忽略任何版本检测导致的错误
}

if(!process.send){
  console.log("请运行app.js");
  process.exit(1);
}

//全局变量 MCSERVER
global.MCSERVER = {};

//测试时检测
MCSERVER.allError = 0;
//自动化部署测试
setTimeout(() => {
  let arg2 = process.argv[2] || "";
  if (arg2 == "--test") {
    MCSERVER.infoLog("Test", "测试过程结束...");
    if (MCSERVER.allError > 0) {
      MCSERVER.infoLog("Test", "测试未通过!");
      process.exit(500);
    }
    MCSERVER.infoLog("Test", "测试通过!");
    process.exit(0);
  }
}, 10000);

const fs = require("fs");

//全局仅限本地配置
MCSERVER.localProperty = {};

const tools = require("./core/tools");

//生成第一次配置文件
const INIT_CONFIG_PATH = "./model/init_config/";
const PRO_CONFIG = "./property.js";
if (!fs.existsSync(PRO_CONFIG)) tools.mCopyFileSync(INIT_CONFIG_PATH + "property.js", PRO_CONFIG);

//加载配置
require("./property");

const net = require("net");
const http = require("http");
const https = require("https");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
//gzip压缩
const compression = require("compression");

//各类层装载 与 初始化
const ServerModel = require("./model/ServerModel");
const counter = require("./core/counter");
const Schedule = require("./helper/Schedule");
//const NewsCenter = require("./model/NewsCenter");

//控制台颜色
const colors = require("colors");
colors.setTheme({
  silly: "rainbow",
  input: "grey",
  verbose: "cyan",
  prompt: "red",
  info: "green",
  data: "blue",
  help: "cyan",
  warn: "yellow",
  debug: "magenta",
  error: "red"
});

//logo输出
const LOGO_FILE_PATH = "./core/logo.txt";
let data = fs.readFileSync(LOGO_FILE_PATH, "utf-8");
console.log(data);

//全局数据中心 记录 CPU 内存
MCSERVER.dataCenter = {};

//装载log记录器
require("./core/log");
MCSERVER.info("Worker正在启动中...");

//全局登陆记录器
MCSERVER.login = {};
//全局 在线 Websocket 监视器
MCSERVER.allSockets = {};
//全局 数据内存记录器
MCSERVER.logCenter = {};
//PAGE 页面数据储存器
MCSERVER.PAGE = {};

if (!MCSERVER.localProperty.MasterKey) {
  MCSERVER.error("请于property.js最底部修改主密钥");
  process.exit();
}

//init
MCSERVER.logCenter.initLogData = (objStr, len, def = null) => {
  let tmp = [];
  for (let i = 0; i < len; i++) tmp.push(def);
  MCSERVER.logCenter[objStr] = tmp;
};

//压入方法
MCSERVER.logCenter.pushLogData = (objStr, k, v) => {
  MCSERVER.logCenter[objStr] = MCSERVER.logCenter[objStr].slice(1);
  MCSERVER.logCenter[objStr].push({
    key: k,
    val: v
  });
};

//exp 框架
var app = express();

//HSTS
app.use(function (req, res, next) {
  if (req.socket.encrypted && MCSERVER.localProperty.hsts) {
    res.header("Strict-Transport-Securit", `max-age=${MCSERVER.localProperty.hsts_long};`);
  }
  next();
});

//服务器实例初始化
(function () {
  var host = MCSERVER.localProperty.http_ip;
  var port = MCSERVER.localProperty.http_port;
  if (host == "::") host = "127.0.0.1";
  function appWrapper(...args) {
    return app.call(this, ...args);
  }
  function HTTPService(req, res) {
    var host = req.headers["host"];
    res.writeHead(301, {
      Location: `https://${host}${req.url}`
    });
    res.end();
  }
  function BaseService(socket) {
    /*From here:https://stackoverflow.com/questions/22453782/nodejs-http-and-https-over-same-port*/
    socket.once('data', function (buf) {
      socket.pause();
      // A TLS handshake record starts with byte 22.
      var proxy = ((buf[0] === 22) ? MCSERVER.HTTPSInstance : MCSERVER.HTTPInstance) || MCSERVER.HTTPInstance;
      socket.unshift(buf);
      proxy.emit("connection", socket);
      process.nextTick(() => socket.resume());
    });
  }
  const BaseInstance = net.createServer(BaseService);
  var HTTPInstance, HTTPSInstance;
  switch (MCSERVER.localProperty.listen_type) {
    case "strict":
      HTTPInstance = http.createServer(HTTPService);
      HTTPSInstance = https.createServer({
        cert: fs.readFileSync(MCSERVER.localProperty.cert_path),
        key: fs.readFileSync(MCSERVER.localProperty.key_path)
      }, appWrapper);
      break;
    case "mixed":
      HTTPInstance = http.createServer(appWrapper);
      HTTPSInstance = https.createServer({
        cert: fs.readFileSync(MCSERVER.localProperty.cert_path),
        key: fs.readFileSync(MCSERVER.localProperty.key_path)
      }, appWrapper);
      break;
    case "onlyhttp":
      HTTPInstance = http.createServer(appWrapper);
      break;
    default:
      throw new TypeError("无效监听方式");
  }
  if (HTTPSInstance) MCSERVER.HTTPSInstance = HTTPSInstance;
  MCSERVER.HTTPInstance = HTTPInstance;
  MCSERVER.BaseInstance = BaseInstance;
})();

//web Socket 框架
require("express-ws")(app, MCSERVER.HTTPSInstance);

//Cookie and Session 的基础功能
app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: false
  })
);
app.use(express.json());

var UUID = require("uuid");
app.use(
  session({
    secret: UUID.v4(),
    name: "MCSM_SESSION_ID",
    cookie: {
      maxAge: MCSERVER.localProperty.session_max_age * 1000 * 60
    },
    resave: false,
    saveUninitialized: false
  })
);

//使用 gzip 静态文本压缩，但是如果你使用反向代理或某 HTTP 服务自带的gzip，请关闭它
if (MCSERVER.localProperty.is_gzip) app.use(compression());

//基础根目录
//app.use("/public", express.static("./public"));
app.get("/",function(req,res){
  res.writeHead(200);
  res.write("<h1>This is just a stub.</h1>")
  res.end();
})

// console 中间件挂载
app.use((req, res, next) => {
  // 部分请求不必显示
  if (req.originalUrl.indexOf("/api/") == -1 && req.originalUrl.indexOf("/fs/") == -1 && req.originalUrl.indexOf("/fs_auth/") == -1 && req.originalUrl.indexOf("/fs_auth/") == -1) {
    // MCSERVER.log('[', req.method.cyan, ']', '[', req.ip, ']', req.originalUrl);
  }
  if (MCSERVER.localProperty.is_allow_csrf) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
  }
  res.header("X-Frame-Options", "DENY");
  next();
});

//基础的根目录路由

//自动装载所有路由
let routeList = fs.readdirSync("./route/");
for (let key in routeList) {
  let name = routeList[key].replace(".js", "");
  app.use("/" + name, require("./route/" + name));
}

function errorHandler(reason) {
  //是否出过错误,本变量用于自动化测试
  MCSERVER.allError++;
  //打印出错误
  MCSERVER.error("错误报告:", reason);
}

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);

//初始化目录结构环境
(function initializationRun() {
  const SERVER_PATH = "./server/";
  const SERVER_PATH_CORE = "./server/server_core/";
  const SERVER_PATH_SCH = "./server/schedule/";
  const CENTEN_LOG_JSON_PATH = "./core/info.json";
  const RECORD_PARH = "./server/record_tmp/";

  try {
    if (!fs.existsSync(SERVER_PATH)) fs.mkdirSync(SERVER_PATH);
    if (!fs.existsSync(SERVER_PATH_CORE)) fs.mkdirSync(SERVER_PATH_CORE);
    if (!fs.existsSync(SERVER_PATH_SCH)) fs.mkdirSync(SERVER_PATH_SCH);
    if (!fs.existsSync(RECORD_PARH)) fs.mkdirSync(RECORD_PARH);

    // 生成不 git 同步的文件
    if (!fs.existsSync(CENTEN_LOG_JSON_PATH)) tools.mCopyFileSync(INIT_CONFIG_PATH + "info_reset.json", CENTEN_LOG_JSON_PATH);
  } catch (err) {
    MCSERVER.error("初始化文件环境失败,建议重启,请检查以下报错:", err);
  }
})();

app.use("/public",express.static("./public"));
//开始对 Oneline File Manager 模块进行必要的初始化
MCSERVER.infoLog("OnlineFs", "正在初始化文件管理路由与中间件 ");

//fs API 请求必须为 Ajax 请求，得以保证跨域阻止
app.use(["/fs/mkdir", "/fs/rm", "/fs/patse", "/fs/cp", "/fs/rename", "/fs/ls"], function (req, res, next) {
  if (req.xhr) {
    next();
    return;
  }
  res.status(403).send("禁止访问:权限不足！您不能直接访问文件在线管理程序 API，请通过正常流程！");
});

//载入在线文件管理路由
app.use("/fs_auth", require("./onlinefs/controller/auth"));
app.use("/fs", require("./onlinefs/controller/function"));
//初始化各个模块
(function initializationProm() {
  counter.init();

  MCSERVER.infoLog("Module", "正在初始化服务端管理模块");
  ServerModel.ServerManager().loadALLMinecraftServer();

  MCSERVER.infoLog("Module", "正在初始化计划任务模块");
  Schedule.init();

  var host = MCSERVER.localProperty.http_ip;
  var port = MCSERVER.localProperty.http_port;

  if (host == "::") host = "127.0.0.1";

  //App Http listen
  MCSERVER.BaseInstance.listen(port, host, () => {
    MCSERVER.infoLog("BaseService", "BaseService 模块监听: [ //" + (host || "127.0.0.1".yellow) + ":" + port + " ]");

    MCSERVER.infoLog("INFO", "配置文件: property.js 文件");
    MCSERVER.infoLog("INFO", "文档参阅: https://github.com/Suwings/mcsmanager");

    if (MCSERVER.allError <= 0) {
      MCSERVER.infoLog("INFO", "Worker已经启动");
    } else {
      MCSERVER.infoLog("INFO", "Worker启动异常");
    }
  });
})();

//用于捕捉前方所有路由都未经过的请求，则可为 404 页面
app.get("*", function (req, res) {
  //404 页面
  res.status(404);
  res.setHeader("Content-Type","text/html");
  res.send(fs.readFileSync("./public/404.html"));
  res.end();
});

/*
//For privacy,Skipped;
//设置定时获取最新新闻动态
nodeSchedule.scheduleJob("59 59 23 * * *", function () {
  MCSERVER.infoLog("INFO", "自动更新新闻动态与最新消息");
  NewsCenter.requestNews();
});
//重启自动获取一次
NewsCenter.requestNews();
*/

//程序退出信号处理
require("./core/procexit");
