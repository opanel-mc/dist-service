import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import axios from "axios";

const RESPONSE_TIMEOUT_MS = 30_000; // max time until response headers arrive
const STALL_TIMEOUT_MS = 60_000; // max gap between data chunks while streaming

class FileCache {
  private cacheDir: string;
  private inFlight = new Map<string, Promise<string>>();

  constructor(cacheDir: string) {
    this.cacheDir = path.resolve(cacheDir);
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  has(filename: string): boolean {
    return fs.existsSync(this.getPath(filename));
  }

  getPath(filename: string): string {
    return path.join(this.cacheDir, filename);
  }

  async download(filename: string, githubUrl: string, token?: string): Promise<string> {
    const existing = this.inFlight.get(filename);
    if (existing) return existing;

    const promise = this._fetchAndSave(filename, githubUrl, token);
    this.inFlight.set(filename, promise);
    promise
      .catch(() => {})
      .finally(() => this.inFlight.delete(filename));
    return promise;
  }

  private async _fetchAndSave(filename: string, githubUrl: string, token?: string): Promise<string> {
    const dest = this.getPath(filename);
    const tmp = dest + ".tmp";

    const headers: Record<string, string> = { Accept: "application/octet-stream" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await axios.get<Readable>(githubUrl, {
      responseType: "stream",
      headers,
      timeout: RESPONSE_TIMEOUT_MS,
    });

    // axios' timeout only covers up to the response headers; destroy the
    // stream ourselves if the body stalls mid-transfer
    const source = response.data;
    let stallTimer: ReturnType<typeof setTimeout>;
    const resetStall = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(
        () => source.destroy(new Error(`Download stalled: ${filename}`)),
        STALL_TIMEOUT_MS
      );
    };
    source.on("data", resetStall);
    resetStall();

    try {
      await pipeline(source, fs.createWriteStream(tmp));
    } catch (err) {
      fs.unlink(tmp, () => {});
      throw err;
    } finally {
      clearTimeout(stallTimer!);
    }

    fs.renameSync(tmp, dest);
    return dest;
  }
}

export const fileCache = new FileCache(process.env.CACHE_DIR ?? "./cache");
