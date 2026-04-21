import fs from "fs";
import path from "path";
import axios from "axios";

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
    promise.finally(() => this.inFlight.delete(filename));
    return promise;
  }

  private async _fetchAndSave(filename: string, githubUrl: string, token?: string): Promise<string> {
    const dest = this.getPath(filename);
    const tmp = dest + ".tmp";

    const headers: Record<string, string> = { Accept: "application/octet-stream" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await axios.get<NodeJS.ReadableStream>(githubUrl, {
      responseType: "stream",
      headers,
    });

    await new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(tmp);
      (response.data as NodeJS.ReadableStream).pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", (err) => {
        fs.unlink(tmp, () => reject(err));
      });
    });

    fs.renameSync(tmp, dest);
    return dest;
  }
}

export const fileCache = new FileCache(process.env.CACHE_DIR ?? "./cache");
