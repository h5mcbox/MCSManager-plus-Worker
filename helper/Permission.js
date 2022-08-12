function randomString(len) {
  len = len || 32;
  var $chars = "ABCDEFGHIJKLNMOPQRSTUVWXYZabcdefghijklnmopqrstuvwxyz1234567890_";
  var maxPos = $chars.length;
  var pwd = "";
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

function defaultFalseCallBack(req, res, ResponseKey, ResponseValue, notAjaxRedirect) {
  if (req.xhr) {
    res.send({
      ResponseKey: ResponseKey,
      ResponseValue: ResponseValue
    });
  } else {
    res.redirect(notAjaxRedirect || "./error/notlogin");
  }
  res.end();
}

module.exports.randomString = randomString;

const TOKEN_NAME = "_T0K_N";
module.exports.tokenName = TOKEN_NAME;
module.exports.tokenCheck = (req, res, trueCallBack, falseCallBack) => {
  if (req.session["token"] && req.query[TOKEN_NAME]) {
    if (req.session["token"] == req.query[TOKEN_NAME]) {
      //不开启一次性 Token
      // req.session['token'] = randomString(32);
      trueCallBack && trueCallBack();
      //new token
      return;
    }
  }
  falseCallBack ? falseCallBack() : defaultFalseCallBack(req, res, "user/status", "NotToken", "/error/token");
};

//是否到期时间已经到达
module.exports.isTimeLimit = (deallineStr) => {
  if (!deallineStr || deallineStr.length < 1) {
    return false;
  }
  let dealTime = new Date(deallineStr);
  let nowTime = new Date();
  return nowTime >= dealTime;
};
