# Hostinger VPS — TradeHook kurulumu (atikaiagents.cloud)

## Mimari

```
TradingView  →  https://api.atikaiagents.cloud/webhooks/...
                      ↓
              Caddy (HTTPS :443)
                 ↙        ↘
    atikaiagents.cloud    api.atikaiagents.cloud
         (web)                (api + worker kuyruk)
```

- **Panel:** `https://atikaiagents.cloud`
- **API / webhook:** `https://api.atikaiagents.cloud`
- Cloudflared tunnel **gerekmez** (domain doğrudan sunucuya bağlı)

---

## 1. DNS (Hostinger veya domain paneli)

VPS IP adresini al (Hostinger → VPS → Overview).

| Tip | Ad | Değer |
|-----|-----|-------|
| A | `@` veya `atikaiagents.cloud` | VPS IP |
| A | `api` | VPS IP |

5–30 dk sonra `ping atikaiagents.cloud` çalışmalı.

---

## 2. Kodu sunucuya al

### Seçenek A — Terminal (önerilen ilk kurulum)

Hostinger Docker ekranındaki **Terminal** butonuna tıkla:

```bash
cd /root
git clone https://github.com/KULLANICI/TradeHook.git
cd TradeHook
```

### Seçenek B — Docker Manager “Compose”

Repo GitHub’da public ise: **Compose** → repo URL yapıştır → `docker-compose.prod.yml` seç.

---

## 3. Production `.env` oluştur

```bash
cp .env.production.example .env
nano .env
```

Mutlaka değiştir:

- `POSTGRES_PASSWORD` — güçlü şifre
- `JWT_SECRET` — uzun rastgele string
- `ENCRYPTION_KEY` — 64 hex karakter (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

`DATABASE_URL` içindeki şifre `POSTGRES_PASSWORD` ile aynı olmalı.

---

## 4. İlk deploy

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

> **Hostinger notu:** VPS'te genelde nginx zaten **80 portunu** kullanır. Bu yüzden Caddy varsayılan olarak **kapalı** (`profiles: caddy`). Aşağıdaki nginx adımını uygula.

### HTTPS — mevcut nginx ile (önerilen)

```bash
# Başarısız caddy container varsa kaldır
docker compose -f docker-compose.prod.yml rm -f caddy 2>/dev/null || true

# nginx site config
sudo cp deploy/nginx-hostinger.conf /etc/nginx/sites-available/tradehook
sudo ln -sf /etc/nginx/sites-available/tradehook /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL (Let's Encrypt)
sudo certbot --nginx -d atikaiagents.cloud -d api.atikaiagents.cloud
```

### Alternatif — Caddy (80/443 boşsa)

```bash
sudo systemctl stop nginx
docker compose -f docker-compose.prod.yml --profile caddy up -d --build
```

İlk build 5–15 dk sürebilir. Kontrol:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

Tarayıcı:

- https://atikaiagents.cloud
- https://api.atikaiagents.cloud (boş/404 normal; webhook `/webhooks/...` ile çalışır)

---

## 5. TradingView webhook

Dashboard → Alarmlar → webhook URL artık şöyle olacak:

```
https://api.atikaiagents.cloud/webhooks/tradingview/<TOKEN>
```

`.env` içinde `WEBHOOK_PUBLIC_URL=https://api.atikaiagents.cloud` olduğundan emin ol.

---

## 6. Güncelleme (lokalde yaptığın değişiklikleri sunucuya atmak)

Lokal:

```bash
git add .
git commit -m "..."
git push
```

Sunucu (Terminal):

```bash
cd /root/TradeHook
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Sadece DB migration varsa:

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

---

## Sorun giderme

| Sorun | Çözüm |
|-------|--------|
| Site açılmıyor | DNS A kayıtları, `docker ps`, nginx/Caddy logları |
| `port 80 already in use` | Caddy yerine nginx kullan (yukarıdaki adım) |
| Webhook gelmiyor | `api` subdomain DNS, firewall 80/443 açık |
| Emir kuyrukta kalıyor | `worker` container çalışıyor mu: `logs worker` |
| SSL hatası | DNS henüz yayılmamış; 10 dk bekle |

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f worker
```
