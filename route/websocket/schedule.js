const { WebSocketObserver } = require("../../model/WebSocketModel");
const permssion = require("../../helper/Permission");
const response = require("../../helper/Response");
const schedulejob = require("../../helper/Schedule");
const tools = require("../../core/tools");

//每个服务器最大数量计划任务
const MAX_MASK = MCSERVER.localProperty.schedule_max || 10;

//创建计划任务函数
function CreateScheduleJob(obj) {
  let id = tools.randomString(6) + "_" + new Date().getTime();
  schedulejob.createScheduleJobCount(id, obj.time, obj.count, obj.commande, obj.servername);
}

//过滤计划任务列表
function getMineScheduleList(servername) {
  let list = MCSERVER.Schedule.dataModel.list;
  const sendlist = [];
  for (const iterator of list) {
    if (iterator && iterator.servername == servername) {
      sendlist.push(iterator);
    }
  }
  return sendlist;
}

//列出计划任务
WebSocketObserver().listener("schedule/list", (data) => {
  let servername = data.body;
  // let list = MCSERVER.Schedule.dataModel.list;
  let sendlist = getMineScheduleList(servername);

    response.wsSend(data.ws, "schedule/list", {
      servername: servername,
      schedules: sendlist
    });
});

//创建计划任务
WebSocketObserver().listener("schedule/create", (data) => {
  let obj = JSON.parse(data.body) || {};

    try {
      const list = getMineScheduleList(obj.servername);
      if (list.length > MAX_MASK) {
        response.wsMsgWindow(data.ws, "到达创建数量上限！");
        return;
      }
      CreateScheduleJob(obj);
      response.wsMsgWindow(data.ws, "创建计划任务成功 √");
    } catch (err) {
      response.wsMsgWindow(data.ws, "错误！创建失败:" + err);
    }
});

//删除计划任务
WebSocketObserver().listener("schedule/delete", (data) => {
  let obj = JSON.parse(data.body) || {};
    try {
      schedulejob.deleteScheduleJob(obj.id || "");
      response.wsMsgWindow(data.ws, "删除序号:" + obj.id + "计划任务");
    } catch (err) {
      response.wsMsgWindow(data.ws, "删除失败！" + err);
    }
});
