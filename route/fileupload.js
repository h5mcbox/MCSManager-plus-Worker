const {Router} = require("express");
const router = Router();
const pathm = require("path");
const os = require("os");
const fs = require("fs");
const fsex = require("fs-extra");
const {hash} = require("../core/CryptoMine");

const multer = require("multer");
const upload = multer({ dest: "tmp_upload/" });

router.post("/",(req,res,next)=>{
  // 任意目录的文件上传，仅限于管理员使用
  let now=Math.floor(Date.now()/1000);
  let timeWindow=Math.floor(now/600);
  let timeKey=hash.hmac(MCSERVER.localProperty.MasterKey,timeWindow.toString());
  if (req.query["apikey"]!==timeKey) {
    return res.status(403).send("权限不足");
  }else{
    next();
  }
}, upload.single("upload_file"), (req, res) => {
  // 文件上传域
  if (req.file && req.body["cwd"]) {
    const target_path = req.body["cwd"];
    if (!fs.existsSync(target_path)) fsex.mkdirSync(target_path);
    const originalname = req.file.originalname;
    const dstPath = pathm.join(target_path, originalname);
    fsex.rename(req.file.path, dstPath, (err) => {
      if (err) {
        res.status(500).send("上传虽然成功，但是处理文件出错: " + err);
      } else {
        MCSERVER.log("[ 文件上传 ] Backend上传文件到", target_path);
        res.send("Done");
      }
      fsex.remove(req.file.path, () => {});
    });
  }
});

//模块导出
module.exports = router;
