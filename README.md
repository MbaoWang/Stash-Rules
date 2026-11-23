# Stash DNS 防洩漏覆寫

只處理 DNS 的 Stash 覆寫：換掉原本的 DNS 伺服器、阻擋繞過 Stash 的 DoT，並讓 DNS 洩漏測試網站改由節點解析。

## 安裝（透過 Gist）

本 repo 是私人的，Stash 讀不到這裡的連結，所以要先放到 Gist。

### 1. 建立 Gist

1. 打開 <https://gist.github.com/>
2. 檔名填 `dns-leak-protection.stoverride`
3. 把下方「覆寫內容」整段複製貼上
4. 點 **Create secret gist**。Secret gist 不會出現在搜尋結果，但有連結就能讀取，Stash 可以直接安裝。

### 2. 取得安裝連結

建立後點檔案右上角的 **Raw**，網址會長這樣：

```
https://gist.githubusercontent.com/<帳號>/<Gist ID>/raw/<一串版本號>/dns-leak-protection.stoverride
```

把中間的 `<一串版本號>/` 刪掉，變成：

```
https://gist.githubusercontent.com/<帳號>/<Gist ID>/raw/dns-leak-protection.stoverride
```

不含版本號的連結永遠指向最新版，之後修改 Gist 時，Stash 更新覆寫就會抓到新內容。

### 3. 安裝到 Stash

- **手動**：Stash → 首頁 →「覆寫」→ 右上角「＋」→「從 URL 安裝」→ 貼上第 2 步的連結
- **一鍵**：在 iPhone 的 Safari 打開 `stash://install-override?url=` 加上 URL 編碼後的連結。
  編碼方式是把 `:` 換成 `%3A`、`/` 換成 `%2F`。

### 覆寫內容

使用前先確認你的配置裡有叫 `PROXY` 的策略組；名稱不同的話，把內容裡的 `PROXY` 全部換掉。

```yaml
name: DNS 防洩漏
desc: 只處理 DNS：取代原本的 DNS 伺服器、阻擋繞過 Stash 的 DoT、偵測站走遠端解析
# 策略組：PROXY（若你的配置名稱不同，請一併修改，名稱不存在時 Stash 會載入失敗）

dns:
  # ── 1. 用 #!replace 整個取代原配置的 DNS。
  #    Stash 會「同時」查詢所有 nameserver，若只是追加，原本的 ISP / 系統 DNS 仍會收到查詢。
  #    default-nameserver 只用來解析 DoH 的網域；下面的 DoH 都直接寫 IP，不經任何明文 DNS。
  #    不放 system，避免 ISP DNS 收到查詢。
  default-nameserver: #!replace
    - 1.1.1.1
    - 1.0.0.1
  # ── 2. 加密 DNS（DoH），Cloudflare 不送 ECS，不會把你的真實網段帶給權威 DNS
  nameserver: #!replace
    - https://1.1.1.1/dns-query
    - https://1.0.0.1/dns-query
  # ── 3.（可選）原配置若有 nameserver-policy 把部分網域交給 ISP/國內 DNS，
  #    取消下面兩行的註解即可清空（代價：那些網域改用上面的 DoH 解析）
  # nameserver-policy: #!replace
  #   {}

rules:
  # ── 4. 阻擋 App 自己用 DoT（853 埠）直連 DNS 伺服器，迫使它改走 Stash 的 DNS
  - DST-PORT,853,REJECT

  # ── 5. DNS 洩漏測試網站：命中網域規則 → Stash 不在本地解析，交給節點遠端解析
  - DOMAIN-SUFFIX,iplark.com,PROXY
  - DOMAIN-SUFFIX,browserleaks.com,PROXY
  - DOMAIN-SUFFIX,browserleaks.net,PROXY
  - DOMAIN-SUFFIX,browserleaks.org,PROXY
  - DOMAIN-SUFFIX,ipleak.net,PROXY
  - DOMAIN-SUFFIX,dnsleaktest.com,PROXY
  - DOMAIN-SUFFIX,whoer.net,PROXY
  - DOMAIN-SUFFIX,edns.ip-api.com,PROXY
```

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
