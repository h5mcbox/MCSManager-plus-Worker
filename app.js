const VERSION = 0;
const PACKAGEFILE = "./app.apkg";
const BACKUPPACKAGEFILE = "./app.backup.apkg";
const PUBLICKEY = "AtUOYcgW3LSjxqEOCSWGtpw8xu1YoZDMudoMBehZK76O";
function moduleEntry(returnMethod) {
  //unpacker
  let unpack = (function () {
    let CryptoMine = (function () {
      const { createHash } = require('crypto');
      const hash = data => createHash('sha256').update(data).digest('hex');

      const ECC = function simpleECC(basePoint, a, b, p, n, hl, hashFunction) {
        const curveSet = {
          "secp256k1": [
            {
              x: 55066263022277343669578718895168534326250603453777594175500187360389116729240n,
              y: 32670510020758816978083085130507043184471273380659243275938904335757337482424n
            },
            0n,
            7n,
            2n ** 256n - 2n ** 32n - 2n ** 9n - 2n ** 8n - 2n ** 7n - 2n ** 6n - 2n ** 4n - 1n,
            2n ** 256n - 432420386565659656852420866394968145599n,
            32,
            hash
          ]
        }
        if (typeof basePoint === "string") {
          if (basePoint in curveSet) {
            return simpleECC(...curveSet[basePoint]);
          } else {
            throw new Error("Need an vaild curve.");
          }
        } else if (typeof basePoint === "object") {
          if (typeof basePoint.x !== "bigint" && typeof basePoint.y !== "bigint") {
            throw new Error("Need an vaild base point.");
          }
          if (typeof a !== "bigint") {
            throw new Error("Need an vaild parameter.");
          }
          if (typeof b !== "bigint") {
            throw new Error("Need an vaild parameter.");
          }
          if (typeof p !== "bigint") {
            throw new Error("Need an vaild parameter.");
          }
          if (typeof n !== "bigint") {
            throw new Error("Need an vaild parameter.");
          }
        }
        let cryptoKeyMap = new WeakMap();
        function importKey(exportable, Key) {
          if (!((Key instanceof ArrayBuffer) || (Key instanceof Uint8Array))) throw new Error("You can't import key because Key is not a instance of ArrayBuffer or a Uint8Array");
          if (Key instanceof ArrayBuffer) Key = new Uint8Array(Key);
          let type;
          if (Key[0] == 5) {
            type = "private";
          } else if (Key[0] == 2 || Key[0] == 3) {
            type = "public";
          } else {
            throw new Error("Unknown key type.");
          }
          if (type === "private") {
            let pk = BufferToBigInt(Key.slice(1));
            return new cryptoKey(type, exportable, pk);
          } else if (type === "public") {
            let keyx = BufferToBigInt(Key.slice(1));
            return new cryptoKey(type, exportable, uncompressPoint(keyx, !(Key[0] % 2)));
          }
        }
        class cryptoKey {
          type;
          exportable;
          revokeKey() { cryptoKeyMap.delete(this); }
          constructor(type, exportable, key) {
            this.type = type;
            this.exportable = exportable;
            let KeyDescription = { type, key, exportable };
            Object.freeze(this);
            cryptoKeyMap.set(this, KeyDescription);
          }
        }
        //There passed curve check for performance
        function modPow(b, e, m) {
          if (m == 1n) {
            return 0;
          } else {
            let r = 1n;
            b = b % m;
            while (e > 0n) {
              if (e % 2n == 1n) {
                r = (r * b) % m;
              }
              e = e >> 1n;
              b = (b ** 2n) % m;
            }
            return r;
          }
        }
        let p1 = (p + 1n) / 4n; //Pre-compute (P+1)/4
        function uncompressPoint(x, canDevideBy2) {
          let c = x ** 3n + a * x + b;
          let y = modPow(c, p1, p);
          return new Point(x, (!(y % 2n) === canDevideBy2) ? y : p - y);
        }
        function get_inverse(b, p) {
          function get_inv(x, y, p) {
            return x <= 1n ? 1n : get_inv(y % x, y, p) * (y - y / x) % p;
          }
          return get_inv(b % p, p, p);
        }
        function removePad(u) {
          for (let i = 0; i < u.length; i++) {
            if (!u[i]) continue;
            return u.slice(i);
          }
          return new Uint8Array(0);
        }
        function mod(a, b) {
          let t = a % b;
          return t >= 0 ? t : b + t;
        }
        class Point {
          constructor(x = 0n, y = 0n) {
            this.x = x;
            this.y = y;
          }
          /** @param {Point} pB */add(pB) { return pointAdd(this, pB); }
          /** @param {BigInt} n */mul(n) { return pointMul(n, this); }
        }

        function pointAdd(p, q) {
          return fromJacobian(jacobianAdd(toJacobian(p), toJacobian(q)));
        };
        function pointMul(n, p) {
          return fromJacobian(jacobianMultiply(toJacobian(p), n));
        };
        /**
         * @param {Point} pA 
         * @returns {jacobianPoint}
         */
        function toJacobian(pA) {
          return new jacobianPoint(pA.x, pA.y, 1n);
        };
        /**
         * @param {jacobianPoint} pA 
         * @returns {Point}
         */
        function fromJacobian(pA) {
          let z = get_inverse(pA.z, p);
          let point = new Point(
            mod(pA.x * (z ** 2n), p),
            mod(pA.y * (z ** 3n), p)
          );
          return point;
        };
        class jacobianPoint {
          constructor(x = 0n, y = 0n, z = 0n) {
            this.x = x;
            this.y = y;
            this.z = z;
          }
        }
        /**
         * 
         * @param {jacobianPoint} pA 
         * @returns {jacobianPoint}
         */
        function jacobianDouble(pA) {
          if (pA.y == 0) {
            return new jacobianPoint(0n, 0n, 0n);
          };
          let r = mod(3n * pA.x ** 2n + a * pA.z ** 4n, p);
          let y2 = mod(pA.y ** 2n, p);
          let t = mod(4n * pA.x * y2, p);
          let x = mod(r ** 2n - 2n * t, p);
          let y = mod(r * (t - x) - 8n * y2 ** 2n, p);
          let z = mod(2n * pA.y * pA.z, p);
          return new jacobianPoint(x, y, z);
        };

        /**
         * 
         * @param {jacobianPoint} pA 
         * @param {jacobianPoint} pB 
         * @returns {jacobianPoint}
         */
        function jacobianAdd(pA, pB) {
          if (pA.y == 0n) {
            return pB;
          };
          if (pB.y == 0n) {
            return pA;
          };
          let yBzA3 = mod(pB.y * (pA.z ** 3n), p);
          let yAzB3 = mod(pA.y * (pB.z ** 3n), p);
          let u = yBzA3 - yAzB3;
          let xAzB2 = mod(pA.x * (pB.z ** 2n), p);
          let xBzA2 = mod(pB.x * (pA.z ** 2n), p);
          let v = xBzA2 - xAzB2;
          if (xAzB2 === xBzA2) {
            if (yAzB3 === yBzA3) {
              return jacobianDouble(pA);
            } else {
              return new jacobianPoint(0n, 0n, 1n);
            }
          }
          let v2 = mod(v * v, p);
          let v3 = mod(v2 * v, p);
          let xAzB2v2 = mod(xAzB2 * v2, p);
          let x = mod(u ** 2n - v3 - 2n * xAzB2v2, p);
          let y = mod(u * (xAzB2v2 - x) - pA.y * (pB.z ** 3n) * (v3), p);
          let z = mod(v * pA.z * pB.z, p);
          return new jacobianPoint(x, y, z);
        };
        function jacobianMultiply(pA, k) {
          if (pA.y === 0n || k === 0n) {
            return new Point(0n, 0n, 1n);
          };
          if (k === 1n) {
            return pA;
          };
          if (k < 0n || k >= n) {
            return jacobianMultiply(pA, mod(k, n));
          };
          let nextLevel = jacobianDouble(jacobianMultiply(pA, k / 2n));
          if (mod(k, 2n) === 0n) {
            return nextLevel;
          };
          if (mod(k, 2n) === 1n) {
            return jacobianAdd(nextLevel, pA);
          };
          throw new Error(`unexcept number or point.`);
        };
        let BasePoint = new Point(basePoint.x, basePoint.y);
        function HEXtoNumber(HEX) {
          return BigInt("0x" + HEX);
        }
        function BufferToBigInt(b) {
          let r = 0n;
          for (let num of b) r = r * 256n + BigInt(num);
          return r;
        }
        function verifysign(data, sign, PublicKey) {
          if (!cryptoKeyMap.has(PublicKey)) throw new Error("This cryptoKey cannot verify the data.");
          let z = HEXtoNumber(hashFunction(data));
          let entry = cryptoKeyMap.get(PublicKey);
          if (typeof Buffer !== "undefined" && sign instanceof Buffer) sign = new Uint8Array(sign);
          let rB = sign.slice(0, hl), sB = sign.slice(hl, 2 * hl);
          let rrB = removePad(rB), rsB = removePad(sB);
          let r = BufferToBigInt(rrB), s = BufferToBigInt(rsB);
          let s_inverse = get_inverse(s, n);
          let u1 = (s_inverse * z) % n;
          let u2 = (s_inverse * r) % n;
          let p1 = BasePoint.mul(u1);
          /** @type {Point} */let PublicPoint = entry.key;
          let p2 = PublicPoint.mul(u2);
          let p3 = p1.add(p2);
          return p3.x === r;
        }
        return {
          importKey,
          cryptoKey,
          ECDSA: {
            verify: verifysign
          },
          PointTools: {
            basePoint,
            Point,
            uncompressPoint,
            pointAdd(pa, pb) { return pointAdd(pa, pb, a, p) },
            pointMul(n, pa) { return pointMul(n, pa, a, p) }
          }
        }
      }
      return { hash, ECC };
    })();
    const { hash } = CryptoMine;
    const ECC = CryptoMine.ECC("secp256k1");
    const path = require("path");
    const { brotliDecompressSync } = require("node:zlib");
    let root = path.resolve(".");
    function normalize(_path) {
      return "." + path.resolve(_path).substring(root.length);
    }
    const fromHEXString = hexString =>
      new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    /**
     * @param {Buffer|Uint8Array} package 
     */
    function read(currentVersion = VERSION, package, _PublicKey = PUBLICKEY) {
      let Header;
      package = brotliDecompressSync(package);
      let fileHeaderBuf = package.subarray(package.lastIndexOf(10));
      let fileHeader = (new TextDecoder).decode(fileHeaderBuf);
      try {
        Header = JSON.parse(fileHeader);
      } catch {
        throw new TypeError("错误:资源文件头无效");
      }
      function isSigned() {
        return ECC.ECDSA.verify(`${Header.version}:${JSON.stringify(Header.entries)}`, fromHEXString(Header.sign), ECC.importKey(true, Buffer.from(_PublicKey, "base64")));
      }
      /**
       * @returns {[boolean,Object.<string,typeof package>|null]}
       */
      function verifyAndUnarchive() {
        let files = {};
        for (const [filename, filehash, start, size] of Header.entries) {
          let filebuf = package.subarray(start, start + size);
          let checksum = hash(filebuf);
          let _path = path.resolve(filename);
          if (!_path.startsWith(path.resolve(".")) || !(filehash === checksum)) {
            console.warn("校验错误:" + _path);
            return [false, null];
          }
          files[normalize(_path)] = filebuf;
        }
        return [true, files];
      }
      if (!isSigned()) throw new TypeError("错误:资源文件签名损坏");
      if (Header.version < currentVersion) throw new TypeError("错误:软件包版本太旧");
      let [verified, files] = verifyAndUnarchive()
      if (!verified) throw new TypeError("错误:文件损坏(校验值不符)");
      return files;
    }
    read.CryptoMine = CryptoMine;
    return read;
  })();
  let hooked = false;
  //Hook to modules
  let installHook = function () {
    if (hooked) return;
    hooked = true;
    const originalFsFuncs = {};
    const entries = unpack.apply(this, arguments);
    const path = require("path");
    const ReadableStream = require("stream").Readable;
    const root = path.resolve(".");
    const mod = require("module");
    const originalJSFunc = mod._extensions[".js"];
    const originalJSONFunc = mod._extensions[".json"];
    const textd = new TextDecoder;
    const originalResolve = mod._findPath;
    const exts = Object.keys(mod._extensions);
    const slash = normalize("./node_modules").substring(1, 2);
    const isDir = (filename) => Object.keys(entries).filter(e => e.startsWith(normalize(filename) + slash)).length != 0;
    function normalize(_path) {
      let result = path.resolve(_path);
      if (result.length < root.length) return path.resolve(_path);
      return "." + result.substring(root.length);
    }
    const fs = require("fs");
    ["readdirSync",
      "readFileSync",
      "writeFileSync",
      "createWriteStream",
      "createReadStream",
      "existsSync",
      "statSync",
      "lstatSync",
      "fstatSync"].forEach(e => originalFsFuncs[e] = fs[e]);
    fs.readFileSync = function (p, o) {
      if (typeof p === "string") {
        if (o === "utf8" || o === "utf-8") {
          return (new TextDecoder).decode(entries[normalize(p)]) || originalFsFuncs.readFileSync.apply(this, arguments);
        }
        return entries[normalize(p)] || originalFsFuncs.readFileSync.apply(this, arguments);
      }
    }
    function existsInPackage(p) {
      return (Object.keys(entries).filter(e => e.startsWith(normalize(p))).length > 0);
    }
    function writeMethod(originalFunction) {
      return function () {
        let p = arguments[0];
        if (typeof p === "string") {
          if (existsInPackage(path.dirname(p))) {
            if (isDir(path.dirname(p))) {
              fs.mkdirSync(path.dirname(p), { recursive: true });
            }
          }
          return originalFunction.apply(this, arguments);
        }
      }
    }
    fs.writeFileSync = writeMethod(originalFsFuncs.writeFileSync);
    fs.createReadStream = function (p, opts = {}) {
      let stream = new ReadableStream();
      let done = false;
      let data;
      try {
        data = fs.readFileSync(p);
      } catch {
        return originalFsFuncs.createReadStream.apply(this, arguments);
      }
      opts.start = opts.start || 0;
      opts.end = opts.end || 0;
      stream._read = function () {
        if (done) return undefined;
        done = true;
        this.push(data.subarray(opts.start, opts.end + 1));
        this.push(null);
      }
      return stream;
    }
    fs.createWriteStream = writeMethod(originalFsFuncs.createWriteStream);
    fs.existsSync = function (p) {
      return existsInPackage(p) || originalFsFuncs.existsSync.apply(this, arguments);
    }
    function statGenerator(originalFunction) {
      return function (p) {
        const _true = () => true;
        const _false = () => false;
        const zerotimeMs = 0;
        const zerotime = new Date(zerotimeMs);
        let result = {
          isFile: _true,
          isDirectory: _false,
          isBlockDevice: _false,
          isCharacterDevice: _false,
          isSymbolicLink: _false,
          isFIFO: _false,
          isSocket: _false,
          ino: 0,
          atimeMs: zerotimeMs,
          mtimeMs: zerotimeMs,
          ctimeMs: zerotimeMs,
          birthtime: zerotimeMs,
          atime: zerotime,
          mtime: zerotime,
          ctime: zerotime,
          birthtime: zerotime
        };
        if (existsInPackage(p)) {
          if (isDir(p)) {
            result.size = 0;
            result.isFile = _false;
            result.isDirectory = _true;
          } else {
            result.size = Uint8Array.from(fs.readFileSync(p)).length;
          }
          return result;
        } else {
          return originalFunction.apply(this, arguments);
        }
      }
    }
    ["statSync", "lstatSync", "fstatSync"].forEach(e => fs[e] = statGenerator(originalFsFuncs[e]));
    fs.readdirSync = function (p = "", o) {
      p = normalize(p);
      let level = p.split(slash).length;
      let inPackageFiles = Object.keys(entries).filter(e => e.startsWith(normalize(p) + slash)).map(e => path.resolve(e));
      let inPkgFileSet = new Set();
      for (let path of inPackageFiles) {
        inPkgFileSet.add(normalize(path).split(slash)[level]);
      };
      let inPackage = [...inPkgFileSet];
      let originalResult;
      try {
        originalResult = originalFsFuncs.readdirSync.apply(this, arguments);
      } catch {
        originalResult = [];
      }
      let result = [...(new Set([...inPackage, ...originalResult]))];
      return result;
    };
    ["stat", "lstat", "fstat", "readdir", "exists"].forEach(function (fn) {
      fs[fn] = function (path, optArg, callback) {
        try {
          if (!callback) {
            callback = optArg;
            optArg = undefined;
          }
          let result = fs[`${fn}Sync`](path);
          setImmediate(function () {
            callback && callback(null, result);
          });
        } catch (e) {
          setImmediate(function () {
            callback && callback(e, null);
          });
        }
      };
    });
    ["readFile"].forEach(function (fn) {
      originalFsFuncs[fn] = fs[fn];
      fs[fn] = function (path, optArg, callback) {
        if (!callback) {
          callback = optArg;
          optArg = undefined;
        }
        let result;
        try {
          result = fs[`${fn}Sync`](path, optArg);
        } catch (e) {
          setImmediate(function () {
            callback(e);
          });
          return;
        }
        setImmediate(function () {
          callback(null, result);
        });
      };
    });

    mod._extensions[".js"] = function (_module, filename) {
      let targetBuffer = entries[normalize(filename)];
      if (!targetBuffer) {
        targetBuffer = fs.readFileSync(filename)
        return originalJSFunc.apply(this, arguments);
      }
      let targetCode = textd.decode(targetBuffer);
      _module._compile(targetCode, filename);
    };
    mod._extensions[".json"] = function (_module, filename) {
      let targetBuffer = entries[normalize(filename)];
      if (!targetBuffer) {
        targetBuffer = fs.readFileSync(filename)
        return originalJSONFunc.apply(this, arguments);
      }
      let targetCode = textd.decode(targetBuffer);
      try {
        _module.exports = JSON.parse(targetCode);
      } catch (e) {
        err.message = filename + ': ' + err.message;
        throw err;
      }
    };
    const originalLookup = mod._resolveLookupPaths;
    mod._resolveLookupPaths = function () {
      let result = originalLookup.apply(this, arguments);
      return result;
    }
    mod._findPath = function () {
      arguments[1] = arguments[1]
        .map(e => path.resolve(e))
        .filter(e => e.startsWith(root));
      let result = originalResolve.apply(this, arguments);
      if (result) return result;
      function tryExtensions(_base) {
        for (let i of exts) {
          if (entries[normalize(_base + i)]) {
            return _base + i;
          }
        }
        return false;
      }
      for (let e of arguments[1]) {
        let base = path.resolve(e, arguments[0]);
        if (isDir(base)) {
          let pkgpath = normalize(path.resolve(base, "package.json"));
          let entry;
          if (entries[pkgpath]) {
            let pkg = JSON.parse(entries[pkgpath].toString());
            entry = normalize(path.resolve(base, (pkg.main || "./index.js")));
            let isSubDir = Object.keys(entries).filter(e => e.startsWith(normalize(entry) + slash)).length != 0;
            if (isSubDir) {
              entry = path.resolve(entry, "./index");
            }
            if (!path.extname(entry)) {
              entry = tryExtensions(entry);
            }
            entry = normalize(entry);
          } else {
            entry = normalize(path.resolve(base, ("./index.js")));
            if (!path.extname(entry)) {
              entry = tryExtensions(entry);
            };
          }
          if (entries[entry]) return entry;
        }
        let ext = tryExtensions(base);
        if (ext) return ext;
        if (entries[normalize(base)]) {
          return base;
        }
      }
      return result;
    }
    function uninstall() {
      if (!hooked) return;
      hooked = false;
      mod._extensions[".js"] = originalJSFunc;
      mod._extensions[".json"] = originalJSONFunc;
      mod._findPath = originalResolve;
      Object.keys(originalFsFuncs).forEach(e => fs[e] = originalFsFuncs[e]);
      originalFsFuncs.length = 0;
      return true;
    }
    return uninstall;
  };
  if (returnMethod) {
    return installHook;
  } else {
    module.exports = installHook;
  }
}
function CLIEntry() {
  return ((process.send) ? AppEntry : DaemonEntry).apply(this, arguments);
}
function DaemonEntry() {
  let cp = require("child_process");
  let instance = cp.fork("./helper/packer/packer.js");
  process.on("SIGINT", function () { });
  function exithandler(code) {
    if (code === null) {

    } else if (code !== 255) {
      process.exit(code);
    }
  }
  let ProcessClosed = new WeakSet();
  function handler(msg) {
    if (typeof msg !== "object") { return; }
    if (msg.restart) {
      instance.on("close", function () {
        ProcessClosed.add(instance)
      })
      instance.off("close", exithandler);
      setTimeout(function _() {
        if (!ProcessClosed.has(instance)) {
          setTimeout(_, 100);
          return;
        }
        instance = cp.fork(msg.restart)
        instance.on("message", handler);
        instance.on("close", exithandler);
      }, 0);
    }
  }
  instance.on("message", handler);
  instance.on("close", exithandler);
}
function AppEntry() {
  let sharedObject = {};
  module.exports = sharedObject;
  let fs = require("fs");
  const existsFile = {
    PACKAGEFILE: fs.existsSync(PACKAGEFILE),
    BACKUPPACKAGEFILE: fs.existsSync(BACKUPPACKAGEFILE),
  };
  try {
    if (existsFile.PACKAGEFILE) {
      sharedObject.mode = "normal";
      sharedObject.PACKAGEFILE = PACKAGEFILE;
      moduleEntry(true)(VERSION, fs.readFileSync(PACKAGEFILE), PUBLICKEY); //安装文件钩子
    } else {
      throw new Error("错误:无法找到新版本文件");
    }
  } catch (error) {
    console.error(error);
    if (existsFile.BACKUPPACKAGEFILE) {
      sharedObject.mode = "recovery";
      sharedObject.PACKAGEFILE = BACKUPPACKAGEFILE;
      moduleEntry(true)(VERSION, fs.readFileSync(BACKUPPACKAGEFILE), PUBLICKEY); //安装文件钩子
    } else {
      throw new Error("错误:无法找到备份版本文件");
    }
  }
  return require("./_app");
}
return ((require.main !== module) ? moduleEntry : CLIEntry)(); //Return on the top-level;