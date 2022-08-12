let onlyTokenManager = new Set();

module.exports.addToken = (key) => {
  if (onlyTokenManager.size >= 20) {
    //Token 请求最大等待队列长度,超过则统一删除
    onlyTokenManager.clear();
  }
  onlyTokenManager.add(key);
};

module.exports.hasToken = (key) => {
  return hasToken=onlyTokenManager.has(key);
};
module.exports.delToken = (key) => {
  onlyTokenManager.delete(key);
};