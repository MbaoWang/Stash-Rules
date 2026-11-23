# Stash DNS 防洩漏覆寫

只處理 DNS 的 Stash 覆寫：中國網域用阿里 DNS，其餘用 Cloudflare / Google，並阻擋繞過 Stash 的 DoT。

## 安裝

### 一鍵安裝

在 iPhone / iPad 上用 Safari 打開：

```
stash://install-override?url=https%3A%2F%2Fraw.githubusercontent.com%2FMbaoWang%2FStash-Rules%2Fmain%2Fdns-leak-protection.stoverride
```

### 手動安裝

Stash → 首頁 →「覆寫」→ 右上角「＋」→「從 URL 安裝」，貼上：

```
https://raw.githubusercontent.com/MbaoWang/Stash-Rules/main/dns-leak-protection.stoverride
```

### 更新

在覆寫列表中重新整理這個覆寫即可。

## 這個覆寫做了什麼

| 網域 | DNS 伺服器 |
|---|---|
| 中國網域（`geosite:cn`） | 阿里 DoH：`dns.alidns.com`、`223.5.5.5` |
| 其他網域 | Cloudflare DoH `1.1.1.1`、Google DoH `dns.google` |
| 解析 DoH 伺服器本身的網域 | 阿里 `223.5.5.5`、`223.6.6.6` |

1. **全部用 DoH 加密**：ISP 看不到你查了哪些網域，也無法竄改結果。
2. **整個取代原本的 DNS**：`default-nameserver`、`nameserver`、`nameserver-policy` 都加了 `#!replace`。
   Stash 會同時查詢所有 DNS 伺服器，如果只是追加，原本的 ISP 或系統 DNS 照樣會收到查詢。
   原配置裡的 `nameserver-policy` 也會被取代。
3. **國內網域用國內 DNS**：阿里 DNS 會回傳國內最近的 CDN 節點，國內網站速度不受影響；國外 DNS 也不會收到你的國內查詢紀錄。
4. **阻擋 DoT（853 埠）**：避免 App 自己繞過 Stash 去連 DNS 伺服器。

## 覆寫處理不到、要自己改的地方

- **在本地解析的查詢，DNS 伺服器看得到你的真實 IP**：DoH 是從你的網路直接連出去的。走代理、而且命中網域規則的連線，由節點遠端解析，不受影響。
- **原配置的 `GEOIP`、`IP-CIDR` 規則要加 `,no-resolve`**：沒加的話，Stash 會先在本地解析網域，DoH 伺服器就會看到你的真實 IP。
  覆寫沒辦法修改原有規則，只能自己在原配置裡改。
- **開啟「網路設定 → 啟用 Tunnel IPv6 路由」**：Stash 預設只接管 IPv4。網路有 IPv6 時不開的話，IPv6 流量（例如 WebRTC）會繞過 Stash。

## 驗證

裝好後用 Safari 打開 `browserleaks.com/dns` 或 `ipleak.net`。列出的 DNS 伺服器應該是 Cloudflare 或 Google；如果測試網站命中了你原配置裡走代理的網域規則，則會顯示節點所在地的 DNS。

只要沒出現你的 ISP，就是正常的。測試網站不是中國網域，所以不會顯示阿里 DNS。
