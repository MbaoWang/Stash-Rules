# Stash DNS 防洩漏覆寫

只處理 DNS 的 Stash 覆寫：換掉原本的 DNS 伺服器、阻擋繞過 Stash 的 DoT，並讓 DNS 洩漏測試網站改由節點解析。

## 安裝

使用前先確認你的配置裡有叫 `PROXY` 的策略組，覆寫裡的規則都指向它。名稱不同的話，請 fork 本 repo，把 `PROXY` 全部換成你的名稱，再用自己的連結安裝。

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

1. **整個換掉原本的 DNS**：用 `#!replace` 把 `default-nameserver` 和 `nameserver` 換成 Cloudflare 的 DoH，位址直接寫成 IP。
   Stash 會同時查詢所有 DNS 伺服器，如果只是追加，原本的 ISP 或系統 DNS 照樣會收到查詢，所以必須整個換掉。
2. **不送 ECS**：Cloudflare 不會把你的網段帶給網站的 DNS 伺服器。
3. **阻擋 DoT（853 埠）**：避免 App 自己繞過 Stash 去連 DNS 伺服器。
4. **洩漏測試網站改由節點解析**：iplark、browserleaks、ipleak、dnsleaktest、whoer、edns.ip-api.com 的網域查詢交給節點去做，本地不解析。
5. **（可選）清空 `nameserver-policy`**：原配置如果把部分網域交給 ISP DNS，可以拿掉註解清空。代價是那些網域會改用 Cloudflare 解析。

## 覆寫處理不到、要自己改的地方

- **原配置的 `GEOIP`、`IP-CIDR` 規則要加 `,no-resolve`**：沒加的話，Stash 會先在本地解析網域，DoH 伺服器就會看到你的真實 IP。
  覆寫沒辦法修改原有規則，只能自己在原配置裡改。
- **開啟「網路設定 → 啟用 Tunnel IPv6 路由」**：Stash 預設只接管 IPv4。網路有 IPv6 時不開的話，IPv6 流量（例如 WebRTC）會繞過 Stash。

## 驗證

裝好後用 Safari 打開 `browserleaks.com/dns` 或 `ipleak.net`。列出的 DNS 伺服器應該只有 Cloudflare，或是節點所在地的 DNS，不應該出現你的 ISP。
