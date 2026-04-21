# OPanel Dist Service — API Reference

Base URL: `https://dist.opanel.cn`

---

## GET /api/releases

获取所有发布版本及其 asset 列表。

**Response** `200 OK`

```json
{
  "2.0.0-rc4": {
    "id": 310604095,
    "name": "OPanel 2.0.0-rc4",
    "publishedAt": "2026-04-18T00:16:52Z",
    "assets": [
      {
        "id": 399018460,
        "name": "opanel-bukkit-1.16.1-build-2.0.0-rc4.jar",
        "server": "bukkit",
        "gameVersion": "1.16.1",
        "opanelVersion": "2.0.0-rc4",
        "size": 86764050,
        "createdAt": "2026-04-18T00:13:09Z"
      }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| key | string | 版本 tag（如 `v1.2.0`） |
| id | number | Release ID |
| name | string | Release 名称 |
| publishedAt | string | 发布时间（ISO 8601） |
| assets[].id | number | Asset ID，用于下载接口 |
| assets[].name | string | 文件名 |
| assets[].server | string | 服务端类型（如 `paper`、`spigot`） |
| assets[].gameVersion | string | Minecraft 版本（如 `1.21.4`） |
| assets[].opanelVersion | string | OPanel 版本（如 `1.2.0`） |
| assets[].size | number | 文件大小（字节） |
| assets[].createdAt | string | 创建时间（ISO 8601） |

---

## GET /api/download/:assetId

下载指定 asset 文件（JAR）。

**Path Parameters**

| 参数 | 类型 | 说明 |
|------|------|------|
| assetId | number | Asset ID，从 `/api/releases` 获取 |

**Response**

- `200 OK` — 返回 JAR 文件流
  - `Content-Type: application/java-archive`
  - `Content-Disposition: attachment; filename="<filename>"`
- `400 Bad Request` — `assetId` 不是有效数字
- `404 Not Found` — 找不到对应 asset

**Example**

```
GET /api/download/987654
```

---

## GET /api/stats

获取下载统计数据。

**Response** `200 OK`

```json
{
  "totalDownloads": 42,
  "today": {
    "date": "2026-04-21",
    "count": 5,
    "assets": {
      "opanelVersion": {
        "1.2.0": 3,
        "1.1.0": 2
      },
      "server": {
        "paper": 4,
        "spigot": 1
      },
      "gameVersion": {
        "1.21.4": 5
      }
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| totalDownloads | number | 下载接口被成功调用的历史总次数 |
| today.date | string | 当天日期（UTC，`YYYY-MM-DD`） |
| today.count | number | 当天下载次数 |
| today.assets.opanelVersion | object | 当天各 OPanel 版本下载次数 |
| today.assets.server | object | 当天各服务端类型下载次数 |
| today.assets.gameVersion | object | 当天各 Minecraft 版本下载次数 |

> 统计数据持久化至 `./data/stats.json`，可通过环境变量 `STATS_FILE` 自定义路径。每日零点（UTC）自动重置当天数据，历史总次数不受影响。

---

## 错误格式

所有错误响应均返回 JSON：

```json
{ "error": "错误描述" }
```
