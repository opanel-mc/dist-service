export interface ParsedAsset {
  id: number;
  name: string;
  server: string;
  gameVersion: string;
  opanelVersion: string;
  size: number;
  createdAt: string;
  digest?: string;
}

export interface ReleaseInfo {
  id: number;
  tag: string;
  name: string;
  publishedAt: string;
  assets: ParsedAsset[];
}

export type ReleasesMap = Record<string, Omit<ReleaseInfo, "tag">>;

export interface GithubAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
  created_at: string;
  digest?: string;
}

export interface GithubRelease {
  id: number;
  tag_name: string;
  name: string;
  published_at: string;
  assets: GithubAsset[];
}

export interface ResolvedAsset extends ParsedAsset {
  githubUrl: string;
}
