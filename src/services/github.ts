import axios from "axios";
import { GithubRelease, ParsedAsset, ReleasesMap, ResolvedAsset } from "../types";
import { MemoryCache } from "./cache";

const REPO = "opanel-mc/opanel";
const BASE_URL = "https://api.github.com";
const ASSET_RE = /^opanel-(\w+)-([\d.]+)-build-([\w.-]+)\.jar$/i;

function parseAssetName(name: string): { server: string; gameVersion: string; opanelVersion: string } | null {
  const m = ASSET_RE.exec(name);
  if (!m) return null;
  return { server: m[1], gameVersion: m[2], opanelVersion: m[3] };
}

class GithubService {
  private releasesCache = new MemoryCache<ReleasesMap>();
  private assetUrlMap = new Map<number, string>();
  private inFlightFetch: Promise<ReleasesMap> | null = null;
  private lastGood: ReleasesMap | null = null;
  private token?: string;
  private cacheTtlMs: number;

  constructor(token?: string, cacheTtlSec = 300) {
    this.token = token;
    this.cacheTtlMs = cacheTtlSec * 1000;
  }

  private get headers() {
    const h: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  private async fetchAllReleasePages(): Promise<GithubRelease[]> {
    const PER_PAGE = 100;
    const all: GithubRelease[] = [];
    for (let page = 1; ; page++) {
      const { data } = await axios.get<GithubRelease[]>(
        `${BASE_URL}/repos/${REPO}/releases`,
        { headers: this.headers, params: { per_page: PER_PAGE, page }, timeout: 10_000 }
      );
      all.push(...data);
      if (data.length < PER_PAGE) return all;
    }
  }

  async fetchReleases(): Promise<ReleasesMap> {
    const cached = this.releasesCache.get("releases");
    if (cached) return cached;

    if (this.inFlightFetch) return this.inFlightFetch;

    this.inFlightFetch = this.refresh().finally(() => {
      this.inFlightFetch = null;
    });
    return this.inFlightFetch;
  }

  private async refresh(): Promise<ReleasesMap> {
    let data: GithubRelease[];
    try {
      data = await this.fetchAllReleasePages();
    } catch (err) {
      if (this.lastGood) {
        console.error("[github] Fetch failed, serving stale releases:", err);
        return this.lastGood;
      }
      throw err;
    }

    this.assetUrlMap.clear();

    const releasesMap: ReleasesMap = {};
    for (const r of data) {
      const assets = r.assets
        .map((a): ParsedAsset | null => {
          const parsed = parseAssetName(a.name);
          if (!parsed) return null;
          this.assetUrlMap.set(a.id, a.browser_download_url);
          return {
            id: a.id,
            name: a.name,
            ...parsed,
            size: a.size,
            createdAt: a.created_at,
            digest: a.digest,
          };
        })
        .filter((a): a is ParsedAsset => a !== null);

      releasesMap[r.tag_name] = {
        id: r.id,
        name: r.name,
        publishedAt: r.published_at,
        assets,
      };
    }

    this.releasesCache.set("releases", releasesMap, this.cacheTtlMs);
    this.lastGood = releasesMap;
    return releasesMap;
  }

  async resolveAsset(assetId: number): Promise<ResolvedAsset | null> {
    const releasesMap = await this.fetchReleases();

    for (const release of Object.values(releasesMap)) {
      for (const asset of release.assets) {
        if (asset.id === assetId) {
          const githubUrl = this.assetUrlMap.get(assetId);
          if (!githubUrl) return null;
          return { ...asset, githubUrl };
        }
      }
    }
    return null;
  }

  getToken(): string | undefined {
    return this.token;
  }
}

export const githubService = new GithubService(
  process.env.GITHUB_TOKEN || undefined,
  parseInt(process.env.CACHE_TTL ?? "300", 10)
);
