"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileCache = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("stream/promises");
const axios_1 = __importDefault(require("axios"));
const RESPONSE_TIMEOUT_MS = 30000; // max time until response headers arrive
const STALL_TIMEOUT_MS = 60000; // max gap between data chunks while streaming
class FileCache {
    constructor(cacheDir) {
        this.inFlight = new Map();
        this.cacheDir = path_1.default.resolve(cacheDir);
        if (!fs_1.default.existsSync(this.cacheDir)) {
            fs_1.default.mkdirSync(this.cacheDir, { recursive: true });
        }
        // remove partial downloads left over from a previous crash
        for (const f of fs_1.default.readdirSync(this.cacheDir)) {
            if (f.endsWith(".tmp")) {
                try {
                    fs_1.default.unlinkSync(path_1.default.join(this.cacheDir, f));
                }
                catch { }
            }
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
        promise
            .catch(() => { })
            .finally(() => this.inFlight.delete(filename));
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
            timeout: RESPONSE_TIMEOUT_MS,
        });
        // axios' timeout only covers up to the response headers; destroy the
        // stream ourselves if the body stalls mid-transfer
        const source = response.data;
        let stallTimer;
        const resetStall = () => {
            clearTimeout(stallTimer);
            stallTimer = setTimeout(() => source.destroy(new Error(`Download stalled: ${filename}`)), STALL_TIMEOUT_MS);
        };
        source.on("data", resetStall);
        resetStall();
        try {
            await (0, promises_1.pipeline)(source, fs_1.default.createWriteStream(tmp));
        }
        catch (err) {
            fs_1.default.unlink(tmp, () => { });
            throw err;
        }
        finally {
            clearTimeout(stallTimer);
        }
        fs_1.default.renameSync(tmp, dest);
        return dest;
    }
}
exports.fileCache = new FileCache(process.env.CACHE_DIR ?? "./cache");
