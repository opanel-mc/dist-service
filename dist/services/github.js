"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubService = void 0;
const axios_1 = __importDefault(require("axios"));
const cache_1 = require("./cache");
const REPO = "opanel-mc/opanel";
const BASE_URL = "https://api.github.com";
const ASSET_RE = /^opanel-(\w+)-([\d.]+)-build-([\w.-]+)\.jar$/i;
function parseAssetName(name) {
    const m = ASSET_RE.exec(name);
    if (!m)
        return null;
    return { server: m[1], gameVersion: m[2], opanelVersion: m[3] };
}
class GithubService {
    constructor(token, cacheTtlSec = 300) {
        this.releasesCache = new cache_1.MemoryCache();
        this.assetUrlMap = new Map();
        this.inFlightFetch = null;
        this.lastGood = null;
        this.token = token;
        this.cacheTtlMs = cacheTtlSec * 1000;
    }
    get headers() {
        const h = {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        };
        if (this.token)
            h["Authorization"] = `Bearer ${this.token}`;
        return h;
    }
    async fetchAllReleasePages() {
        const PER_PAGE = 100;
        const all = [];
        for (let page = 1;; page++) {
            const { data } = await axios_1.default.get(`${BASE_URL}/repos/${REPO}/releases`, { headers: this.headers, params: { per_page: PER_PAGE, page }, timeout: 10000 });
            all.push(...data);
            if (data.length < PER_PAGE)
                return all;
        }
    }
    async fetchReleases() {
        const cached = this.releasesCache.get("releases");
        if (cached)
            return cached;
        if (this.inFlightFetch)
            return this.inFlightFetch;
        this.inFlightFetch = this.refresh().finally(() => {
            this.inFlightFetch = null;
        });
        return this.inFlightFetch;
    }
    async refresh() {
        let data;
        try {
            data = await this.fetchAllReleasePages();
        }
        catch (err) {
            if (this.lastGood) {
                console.error("[github] Fetch failed, serving stale releases:", err);
                return this.lastGood;
            }
            throw err;
        }
        this.assetUrlMap.clear();
        const releasesMap = {};
        for (const r of data) {
            const assets = r.assets
                .map((a) => {
                const parsed = parseAssetName(a.name);
                if (!parsed)
                    return null;
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
                .filter((a) => a !== null);
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
    async resolveAsset(assetId) {
        const releasesMap = await this.fetchReleases();
        for (const release of Object.values(releasesMap)) {
            for (const asset of release.assets) {
                if (asset.id === assetId) {
                    const githubUrl = this.assetUrlMap.get(assetId);
                    if (!githubUrl)
                        return null;
                    return { ...asset, githubUrl };
                }
            }
        }
        return null;
    }
    getToken() {
        return this.token;
    }
}
exports.githubService = new GithubService(process.env.GITHUB_TOKEN || undefined, parseInt(process.env.CACHE_TTL ?? "300", 10));
