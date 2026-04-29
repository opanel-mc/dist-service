"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileCache = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
class FileCache {
    constructor(cacheDir) {
        this.inFlight = new Map();
        this.cacheDir = path_1.default.resolve(cacheDir);
        if (!fs_1.default.existsSync(this.cacheDir)) {
            fs_1.default.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    has(filename) {
        return fs_1.default.existsSync(this.getPath(filename));
    }
    getPath(filename) {
        return path_1.default.join(this.cacheDir, filename);
    }
    async download(filename, githubUrl, token) {
        const existing = this.inFlight.get(filename);
        if (existing)
            return existing;
        const promise = this._fetchAndSave(filename, githubUrl, token);
        this.inFlight.set(filename, promise);
        promise.finally(() => this.inFlight.delete(filename));
        return promise;
    }
    async _fetchAndSave(filename, githubUrl, token) {
        const dest = this.getPath(filename);
        const tmp = dest + ".tmp";
        const headers = { Accept: "application/octet-stream" };
        if (token)
            headers["Authorization"] = `Bearer ${token}`;
        const response = await axios_1.default.get(githubUrl, {
            responseType: "stream",
            headers,
        });
        await new Promise((resolve, reject) => {
            const writer = fs_1.default.createWriteStream(tmp);
            response.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", (err) => {
                fs_1.default.unlink(tmp, () => reject(err));
            });
        });
        fs_1.default.renameSync(tmp, dest);
        return dest;
    }
}
exports.fileCache = new FileCache(process.env.CACHE_DIR ?? "./cache");
