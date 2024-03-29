const { WebSocketObserver } = require("../../model/WebSocketModel");
const serverModel = require("../../model/ServerModel");
const response = require("../../helper/Response");
const tools = require("../../core/tools");
const fs = require("fs");
const childProcess = require("child_process");

//Docker 镜像构建结果储存
MCSERVER.PAGE.DockerRes = [];

//Docker 容器创建路由
WebSocketObserver().define("docker/new", data => {
  let dockerConfig = data.body;
  //{dockerImageName: "",
  //dockerfile: "FROM java:latest↵RUN mkdir -p /mcsd↵RUN echo "Asia…teractive tzdata↵WORKDIR / mcsd↵RUN apt - get update"}
  let dockerImageName = dockerConfig.dockerImageName;
  let dockerfileData = dockerConfig.dockerfile;

  if (dockerImageName.trim() == "") return;

  function pushRes(text) {
    MCSERVER.PAGE.DockerRes.unshift({
      time: tools.getFullTime(),
      name: dockerImageName.trim(),
      res: text
    });
  }
  //任务列表
  pushRes("正在构建...");

  MCSERVER.warning("正在创建 Docker 镜像.");
  MCSERVER.warning("镜像名字:", dockerImageName);
  dockerfileData = dockerfileData.replace(/&gt;/gim, ">");
  dockerfileData = dockerfileData.replace(/&lt;/gim, "<");
  dockerfileData = dockerfileData.replace(/&nbsp;/gim, " ");
  MCSERVER.warning("DockerFile:\n", dockerfileData);

  response.wsMsgWindow(data.ws, "镜像正在创建中，请稍等....");
  try {
    if (!fs.existsSync("./docker_temp")) fs.mkdirSync("./docker_temp");
    fs.writeFileSync("./docker_temp/dockerfile", dockerfileData);

    let process = childProcess.spawn("docker", ["build", "-t", dockerImageName.trim(), "./docker_temp/"], {
      cwd: ".",
      stdio: "pipe"
    });
    process.on("exit", (code) => {
      console.log("EXIT", code);
      if (code == 0) {
        response.wsMsgWindow(data.ws, ["镜像", dockerImageName, "创建完毕."].join(" "));
        pushRes("成功");
      } else {
        response.wsMsgWindow(data.ws, ["镜像", dockerImageName, "构建失败，原因未知."].join(" "));
        pushRes("失败");
      }
    });
    process.on("error", () => {
      pushRes("构建出错");
    });
    return true;
    // process.stdout.on('data', data => console.log(iconv.decode(data, 'utf-8')));
    // process.stderr.on('data', data => console.log(iconv.decode(data, 'utf-8')));
  } catch (err) {
    MCSERVER.warning("创建出错：", err);
    pushRes("构建错误");
    return false;
  }
});

//结果列表获取
//路由
WebSocketObserver().define("docker/res", data => MCSERVER.PAGE.DockerRes);

//获取配置
WebSocketObserver().define("docker/config", data => {
  let serverName = data.body || "";
  if (serverName) {
    let mcserver = serverModel.ServerManager().getServer(serverName);
    mcserver.dataModel.save();
    return mcserver.dataModel.dockerConfig;
  }
  return false;
});

//设置配置
WebSocketObserver().define("docker/setconfig", data => {
  // {
  //     serverName: "xxxx",
  //     dockerConfig: { ... }
  // }
  let jsonObj = data.body;
  if (jsonObj.serverName) {
    let serverName = jsonObj.serverName;
    let mcserver = serverModel.ServerManager().getServer(serverName);
    mcserver.dataModel.dockerConfig = jsonObj.dockerConfig;
    mcserver.dataModel.save();
    response.wsMsgWindow(data.ws, "操作成功，数据已保存");
    return true;
  }
});
