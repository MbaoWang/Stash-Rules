# Stash Proxy Override

Stash 覆寫：減少 IPLark 等偵測網站能看到的代理洩露資訊，並附一個「代理洩露檢測」面板。

| 檔案 | 說明 |
|---|---|
| `iplark-anti-detect.stoverride` | 覆寫檔：分流規則、WebRTC/STUN 處理、面板設定 |
| `leak-check.js` | 面板（Tile）腳本，由覆寫檔自動載入 |

## 安裝

### 前提

你的 Stash 配置裡必須有一個叫 **`PROXY`** 的策略組。覆寫裡的規則都指向它，名稱不存在時 Stash 會載入失敗。
策略組名稱不同的話，請 fork 本 repo，把 `iplark-anti-detect.stoverride` 裡的 `PROXY` 全部換成你的名稱，再用你自己的 raw 連結安裝。

### 方法一：一鍵安裝

在 iPhone / iPad 上用 Safari 打開：

```
stash://install-override?url=https%3A%2F%2Fraw.githubusercontent.com%2FMbaoWang%2FStash-Proxy-override%2Fmain%2Fiplark-anti-detect.stoverride
```

### 方法二：手動新增

1. 打開 Stash → 首頁 →「覆寫」→ 右上角「＋」→「從 URL 安裝」
2. 貼上：
   ```
   https://raw.githubusercontent.com/MbaoWang/Stash-Proxy-override/main/iplark-anti-detect.stoverride
   ```
3. 啟用這個覆寫，回到首頁就能看到「代理洩露檢測」面板

### 更新

在覆寫列表中下拉或點擊覆寫重新整理即可。面板腳本每 24 小時自動更新一次。

## 覆寫做了什麼

1. **偵測網站走代理**：iplark、browserleaks、ipleak、dnsleaktest、whoer、pixelscan 一律走 `PROXY`。
   因為命中的是網域規則，Stash 不會在本地解析這些網域，而是交給節點遠端解析，避免 DNS 洩露。
2. **IP 查詢 API 統一出口**：ip-api、ipinfo、ip.sb、ipapi、ipify、ipdata、ipregistry、ip2location、ipqualityscore、scamalytics 等走同一個出口，避免出現「多個來源看到不同 IP」。
3. **WebRTC**：STUN 埠（3478、19302、5349）走代理，讓 WebRTC 看到的公網 IP 等於節點 IP。
   節點不支援 UDP 時可改成 `REJECT`，但封鎖 3478 可能影響 FaceTime。
4. **（可選）DNS**：覆寫檔中有一段註解掉的 `dns:` 設定，原配置使用國內或 ISP DNS 時可以啟用，改用海外 DoH。

## 代理洩露檢測面板

點擊面板即可重新檢測，預設每 10 分鐘自動刷新。

| 項目 | 說明 |
|---|---|
| 出口一致性 | 比對 ip-api、ipinfo、ip.sb、Cloudflare 看到的 IP；不一致時判定為「多出口」❌ |
| DNS | 用隨機子網域查詢 `edns.ip-api.com`，看實際使用的 DNS 所在國；與出口國不同時 ⚠️ |
| ECS | DNS 查詢帶出的客戶端網段（EDNS Client Subnet）所在國與出口不同時 ❌，代表真實網段外洩 |
| IP 類型 | 機房 IP 或被標記代理/VPN 時 ⚠️ |
| 時區 | 裝置時區與 IP 所在時區不符時 ⚠️ |
| IPv6 | 出現 IPv6 出口時 ⚠️，代表 v4 和 v6 可能走不同出口 |

面板顏色：紅色表示有 ❌ 項目，橘色表示只有 ⚠️，綠色表示全部通過。

DNS 的測試網域刻意不在覆寫規則內，所以這項測出來的是你原本配置的真實 DNS 行為。

## 其他網站也適用嗎？

要分成兩部分看：

- **對所有網站都有效**：WebRTC/STUN 走代理，以及啟用可選 DNS 設定後的 DNS 改善。這兩項是全域規則，不限網站。
- **只對列出的網站有效**：網域分流規則只涵蓋上面列出的偵測站與 IP API。
  其他網站如果有自己的偵測網域，就會照你原本的配置分流。
  需要時，可以自己在覆寫裡加上 `DOMAIN-SUFFIX,網域,PROXY`。

以下項目是覆寫**無法處理**的，任何網站都一樣：

- **IP 本身的信譽**：機房 IP、被資料庫標記為代理或 VPN 的 IP 只能換節點解決，例如換成住宅 IP。
  串流平台、AI 服務、銀行等網站主要看的就是這一項。
- **TCP/IP 指紋與延遲**：伺服器看到的 TCP 指紋來自節點系統（通常是 Linux），與 iOS 的 UA 不符；連線延遲也可能露出破綻。這些用戶端改不了。
- **時區與語言**：瀏覽器回報的是裝置設定，請手動把裝置時區改成節點所在地。

本覆寫刻意**不使用 MITM**。MITM 之後，網站看到的 TLS 指紋會變成 Stash 的，而不是 Safari 的，反而更容易被判定為代理。

## 注意事項

- ip-api 免費版只支援 http，限制每分鐘 45 次請求，面板的刷新頻率不會超過限制。
- 如果遠端解析使用 Google 或 Cloudflare 的 anycast DNS，DNS 所在國有時會被判成美國，跟節點不同國，這種 ⚠️ 可能是誤報。
