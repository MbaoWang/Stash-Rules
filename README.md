# Stash Rules

Stash 覆寫合集。每個覆寫都可以單獨安裝、單獨開關。

| 覆寫 | 用途 | 需要的策略組 |
|---|---|---|
| [`dns-leak-protection.stoverride`](#dns-防洩漏) | DNS 分流，國外 DNS 跟著節點走 | `PROXY` |
| [`AdBlock.stoverride`](#去廣告) | 攔截開屏廣告與 App 內廣告 SDK | 不需要 |

## DNS 防洩漏

只處理 DNS 的 Stash 覆寫：中國網域用阿里 DNS 直連；其餘用 Cloudflare / Google，並經 `PROXY` 送出，所以 DNS 會跟著節點所在地。另外會擋掉繞過 Stash 的明文 DNS 與 DoT。

### 安裝

使用前先確認你的配置裡有叫 `PROXY` 的策略組，覆寫裡的規則都指向它。
名稱不同的話，請 fork 本 repo，把 `PROXY` 全部換成你的名稱，再用自己的連結安裝。

#### 一鍵安裝

在 iPhone / iPad 上用 Safari 打開：

```
stash://install-override?url=https%3A%2F%2Fraw.githubusercontent.com%2FMbaoWang%2FStash-Rules%2Fmain%2Fdns-leak-protection.stoverride
```

#### 手動安裝

Stash → 首頁 →「覆寫」→ 右上角「＋」→「從 URL 安裝」，貼上：

```
https://raw.githubusercontent.com/MbaoWang/Stash-Rules/main/dns-leak-protection.stoverride
```

#### 更新

在覆寫列表中重新整理這個覆寫即可。

### 這個覆寫做了什麼

| 用途 | DNS 伺服器 | 出口 |
|---|---|---|
| 中國網域（`geosite:cn`） | 阿里 DoH `223.5.5.5` | 直連 |
| 其他網域 | Cloudflare DoH `1.1.1.1`、`2606:4700:4700::1111`<br>Google DoH `8.8.8.8`、`2001:4860:4860::8888` | `PROXY` |
| 解析節點網域（引導） | 阿里 DoH `223.6.6.6` | 直連 |

1. **`follow-rule: true`**：Stash 自己發出的 DNS 查詢也會比對規則。
   國外 DoH 經 `PROXY` 送出，DNS 伺服器看到的是節點 IP，回應的也是節點所在地的 DNS 節點。
   所以就算有規則觸發本地解析，檢測結果也會顯示節點所在地，例如節點在日本就顯示日本。
2. **同時查詢、用最快的**：同一組有多台 DNS 伺服器時，Stash 會同時查詢，用最先回來的結果。
   國外 DNS 同時有 IPv4 和 IPv6 位址。IPv6 需要節點支援，節點不支援時那兩個會失敗，但 IPv4 仍會正常回應，不影響使用。
3. **整個取代原本的 DNS**：`default-nameserver`、`proxy-server-nameserver`、`nameserver`、`fallback`、`nameserver-policy` 都加了 `#!replace`。
   原本的 ISP 或系統 DNS 不會再收到查詢，原配置的這幾項設定也會被取代。
4. **引導 DNS 與阿里查詢分開**：解析節點網域用的 `223.6.6.6` 一定直連。
   如果它也走 `PROXY`，就會變成「要連節點得先解析節點」的迴圈。
5. **阻擋明文 DNS（53）與 DoT（853）**：擋掉 App 自己寫死的 DNS 伺服器（例如直連 `8.8.8.8:53`），迫使它改走 Stash 的 DNS。
   系統一般的 DNS 查詢由 Stash 直接處理，不會進規則，不受影響。

### 注意事項

- **中國網域的查詢**：由阿里直接看到你的真實 IP。這是為了拿到國內最近的 CDN 節點，屬於預期行為。
- **其他覆寫的 IP 規則**：最好也加上 `no-resolve`。有了 `follow-rule`，本地解析不會再顯示台灣，但每個網站都會多一次經過節點的 DNS 查詢，速度會變慢。
  - 去廣告規則集請用 `*_No_Resolve.yaml` 版本。
- **IPv6**：Stash 預設只接管 IPv4。網路有 IPv6 時，請開啟「網路設定 → 啟用 Tunnel IPv6 路由」。
- **不要和其他會改 DNS 的覆寫同時開**（例如 DNSLeakGuard），兩邊的 `#!replace` 會互相覆蓋。

### 驗證

裝好後用 Safari 打開 `browserleaks.com/dns` 或 `ipleak.net`。

列出的 DNS 伺服器應該是 Cloudflare、Google 或你 VPS 使用的 DNS，所在地和節點相同。測試網站不是中國網域，所以不會顯示阿里。

## 去廣告

攔截開屏廣告與 App 內廣告 SDK（穿山甲、廣點通、快手、百度、AdMob、AppLovin、Unity Ads、Vpon 等）。

### 安裝

一鍵安裝（iPhone / iPad 上用 Safari 打開）：

```
stash://install-override?url=https%3A%2F%2Fraw.githubusercontent.com%2FMbaoWang%2FStash-Rules%2Fmain%2FAdBlock.stoverride
```

手動安裝：Stash → 首頁 →「覆寫」→ 右上角「＋」→「從 URL 安裝」，貼上：

```
https://raw.githubusercontent.com/MbaoWang/Stash-Rules/main/AdBlock.stoverride
```

開屏廣告的 URL 重寫需要開啟 MitM 並信任 CA 憑證。

### 遠端規則集

| 規則集 | 內容 |
|---|---|
| blackmatrix7 `AdvertisingLite_Domain` | 約 3.7 萬條廣告網域 |
| blackmatrix7 `AdvertisingLite_No_Resolve` | 關鍵字與 IP 規則（IP 規則皆已加 `no-resolve`） |
| 秋風 AWAvenue | 專攻 App 內廣告 SDK |

所有 IP 規則都有加 `no-resolve`，不會讓 Stash 在本地解析網域，也就不會造成 DNS 洩漏。
想要更完整的攔截，可以把覆寫裡的 `AdvertisingLite` 換成 `Advertising`（約 29 萬條網域、7.9 MB）。但 iOS 對 Stash 的記憶體限制較嚴，規則太多可能不穩。
