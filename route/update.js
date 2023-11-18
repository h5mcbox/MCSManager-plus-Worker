const {Router} = require("express");
const router = Router();
const fs = require("fs");
const { hash } = require("../core/CryptoMine");

router.post("/", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin","*")
  let now = Math.floor(Date.now() / 1000);
  let timeWindow = Math.floor(now / 120);
  let timeKey = hash.hmac(MCSERVER.localProperty.MasterKey, timeWindow.toString());
  if (req.query["apikey"] !== timeKey) {
    return res.status(403).send("权限不足");
  } else {
    next();
  }
}, async (req, res) => {
  // 仅限于管理员使用
  const target_path="./app.apkg";
  var bufs=[];
  var onFinished=new Promise((resolve,reject)=>req.on("data",e=>bufs.push(e)).on("end",_=>resolve(Buffer.concat(bufs))).on("error",reject));
  var buffer=await onFinished;
  fs.writeFileSync("./app.backup.apkg",fs.readFileSync(target_path))
  fs.writeFileSync(target_path,buffer);
  MCSERVER.log("[ 文件上传 ] Backend上传文件到", target_path);
  res.send("Done");
  res.end();
  process.send({restart:"./app.js"});
  MCSERVER.log("重启Worker...");
  process.emit("SIGINT");
});

//模块导出
module.exports = router;
