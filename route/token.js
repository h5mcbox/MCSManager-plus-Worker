//基础的路由定义
const {Router} = require("express");
const router = Router();
const response = require("../helper/Response");
const permssion = require("../helper/Permission");
const TokenManager = require("../helper/TokenManager");
const counter = require("../core/counter");
const UUID = require("uuid");
const { hash } = require("../core/CryptoMine");

function getRandToken() {
  return permssion.randomString(6) + UUID.v4().replace(/-/gim, "");
}

//Token
router.get("/", function (req, res) {
  //ajax 会受到浏览器跨域限制，姑不能对其进行csrf攻击获取token，尽管它可伪造。
  let now = Math.floor(Date.now() / 1000);
  let timeWindow = Math.floor(now / 10);
  let timeKey = hash.hmac(MCSERVER.localProperty.MasterKey, timeWindow.toString());
  let isOk = req.query["apikey"] === timeKey;
  if (!isOk) {
    MCSERVER.log("[ Token ]", "未认证Backend 请求更新令牌 | 已经阻止");
    //用户未登录，返回一个随机的 token 给它，并且这个 token 与正常的 token 几乎一模一样
    response.returnMsg(res, "token", {
      token: getRandToken(),
    });
    return;
  }

  //永远生产一个新的
  let newtoken = getRandToken();
  TokenManager.addToken(newtoken);
  setTimeout(() => TokenManager.delToken(), 1000 * 15);

  MCSERVER.log("[ Token ]", "请求更新令牌 | 准许");

  response.returnMsg(res, "token", {
    token: newtoken,
  });
  res.end();
});

//模块导出
module.exports = router;

// res.header('X-Powered-By','Mcserver Manager HTT_P_SERVER');
//res.cookie('token_to',permssion.randomString(32));
