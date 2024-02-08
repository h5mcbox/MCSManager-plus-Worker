function flatObject(obj, prefix = "", result = []) {
  for (let [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result.push([`${prefix}/${key}`, value.join(","), true]);
    } else if (typeof value === "object" && value !== null) {
      if (Object.keys(value).length == 0) {
        result.push([`${prefix}/${key}`, {}, false]);
      } else {
        flatObject(value, `${prefix}/${key}`, result);
      }
    } else {
      result.push([`${prefix}/${key}`, value, false]);
    }
  }
  return result.map(([k, v, isArray]) => ([k.substring(1), v, isArray]));
}
/**
 * @param {[string,any,boolean][]} objectMap 
 * @param {*} result 
 */
function deflatObject(objectMap, result = {}) {
  for (let [k, v, isArray] of objectMap) {
    let frag = k.split("/");
    let curObject = result;
    frag.forEach((key, index) => {
      if (index == frag.length - 1) {
        if (!isArray) curObject[key] = v;
        else curObject[key] = v.split(",");
      } else {
        if (!curObject[key]) curObject[key] = {};
        curObject = curObject[key];
      }
    })
  }
  return result;
}
module.exports = {
  flat: flatObject,
  deflat: deflatObject
}