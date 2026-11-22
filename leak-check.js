/**
 * Stash Tile —— 代理洩露檢測
 *  1. 多來源出口一致性（分流洩露 / 多出口）
 *  2. DNS 洩露 + EDNS Client Subnet 洩露（真實網段被帶給權威 DNS）
 *  3. IP 類型（機房 / 被標記代理）
 *  4. 裝置時區 vs IP 所在時區
 *  5. IPv6 出口
 */
const TIMEOUT = 8; // 秒
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function get(url) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    if (typeof setTimeout === 'function') setTimeout(() => finish({ err: 'timeout' }), (TIMEOUT + 1) * 1000);
    try {
      $httpClient.get({ url, headers: { 'User-Agent': UA }, timeout: TIMEOUT }, (err, resp, data) => {
        if (err) return finish({ err: String(err) });
        finish({ status: resp && resp.status, data });
      });
    } catch (e) {
      finish({ err: String(e) });
    }
  });
}
const json = (r) => { try { return JSON.parse(r.data); } catch (_) { return null; } };
const isV6 = (ip) => typeof ip === 'string' && ip.includes(':');
const rand = () => Array.from({ length: 24 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

function tzOffset(tz) {
  const d = new Date();
  const a = new Date(d.toLocaleString('en-US', { timeZone: tz }));
  const b = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((a - b) / 60000);
}

(async () => {
  const [ipapiR, ipinfoR, ipsbR, cfR, ednsR] = await Promise.all([
    get('http://ip-api.com/json/?fields=status,country,countryCode,city,timezone,isp,org,as,mobile,proxy,hosting,query'),
    get('https://ipinfo.io/json'),
    get('https://api.ip.sb/geoip'),
    get('https://1.1.1.1/cdn-cgi/trace'), // IP 直連目標，可測 IP 類規則的走向
    get(`http://${rand()}.edns.ip-api.com/json`), // 隨機子網域，未被覆寫強制分流 → 測真實 DNS 行為
  ]);

  const lines = [];
  let bad = 0, warn = 0;

  // ── 出口一致性
  const ipapi = json(ipapiR);
  const sources = {};
  if (ipapi && ipapi.query) sources['ip-api'] = ipapi.query;
  const ipinfo = json(ipinfoR);
  if (ipinfo && ipinfo.ip) sources['ipinfo'] = ipinfo.ip;
  const ipsb = json(ipsbR);
  if (ipsb && ipsb.ip) sources['ip.sb'] = ipsb.ip;
  if (cfR.data) {
    const m = /ip=([^\n]+)/.exec(cfR.data);
    if (m) sources['cloudflare'] = m[1].trim();
  }

  const v4 = [...new Set(Object.values(sources).filter((ip) => !isV6(ip)))];
  const v6 = [...new Set(Object.values(sources).filter(isV6))];

  if (!Object.keys(sources).length) {
    $done({ title: '代理洩露檢測', content: '❌ 所有 IP 來源都請求失敗', icon: 'xmark.shield', backgroundColor: '#8E8E93' });
    return;
  }

  if (ipapi && ipapi.query) {
    lines.push(`出口：${ipapi.query}  ${ipapi.countryCode || ''} ${ipapi.city || ''}`);
    lines.push(`ISP：${ipapi.isp || ipapi.org || '-'}`);
  }
  if (v4.length > 1) {
    bad++;
    lines.push(`❌ 多出口：${Object.entries(sources).filter(([, ip]) => !isV6(ip)).map(([k, ip]) => `${k}=${ip}`).join(', ')}`);
  } else {
    lines.push(`✅ 出口一致（${Object.keys(sources).length} 個來源）`);
  }
  if (v6.length) {
    warn++;
    lines.push(`⚠️ 出現 IPv6 出口：${v6.join(', ')}`);
  }

  // ── IP 類型
  if (ipapi && ipapi.status === 'success') {
    const tags = [];
    if (ipapi.hosting) tags.push('機房IP');
    if (ipapi.proxy) tags.push('被標記代理/VPN');
    if (ipapi.mobile) tags.push('行動網路');
    if (ipapi.hosting || ipapi.proxy) { warn++; lines.push(`⚠️ IP 類型：${tags.join('、')}`); }
    else lines.push(`✅ IP 類型：${tags.length ? tags.join('、') : '住宅/一般'}`);
  }

  // ── DNS / ECS
  const edns = json(ednsR);
  const exitCountry = ipapi && ipapi.country;
  const geoCountry = (g) => (g || '').split(' - ')[0].trim();
  if (edns && edns.dns) {
    const dc = geoCountry(edns.dns.geo);
    if (exitCountry && dc && dc !== exitCountry) {
      warn++;
      lines.push(`⚠️ DNS：${edns.dns.ip}（${dc}）≠ 出口國`);
    } else {
      lines.push(`✅ DNS：${edns.dns.ip}（${dc || '?'}）`);
    }
    if (edns.edns && edns.edns.ip) {
      const ec = geoCountry(edns.edns.geo);
      if (exitCountry && ec && ec !== exitCountry) { bad++; lines.push(`❌ ECS 洩露真實網段：${edns.edns.ip}（${ec}）`); }
      else lines.push(`ℹ️ ECS：${edns.edns.ip}（${ec || '?'}）`);
    }
  } else {
    lines.push('⚠️ DNS 檢測失敗');
  }

  // ── 時區
  try {
    const devTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const ipTz = (ipapi && ipapi.timezone) || (ipinfo && ipinfo.timezone);
    if (devTz && ipTz) {
      if (devTz === ipTz || tzOffset(devTz) === tzOffset(ipTz)) lines.push(`✅ 時區：${devTz}`);
      else { warn++; lines.push(`⚠️ 時區不符：裝置 ${devTz} / IP ${ipTz}`); }
    }
  } catch (_) {}

  const color = bad ? '#FF3B30' : warn ? '#FF9500' : '#34C759';
  const icon = bad ? 'exclamationmark.shield' : warn ? 'shield.lefthalf.filled' : 'checkmark.shield';
  const summary = bad ? `發現 ${bad} 項洩露` : warn ? `${warn} 項可疑` : '未發現洩露';
  $done({ title: `代理洩露檢測｜${summary}`, content: lines.join('\n'), icon, backgroundColor: color });
})().catch((e) => $done({ title: '代理洩露檢測', content: `腳本錯誤：${e}`, icon: 'xmark.shield', backgroundColor: '#8E8E93' }));
