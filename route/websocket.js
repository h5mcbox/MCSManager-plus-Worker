const { Router } = require("express");

const TokenManager = require("../helper/TokenManager");
const { WebSocketObserver } = require("../model/WebSocketModel");

const msgpack = require("../helper/msgpack");
const permssion = require("../helper/Permission");
const response = require("../helper/Response");
const counter = require("../core/counter");

const router = Router();

//WebSocket 会话类
class WebsocketSession {
  constructor(config = {}) {
    this.login = config.login || false;
    this.uid = config.uid || null;
    this.ws = config.ws || null;
    this.token = config.token || null;
    this.console = config.console || null;
  }
  send(data) {
    if (data) response.wsSend(data.ws, data.resK, data.resV, data.body);
  }

  getWebsocket() {
    return this.ws || null;
  }
}

//判断当前令牌者是否在线
function isWsOnline(token) {
  for (let k in MCSERVER.allSockets) {
    let wsSession = MCSERVER.allSockets[k];
    if (wsSession.token == token) {
      return true;
    }
  }
  return false;
}

// 最高心跳包延迟
const MAX_ALIVE_COUNT = 60;

//WebSocket 创建
router.ws("/ws", function (ws, req) {
  // 令牌
  let token = req.query[permssion.tokenName] || null;
  //无令牌 或 未登录
  if (!token) {
    counter.plus("csrfCounter");
    ws.close();
    return;
  }

  token = token.trim();
  let status = false;
  let wsAliveHBCount = MAX_ALIVE_COUNT;

  //临时的会话id  一般只用于内部验证是否是这个tcp链接
  let uid = permssion.randomString(12) + Date.parse(new Date()).toString();

  MCSERVER.log("[ WS CREATE ] 新的 Ws 创建 Token ID: [", token, "]");
  if (!TokenManager.hasToken(token)) {
    MCSERVER.warning("错误令牌的 WS 尝试建立链接 | 已经阻止");
    counter.plus("notPermssionCounter");
    ws.close();
    return;
  }

  //Token 任务完成 | 删除
  TokenManager.delToken(token);

  //唯一性检查
  if (isWsOnline(token)) {
    MCSERVER.warning("此令牌正在使用 | 阻止重复使用 | isWsOnline", [" 令牌值:", token].join(" "));
    ws.close();
    return;
  }

  //WebsocketSession 类生成
  let WsSession = new WebsocketSession({
    //Ws 判断身份条件,必须在 token 管理器与 Session 中认证登录
    login: true,
    uid: uid,
    ws: ws,
    token: token,
    console: null
  });

  //状态标识
  status = true;

  //放置全局在线列表
  MCSERVER.allSockets[uid] = WsSession;

  //检查通过..
  counter.plus("login");
  MCSERVER.log("[ WebSocket INIT ]", " Backend已与服务器建立链接");

  //数据到达事件
  ws.on("message", function (data) {
    try {
      //解码Message Pack数据包
      const [header, RequestValue] = msgpack.decode(data);
      const { RequestID } = header;

      //Websocket 心跳包 | 前端 10 秒递增链接健康指数
      //当网络延迟特别高时，也能很好的降低指数. 将来指数够低时，将自动优化数据的发送
      if (header.RequestKey == "HBPackage") {
        status = true;
        // 最高心跳包健康数
        wsAliveHBCount < MAX_ALIVE_COUNT && wsAliveHBCount++;
        return response.wsResponse({ws,RequestID,RequestKey:""},null);
      }

      WebSocketObserver().emit("ws/req", {
        ws: ws,
        req: req,
        header,
        RequestID,
        body: RequestValue,
        token: token,
        WsSession: WsSession
      });
    } catch (err) {
      MCSERVER.error("WebSocket 请求处理时异常:", err);
    }
  });

  //关闭事件
  ws.on("close", function () {
    WebSocketClose();
  });

  //Websocket 心跳包检查 | 10 秒递减一个链接健康指数
  var HBMask = setInterval(() => {
    // 超过指定次数不响应，代表链接丢失
    if (wsAliveHBCount <= 0) {
      MCSERVER.log("[ WebSocket HBPackage ]", "长时间未响应心跳包 | 已自动断开");
      WebSocketClose();
    }
    wsAliveHBCount--;
  }, 1000 * 10);


  //Websocket 关闭函数
  function WebSocketClose() {
    if (!status) return;

    ws.close();
    clearInterval(HBMask);
    status = false;

    //再删一次，保险
    TokenManager.delToken(token);
    WsSession = null;

    //释放全局变量
    delete MCSERVER.allSockets[uid];
    MCSERVER.log("[ WebSocket CLOSE ]", "Backend已经断开链接");
  }
});

//加载 ws 子路由
require("../core/tools").autoLoadModule("route/websocket/", "websocket/", (path) => {
  require(path);
});

//模块导出
module.exports = router;
