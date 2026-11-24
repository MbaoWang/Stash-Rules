# Stash Rules

Stash 覆寫合集。每個覆寫都可以單獨安裝、單獨開關。

| 覆寫 | 用途 | 需要的策略組 |
|---|---|---|
| [`dns-leak-protection.stoverride`](#dns-防洩漏) | DNS 分流，國外 DNS 跟著節點走 | 安裝時自己填（Stash 3.7+） |
| [`AdBlock.stoverride`](#去廣告) | 攔截開屏廣告與 App 內廣告 SDK | 不需要（Stash 3.7+） |

## DNS 防洩漏

只處理 DNS 的 Stash 覆寫：中國網域用阿里 / DNSPod 直連；其餘用 Cloudflare / Google，並經你指定的「DNS 出口」送出，所以 DNS 會跟著節點所在地。DNS 伺服器自動選最快的，另外會擋掉繞過 Stash 的明文 DNS 與 DoT。

### 安裝

需要 **Stash 3.7 以上**，舊版匯入會出現 `the override is invalid`。

安裝時 Stash 會跳出設定選項，之後也可以在覆寫列表裡點這個覆寫修改：

| 選項 | 說明 |
|---|---|
| **DNS 出口**（必填） | 國外 DNS 查詢要走的策略組或節點名稱，通常填 `PROXY`。<br>要和配置裡的名稱一字不差；不能填 `DIRECT`，也不能填最後會走 `DIRECT` 的組。 |
| **引導 DNS** | 只用來查節點網域的 IP，一律直連。<br>可選阿里 `223.6.6.6`（預設）、`223.5.5.5`、DNSPod `1.12.12.12`、`120.53.53.53`、Cloudflare `1.0.0.1`、DNS.SB `185.222.222.222`。<br>人在中國請選阿里或 DNSPod。 |

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
| 中國網域（`geosite:cn`） | 阿里 DoH `223.5.5.5`、`223.6.6.6`<br>DNSPod DoH `1.12.12.12` | 直連 |
| 其他網域 | Cloudflare DoH `1.1.1.1`、`cloudflare-dns.com`<br>Google DoH `8.8.8.8`、`dns.google` | DNS 出口 |
| 解析節點網域（引導） | 你選的引導 DNS（預設阿里 `223.6.6.6`） | 直連 |

1. **`follow-rule: true`**：Stash 自己發出的 DNS 查詢也會比對規則。
   國外 DoH 經「DNS 出口」送出，DNS 伺服器看到的是節點 IP，回應的也是節點所在地的 DNS 節點。
   所以就算有規則觸發本地解析，檢測結果也會顯示節點所在地，例如節點在日本就顯示日本。
2. **同時查詢、用最快的**：同一組有多台 DNS 伺服器時，Stash 會同時查詢，用最先回來的結果。
   國外 DNS 有兩種寫法：IP 寫法固定用 IPv4 連；網域寫法交給節點解析，節點有 IPv6 時就可能用 IPv6 連。
   Stash 不接受 `https://[IPv6]/dns-query` 這種寫法，所以 IPv6 改用網域。
3. **整個取代原本的 DNS**：`default-nameserver`、`proxy-server-nameserver`、`nameserver`、`fallback`、`nameserver-policy` 都加了 `#!replace`。
   原本的 ISP 或系統 DNS 不會再收到查詢，原配置的這幾項設定也會被取代。
4. **引導 DNS 只解析節點網域**：預設用阿里 `223.6.6.6` 直連，中國境內也連得到，也可以在選項裡換成其他家。
   國外 DNS 在中國常連不通，會導致節點解析失敗、整個 VPN 起不來。
   它一定要直連；如果也走代理，就會變成「要連節點得先解析節點」的迴圈。
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

### 設定選項

需要 **Stash 3.7 以上**。安裝時 Stash 會跳出設定選項，之後也可以在覆寫列表裡點這個覆寫修改：

| 選項 | 可選 | 說明 |
|---|---|---|
| **廣告規則集**（blackmatrix7） | 精簡版（預設）／完整版／關閉 | 精簡版約 3.7 萬條網域；完整版約 29 萬條、7.9 MB，iOS 記憶體吃緊時可能不穩 |
| **秋風廣告規則** | 開啟（預設）／關閉 | 某個 App 打不開或功能異常時，可以先關掉試試 |
| **攔截方式** | 建連後攔截（預設）／建連前攔截／靜默丟棄 | 建連後攔截會留下連線紀錄，方便排查；建連前攔截最省資源；靜默丟棄不回應，部分 App 會等到逾時 |

規則集選「關閉」時，會改用本 repo `empty/` 裡的空規則集，裡面只有永遠不會命中的 `blocked.invalid`。

### 遠端規則集

| 規則集 | 內容 |
|---|---|
| blackmatrix7 `*_Domain` | 廣告網域（精簡版約 3.7 萬條，完整版約 29 萬條） |
| blackmatrix7 `*_No_Resolve` | 關鍵字與 IP 規則（IP 規則皆已加 `no-resolve`） |
| 秋風 AWAvenue | 專攻 App 內廣告 SDK |

所有 IP 規則都有加 `no-resolve`，不會讓 Stash 在本地解析網域，也就不會造成 DNS 洩漏。
