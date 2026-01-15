# TELYA REPARATUR-MANAGEMENT-SYSTEM - TEKNİK DOKÜMANTASYON

**Versiyon:** 2.0  
**Tarih:** 2026-01-15  
**Amaç:** Bağımsız olarak yeniden oluşturulabilirlik için tam teknik referans

---

## İÇİNDEKİLER

1. [Enum Tanımları](#1-enum-tanimlari)
2. [Veritabanı Şeması](#2-veritabani-semasi)
3. [RLS Politikaları](#3-rls-politikalari)
4. [RPC Fonksiyonları](#4-rpc-fonksiyonlari)
5. [Trigger'lar](#5-triggerlar)
6. [Yardımcı Tablolar](#6-yardimci-tablolar)
7. [Storage Bucket'lar](#7-storage-bucketlar)

---

## 1. ENUM TANIMLARI

### 1.1 app_role
Kullanıcı rolleri - hem dahili çalışanlar hem de B2B ortakları için.

```sql
CREATE TYPE public.app_role AS ENUM (
  'ADMIN',          -- Tam sistem erişimi
  'THEKE',          -- Karşılama/müşteri hizmetleri
  'TECHNIKER',      -- Teknisyen/tamir
  'BUCHHALTUNG',    -- Muhasebe (salt okunur)
  'FILIALLEITER',   -- Şube müdürü
  'B2B_INHABER',    -- B2B ortak sahibi (tam B2B erişimi)
  'B2B_ADMIN',      -- B2B yönetici
  'B2B_USER'        -- B2B standart kullanıcı
);
```

### 1.2 ticket_status
Onarım bileti yaşam döngüsü durumları.

```sql
CREATE TYPE public.ticket_status AS ENUM (
  'NEU_EINGEGANGEN',              -- Yeni alındı
  'IN_DIAGNOSE',                  -- Teşhis aşamasında
  'WARTET_AUF_TEIL_ODER_FREIGABE', -- Parça veya onay bekliyor (KVA)
  'FREIGEGEBEN',                  -- Onaylandı (KVA onayı sonrası)
  'IN_REPARATUR',                 -- Onarım aşamasında
  'FERTIG_ZUR_ABHOLUNG',          -- Teslimata hazır
  'ABGEHOLT',                     -- Teslim edildi
  'STORNIERT',                    -- İptal edildi
  'EINGESENDET',                  -- B2B: Gönderildi
  'RUECKVERSAND_AN_B2B',          -- B2B: B2B'ye iade gönderimi
  'RUECKVERSAND_AN_ENDKUNDE'      -- B2B: Son müşteriye iade gönderimi
);
```

### 1.3 device_type
Cihaz türleri.

```sql
CREATE TYPE public.device_type AS ENUM (
  'HANDY',       -- Cep telefonu
  'TABLET',      -- Tablet
  'LAPTOP',      -- Dizüstü bilgisayar
  'SMARTWATCH',  -- Akıllı saat
  'OTHER'        -- Diğer
);
```

### 1.4 error_code
Arıza/onarım türleri.

```sql
CREATE TYPE public.error_code AS ENUM (
  'DISPLAYBRUCH',    -- Ekran kırığı
  'WASSERSCHADEN',   -- Su hasarı
  'AKKU_SCHWACH',    -- Zayıf batarya
  'LADEBUCHSE',      -- Şarj soketi
  'KAMERA',          -- Kamera
  'MIKROFON',        -- Mikrofon
  'LAUTSPRECHER',    -- Hoparlör
  'TASTATUR',        -- Klavye
  'SONSTIGES'        -- Diğer
);
```

### 1.5 error_cause
Arıza nedenleri.

```sql
CREATE TYPE public.error_cause AS ENUM (
  'STURZ',            -- Düşme
  'FEUCHTIGKEIT',     -- Nem
  'VERSCHLEISS',      -- Aşınma
  'HERSTELLERFEHLER', -- Üretici hatası
  'UNKLAR'            -- Belirsiz
);
```

### 1.6 kva_status
Maliyet tahmini (KVA) durumları.

```sql
CREATE TYPE public.kva_status AS ENUM (
  'ENTWURF',            -- Taslak
  'ERSTELLT',           -- Oluşturuldu
  'GESENDET',           -- Gönderildi
  'WARTET_AUF_ANTWORT', -- Yanıt bekliyor
  'FREIGEGEBEN',        -- Onaylandı
  'ABGELEHNT',          -- Reddedildi
  'ENTSORGEN',          -- İmha et
  'RUECKFRAGE',         -- Soru var
  'ABGELAUFEN'          -- Süresi doldu
);
```

### 1.7 kva_type
KVA fiyatlandırma türleri.

```sql
CREATE TYPE public.kva_type AS ENUM (
  'FIXPREIS',  -- Sabit fiyat
  'VARIABEL',  -- Değişken fiyat
  'BIS_ZU'     -- Maksimum limit
);
```

### 1.8 kva_approval_channel
KVA onay kanalları.

```sql
CREATE TYPE public.kva_approval_channel AS ENUM (
  'ONLINE',   -- Online portal
  'TELEFON',  -- Telefon
  'VOR_ORT',  -- Yerinde
  'EMAIL',    -- E-posta
  'SMS'       -- SMS
);
```

### 1.9 price_mode
Bilet fiyatlandırma modu.

```sql
CREATE TYPE public.price_mode AS ENUM (
  'FIXPREIS',     -- Sabit fiyat
  'KVA',          -- Maliyet tahmini gerekli
  'NACH_AUFWAND'  -- Harcamaya göre
);
```

### 1.10 stock_movement_type
Stok hareket türleri.

```sql
CREATE TYPE public.stock_movement_type AS ENUM (
  'PURCHASE',           -- Satın alma (giriş)
  'CONSUMPTION',        -- Tüketim (çıkış)
  'MANUAL_OUT',         -- Manuel çıkış
  'TRANSFER_OUT',       -- Transfer çıkış
  'TRANSFER_IN',        -- Transfer giriş
  'COMPLAINT_OUT',      -- Şikayet çıkış
  'COMPLAINT_CREDIT',   -- Şikayet kredisi
  'COMPLAINT_REPLACE',  -- Şikayet değişimi
  'WRITE_OFF',          -- Zarar yazma
  'INVENTORY_PLUS',     -- Sayım artı
  'INVENTORY_MINUS',    -- Sayım eksi
  'INITIAL_STOCK'       -- Başlangıç stoğu
);
```

### 1.11 b2b_shipment_status
B2B gönderi durumları.

```sql
CREATE TYPE public.b2b_shipment_status AS ENUM (
  'ANGELEGT',              -- Oluşturuldu
  'GERAETE_UNTERWEGS',     -- Cihazlar yolda
  'BEI_TELYA_EINGEGANGEN', -- Telya'da alındı
  'ABGESCHLOSSEN',         -- Tamamlandı
  'RETOUR_ANGELEGT',       -- İade oluşturuldu
  'RETOUR_UNTERWEGS',      -- İade yolda
  'RETOUR_ZUGESTELLT'      -- İade teslim edildi
);
```

### 1.12 complaint_status
Tedarikçi şikayet durumları.

```sql
CREATE TYPE public.complaint_status AS ENUM (
  'OPEN',                  -- Açık
  'SENT_BACK',             -- Geri gönderildi
  'CREDIT_RECEIVED',       -- Kredi alındı
  'REPLACEMENT_RECEIVED',  -- Değişim alındı
  'CLOSED'                 -- Kapalı
);
```

### 1.13 notification_channel
Bildirim kanalları.

```sql
CREATE TYPE public.notification_channel AS ENUM (
  'EMAIL',    -- E-posta
  'SMS',      -- SMS
  'WHATSAPP'  -- WhatsApp
);
```

### 1.14 notification_trigger
Bildirim tetikleyicileri.

```sql
CREATE TYPE public.notification_trigger AS ENUM (
  'TICKET_CREATED',      -- Bilet oluşturuldu
  'KVA_READY',           -- KVA hazır
  'KVA_APPROVED',        -- KVA onaylandı
  'KVA_REJECTED',        -- KVA reddedildi
  'REPAIR_IN_PROGRESS',  -- Onarım devam ediyor
  'READY_FOR_PICKUP',    -- Teslimata hazır
  'REMINDER_NOT_PICKED', -- Teslim alınmadı hatırlatması
  'KVA_REMINDER',        -- KVA hatırlatması
  'KVA_B2B_APPROVED'     -- B2B KVA onaylandı
);
```

### 1.15 message_type
Mesaj türleri.

```sql
CREATE TYPE public.message_type AS ENUM (
  'internal_note',     -- Dahili not (sadece çalışanlar görür)
  'b2b_message',       -- B2B mesajı (B2B + çalışanlar görür)
  'customer_message'   -- Müşteri mesajı (herkes görür)
);
```

### 1.16 photo_category
Fotoğraf kategorileri.

```sql
CREATE TYPE public.photo_category AS ENUM (
  'zustand_eingang',    -- Giriş durumu
  'schadensbild',       -- Hasar görüntüsü
  'reparatur_vorher',   -- Onarım öncesi
  'reparatur_nachher',  -- Onarım sonrası
  'sonstiges'           -- Diğer
);
```

### 1.17 part_usage_reason
Parça kullanım nedenleri.

```sql
CREATE TYPE public.part_usage_reason AS ENUM (
  'REPARATUR',       -- Onarım
  'TEST',            -- Test
  'AUSTAUSCH',       -- Değişim
  'FEHLERTEIL',      -- Arızalı parça
  'SELBSTVERSCHULDEN', -- Kendi kusuru (admin onayı gerekir)
  'SONSTIGES'        -- Diğer
);
```

### 1.18 approval_status
Onay durumları (parça kullanımı için).

```sql
CREATE TYPE public.approval_status AS ENUM (
  'PENDING',   -- Beklemede
  'APPROVED',  -- Onaylandı
  'REJECTED'   -- Reddedildi
);
```

### 1.19 inventory_status
Envanter sayım durumları.

```sql
CREATE TYPE public.inventory_status AS ENUM (
  'IN_PROGRESS',      -- Devam ediyor
  'PENDING_APPROVAL', -- Onay bekliyor
  'APPROVED',         -- Onaylandı
  'REJECTED'          -- Reddedildi
);
```

### 1.20 part_category_enum
Parça kategorileri.

```sql
CREATE TYPE public.part_category_enum AS ENUM (
  'DISPLAY',        -- Ekran
  'AKKU',           -- Batarya
  'LADEBUCHSE',     -- Şarj soketi
  'KAMERA_VORNE',   -- Ön kamera
  'KAMERA_HINTEN',  -- Arka kamera
  'LAUTSPRECHER',   -- Hoparlör
  'MIKROFON',       -- Mikrofon
  'BACKCOVER',      -- Arka kapak
  'RAHMEN',         -- Çerçeve
  'FLEXKABEL',      -- Flex kablo
  'BUTTONS',        -- Tuşlar
  'VIBRATIONSMOTOR', -- Titreşim motoru
  'SONSTIGES'       -- Diğer
);
```

---

## 2. VERİTABANI ŞEMASI

### 2.1 TEMEL TABLOLAR

#### 2.1.1 customers
Dahili müşteriler (son kullanıcılar).

```sql
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,                          -- Ad
  last_name TEXT NOT NULL,                           -- Soyad
  phone TEXT NOT NULL,                               -- Telefon (zorunlu)
  email TEXT,                                        -- E-posta
  address TEXT,                                      -- Adres (tek satır, eski format)
  marketing_consent BOOLEAN DEFAULT false,           -- Pazarlama izni
  marketing_consent_at TIMESTAMPTZ,                  -- Pazarlama izni tarihi
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
```

#### 2.1.2 devices
Müşteri cihazları.

```sql
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_type device_type NOT NULL DEFAULT 'HANDY',  -- Cihaz türü
  brand TEXT NOT NULL,                                -- Marka
  model TEXT NOT NULL,                                -- Model
  color TEXT,                                         -- Renk
  imei_or_serial TEXT,                               -- IMEI veya seri no
  serial_number TEXT,                                -- Seri numarası (ayrı alan)
  imei_unreadable BOOLEAN DEFAULT false,             -- IMEI okunamaz
  serial_unreadable BOOLEAN DEFAULT false,           -- Seri no okunamaz
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX idx_devices_customer ON devices(customer_id);
CREATE INDEX idx_devices_imei ON devices(imei_or_serial);

-- RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
```

#### 2.1.3 repair_tickets
Ana onarım biletleri tablosu - sistemin çekirdeği.

```sql
CREATE TABLE public.repair_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,                -- Benzersiz bilet numarası (TE+Kod+Yıl+Sıra)
  
  -- Müşteri & Cihaz
  customer_id UUID NOT NULL REFERENCES customers(id),
  device_id UUID NOT NULL REFERENCES devices(id),
  
  -- B2B İlişkileri (NULL = dahili bilet)
  is_b2b BOOLEAN DEFAULT false,
  b2b_partner_id UUID REFERENCES b2b_partners(id),
  b2b_customer_id UUID REFERENCES b2b_customers(id),
  shipment_id UUID REFERENCES b2b_shipments(id),
  
  -- B2B Fiyatlandırma
  internal_price NUMERIC,                            -- B2B iç fiyat (Telya → B2B)
  endcustomer_price NUMERIC,                         -- Son müşteri fiyatı (B2B → Müşteri)
  endcustomer_price_released BOOLEAN DEFAULT false,  -- Son müşteri fiyatı serbest bırakıldı
  endcustomer_kva_allowed BOOLEAN DEFAULT true,      -- Son müşteriye KVA gönderilebilir
  endcustomer_reference TEXT,                        -- Son müşteri referansı
  endcustomer_return_address JSONB,                  -- Son müşteri iade adresi
  return_to_endcustomer BOOLEAN DEFAULT false,       -- Son müşteriye iade
  
  -- Durum & İş Akışı
  status ticket_status NOT NULL DEFAULT 'NEU_EINGEGANGEN',
  priority TEXT,                                     -- Öncelik (normal/high/urgent)
  
  -- Arıza Bilgileri
  error_code error_code,                             -- Arıza kodu
  error_cause error_cause,                           -- Arıza nedeni
  error_description_text TEXT,                       -- Arıza açıklaması
  
  -- Cihaz Durumu
  device_condition_at_intake JSONB,                  -- Girişteki cihaz durumu (checklist)
  device_condition_remarks TEXT,                     -- Durum notları
  accessories TEXT,                                  -- Aksesuarlar
  
  -- Şifre Bilgileri
  passcode_type TEXT,                                -- Şifre türü (pin/pattern/password/none)
  passcode_pin TEXT,                                 -- PIN kodu
  passcode_pattern JSONB,                            -- Desen (3x3 grid)
  passcode_info TEXT,                                -- Şifre notu
  
  -- Fiyatlandırma
  price_mode price_mode DEFAULT 'KVA',               -- Fiyatlandırma modu
  estimated_price NUMERIC,                           -- Tahmini fiyat
  final_price NUMERIC,                               -- Son fiyat
  auto_approved_limit NUMERIC,                       -- Otomatik onay limiti
  
  -- KVA (Maliyet Tahmini)
  kva_required BOOLEAN DEFAULT false,                -- KVA gerekli
  kva_approved BOOLEAN,                              -- KVA onaylandı
  kva_approved_at TIMESTAMPTZ,                       -- KVA onay tarihi
  kva_decision_at TIMESTAMPTZ,                       -- KVA karar tarihi
  kva_decision_by TEXT,                              -- KVA kararı veren
  kva_decision_type TEXT,                            -- KVA karar türü
  kva_fee_applicable BOOLEAN,                        -- KVA ücreti uygulanabilir
  kva_fee_amount NUMERIC,                            -- KVA ücreti tutarı
  kva_token TEXT UNIQUE,                             -- Müşteri takip kodu (7 karakter)
  disposal_option TEXT,                              -- İmha seçeneği
  
  -- Konum & Atama
  location_id UUID REFERENCES locations(id),         -- Şube
  workshop_id UUID REFERENCES workshops(id),         -- Atölye
  assigned_technician_id UUID REFERENCES profiles(id), -- Atanan teknisyen
  
  -- İletişim Tercihleri
  sms_opt_in BOOLEAN DEFAULT true,                   -- SMS izni
  email_opt_in BOOLEAN DEFAULT true,                 -- E-posta izni
  
  -- Yasal
  legal_notes_ack BOOLEAN DEFAULT false,             -- Yasal notlar onaylandı
  internal_notes TEXT,                               -- Dahili notlar (eski format)
  
  -- Zaman damgaları
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX idx_tickets_status ON repair_tickets(status);
CREATE INDEX idx_tickets_customer ON repair_tickets(customer_id);
CREATE INDEX idx_tickets_b2b_partner ON repair_tickets(b2b_partner_id);
CREATE INDEX idx_tickets_location ON repair_tickets(location_id);
CREATE INDEX idx_tickets_created ON repair_tickets(created_at DESC);
CREATE INDEX idx_tickets_kva_token ON repair_tickets(kva_token);

-- RLS
ALTER TABLE repair_tickets ENABLE ROW LEVEL SECURITY;
```

#### 2.1.4 status_history
Bilet durum değişiklik geçmişi.

```sql
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  old_status ticket_status,                          -- Önceki durum
  new_status ticket_status NOT NULL,                 -- Yeni durum
  changed_by_user_id UUID REFERENCES profiles(id),   -- Değiştiren kullanıcı
  note TEXT,                                         -- Not
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_ticket ON status_history(repair_ticket_id);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
```

---

### 2.2 B2B MODÜLÜ

#### 2.2.1 b2b_partners
B2B iş ortakları - branding ve yapılandırma dahil.

```sql
CREATE TABLE public.b2b_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                                -- Şirket adı
  code TEXT,                                         -- Kısa kod (bilet numarası için)
  customer_number TEXT,                              -- Müşteri numarası
  
  -- İletişim
  contact_name TEXT,                                 -- İletişim kişisi
  contact_email TEXT,                                -- İletişim e-postası
  contact_phone TEXT,                                -- İletişim telefonu
  billing_email TEXT,                                -- Fatura e-postası
  
  -- Adres
  street TEXT,
  zip TEXT,
  city TEXT,
  country TEXT,
  
  -- Branding (Whitelabel)
  company_logo_url TEXT,                             -- Logo URL
  company_slogan TEXT,                               -- Slogan
  primary_color TEXT,                                -- Ana renk (HEX)
  secondary_color TEXT,                              -- İkincil renk (HEX)
  legal_footer TEXT,                                 -- Yasal dipnot
  privacy_policy_url TEXT,                           -- Gizlilik politikası URL
  terms_and_conditions TEXT,                         -- Şartlar ve koşullar
  document_texts JSONB,                              -- Belge metinleri (özelleştirilebilir)
  
  -- Operasyonel
  location_id UUID REFERENCES locations(id),         -- Varsayılan konum
  workshop_id UUID REFERENCES workshops(id),         -- Atanan atölye
  default_return_address JSONB,                      -- Varsayılan iade adresi
  placeholder_customer_id UUID REFERENCES customers(id), -- B2B için placeholder müşteri
  
  -- Durum
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_partners_code ON b2b_partners(code);
CREATE INDEX idx_b2b_partners_active ON b2b_partners(is_active) WHERE is_active = true;

ALTER TABLE b2b_partners ENABLE ROW LEVEL SECURITY;
```

#### 2.2.2 b2b_customers
B2B ortaklarının kendi müşterileri.

```sql
CREATE TABLE public.b2b_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID NOT NULL REFERENCES b2b_partners(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Adres (yapılandırılmış)
  street TEXT,
  house_number TEXT,
  zip TEXT,
  city TEXT,
  country TEXT,
  address TEXT,                                      -- Eski format (tek satır)
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_customers_partner ON b2b_customers(b2b_partner_id);

ALTER TABLE b2b_customers ENABLE ROW LEVEL SECURITY;
```

#### 2.2.3 b2b_shipments
B2B gönderi yönetimi.

```sql
CREATE TABLE public.b2b_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID NOT NULL REFERENCES b2b_partners(id),
  shipment_number TEXT NOT NULL UNIQUE,              -- Gönderi numarası (B2B-YYYY-NNNNNN)
  shipment_type TEXT DEFAULT 'INBOUND',              -- INBOUND veya OUTBOUND
  status b2b_shipment_status NOT NULL DEFAULT 'ANGELEGT',
  
  -- Adresler
  sender_address JSONB,                              -- Gönderen adresi
  recipient_address JSONB,                           -- Alıcı adresi
  endcustomer_address JSONB,                         -- Son müşteri adresi (direkt iade için)
  return_to_endcustomer BOOLEAN DEFAULT false,       -- Son müşteriye iade
  
  -- Kargo Bilgileri
  dhl_tracking_number TEXT,                          -- DHL takip numarası
  dhl_label_url TEXT,                                -- DHL etiket URL
  
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_shipments_partner ON b2b_shipments(b2b_partner_id);
CREATE INDEX idx_b2b_shipments_status ON b2b_shipments(status);

ALTER TABLE b2b_shipments ENABLE ROW LEVEL SECURITY;
```

#### 2.2.4 b2b_user_invitations
B2B kullanıcı davetleri.

```sql
CREATE TABLE public.b2b_user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID NOT NULL REFERENCES b2b_partners(id),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'B2B_USER',
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_invitations_token ON b2b_user_invitations(invitation_token);
CREATE INDEX idx_b2b_invitations_email ON b2b_user_invitations(email);

ALTER TABLE b2b_user_invitations ENABLE ROW LEVEL SECURITY;
```

#### 2.2.5 b2b_prices
B2B'ye özel fiyat listesi.

```sql
CREATE TABLE public.b2b_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID NOT NULL REFERENCES b2b_partners(id),
  device_type TEXT NOT NULL,                         -- Cihaz türü
  brand TEXT,                                        -- Marka (NULL = tümü)
  model TEXT,                                        -- Model (NULL = tümü)
  repair_type TEXT NOT NULL,                         -- Onarım türü
  b2b_price NUMERIC NOT NULL DEFAULT 0,              -- B2B fiyatı (Telya → B2B)
  endcustomer_price NUMERIC,                         -- Son müşteri fiyatı
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_prices_partner ON b2b_prices(b2b_partner_id);

ALTER TABLE b2b_prices ENABLE ROW LEVEL SECURITY;
```

#### 2.2.6 b2b_document_templates
B2B belge şablonları (whitelabel).

```sql
CREATE TABLE public.b2b_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID NOT NULL REFERENCES b2b_partners(id),
  template_type TEXT NOT NULL,                       -- eingangsbeleg, reparaturbericht, lieferschein
  title TEXT NOT NULL,
  intro TEXT,                                        -- Giriş metni
  conditions TEXT,                                   -- Koşullar
  footer TEXT,                                       -- Dipnot
  legal_text TEXT,                                   -- Yasal metin
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_templates_partner ON b2b_document_templates(b2b_partner_id);

ALTER TABLE b2b_document_templates ENABLE ROW LEVEL SECURITY;
```

---

### 2.3 KULLANICI/ROL YÖNETİMİ

#### 2.3.1 profiles
Kullanıcı profilleri.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Konum Ataması
  location_id UUID REFERENCES locations(id),         -- Ana konum
  default_location_id UUID REFERENCES locations(id), -- Varsayılan konum
  can_view_all_locations BOOLEAN DEFAULT false,      -- Tüm konumları görme yetkisi
  
  -- B2B Bağlantısı
  b2b_partner_id UUID REFERENCES b2b_partners(id),   -- B2B kullanıcıları için
  
  is_active BOOLEAN DEFAULT false,                   -- Hesap aktif mi (ilk kullanıcı hariç)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_b2b ON profiles(b2b_partner_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

#### 2.3.2 user_roles
Kullanıcı rolleri (ayrı tablo - güvenlik için kritik).

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'THEKE',
  UNIQUE(user_id, role)                              -- Her kullanıcıya her rol bir kez
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

#### 2.3.3 permissions
İzin tanımları.

```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,                          -- İzin anahtarı (VIEW_ALL_LOCATIONS vb.)
  description TEXT NOT NULL,                         -- Açıklama
  category TEXT DEFAULT 'general',                   -- Kategori
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
```

#### 2.3.4 role_permissions
Rol-izin eşleşmeleri.

```sql
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES permissions(key),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_key)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
```

#### 2.3.5 user_locations
Kullanıcı-konum atamaları.

```sql
CREATE TABLE public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,                  -- Varsayılan konum
  can_view BOOLEAN DEFAULT true,                     -- Görüntüleme yetkisi
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, location_id)
);

CREATE INDEX idx_user_locations_user ON user_locations(user_id);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
```

#### 2.3.6 locations
Şubeler/konumlar.

```sql
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,                                         -- Kısa kod (bilet numarası için)
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
```

#### 2.3.7 workshops
Atölyeler (B2B için özellikle önemli).

```sql
CREATE TABLE public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,                                         -- Kısa kod
  address JSONB,                                     -- Yapılandırılmış adres
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
```

---

### 2.4 KVA MODÜLÜ

#### 2.4.1 kva_estimates
Maliyet tahminleri (versiyonlu).

```sql
CREATE TABLE public.kva_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  parent_kva_id UUID REFERENCES kva_estimates(id),   -- Revizyon için
  version INTEGER DEFAULT 1,                         -- Versiyon numarası
  is_current BOOLEAN DEFAULT true,                   -- Geçerli versiyon mu
  
  -- Fiyatlandırma
  kva_type kva_type DEFAULT 'VARIABEL',
  total_cost NUMERIC,                                -- Toplam maliyet (Telya iç)
  internal_price NUMERIC,                            -- B2B iç fiyat
  endcustomer_price NUMERIC,                         -- Son müşteri fiyatı
  endcustomer_price_released BOOLEAN DEFAULT false,  -- Son müşteriye gösterilsin mi
  parts_cost NUMERIC,                                -- Parça maliyeti
  repair_cost NUMERIC,                               -- İşçilik maliyeti
  min_cost NUMERIC,                                  -- Minimum maliyet (BIS_ZU için)
  max_cost NUMERIC,                                  -- Maksimum maliyet (BIS_ZU için)
  
  -- Teşhis
  diagnosis TEXT,                                    -- Teşhis açıklaması
  repair_description TEXT,                           -- Onarım açıklaması
  notes TEXT,                                        -- Notlar
  
  -- KVA Ücreti
  kva_fee_amount NUMERIC,                            -- KVA ücreti
  kva_fee_waived BOOLEAN DEFAULT false,              -- KVA ücreti muaf
  kva_fee_waiver_by UUID REFERENCES profiles(id),    -- Muafiyet veren
  kva_fee_waiver_reason TEXT,                        -- Muafiyet nedeni
  
  -- Durum & Karar
  status kva_status DEFAULT 'ENTWURF',
  decision kva_status,                               -- Son karar
  decision_at TIMESTAMPTZ,
  decision_by_customer BOOLEAN,                      -- Müşteri mi karar verdi
  decision_channel kva_approval_channel,             -- Karar kanalı
  decision_note TEXT,                                -- Karar notu
  disposal_option TEXT,                              -- İmha seçeneği
  
  -- Gönderim
  sent_at TIMESTAMPTZ,
  sent_via notification_channel,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Geçerlilik
  valid_until TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  
  -- İletişim
  customer_question TEXT,                            -- Müşteri sorusu
  staff_answer TEXT,                                 -- Personel yanıtı
  
  -- Meta
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kva_ticket ON kva_estimates(repair_ticket_id);
CREATE INDEX idx_kva_current ON kva_estimates(is_current) WHERE is_current = true;
CREATE INDEX idx_kva_status ON kva_estimates(status);

ALTER TABLE kva_estimates ENABLE ROW LEVEL SECURITY;
```

#### 2.4.2 kva_history
KVA değişiklik geçmişi.

```sql
CREATE TABLE public.kva_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kva_estimate_id UUID NOT NULL REFERENCES kva_estimates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,                              -- Eylem (created, updated, sent, approved, vb.)
  old_values JSONB,                                  -- Eski değerler
  new_values JSONB,                                  -- Yeni değerler
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kva_history_kva ON kva_history(kva_estimate_id);

ALTER TABLE kva_history ENABLE ROW LEVEL SECURITY;
```

#### 2.4.3 kva_fee_settings
KVA ücret ayarları.

```sql
CREATE TABLE public.kva_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type device_type,                           -- NULL = tüm cihazlar
  b2b_partner_id UUID REFERENCES b2b_partners(id),   -- NULL = genel ayar
  fee_amount NUMERIC NOT NULL DEFAULT 0,             -- Ücret tutarı
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kva_fee_settings ENABLE ROW LEVEL SECURITY;
```

---

### 2.5 STOK/PARÇA YÖNETİMİ

#### 2.5.1 parts
Parçalar/yedek parça kataloğu.

```sql
CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                                -- Parça adı
  sku TEXT,                                          -- SKU (stok kodu)
  supplier_sku TEXT,                                 -- Tedarikçi SKU
  
  -- Kategorilendirme
  part_category TEXT,                                -- Kategori
  device_type TEXT,                                  -- Cihaz türü
  brand TEXT,                                        -- Marka
  model TEXT,                                        -- Model
  model_id UUID REFERENCES device_catalog(id),       -- Katalog bağlantısı
  
  -- Tedarikçi
  supplier_id UUID REFERENCES suppliers(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  
  -- Stok
  stock_quantity INTEGER DEFAULT 0,                  -- Güncel stok (derived)
  min_stock_quantity INTEGER DEFAULT 0,              -- Minimum stok
  stock_location_id UUID REFERENCES stock_locations(id),
  storage_location TEXT,                             -- Raf/kutu konumu
  
  -- Fiyatlandırma
  purchase_price NUMERIC DEFAULT 0,                  -- Alış fiyatı
  sales_price NUMERIC DEFAULT 0,                     -- Satış fiyatı
  last_purchase_price NUMERIC,                       -- Son alış fiyatı
  avg_purchase_price NUMERIC,                        -- Ortalama alış fiyatı
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parts_sku ON parts(sku);
CREATE INDEX idx_parts_supplier ON parts(supplier_id);
CREATE INDEX idx_parts_category ON parts(part_category);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
```

#### 2.5.2 manufacturers
Üreticiler.

```sql
CREATE TABLE public.manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
```

#### 2.5.3 device_catalog
Cihaz kataloğu (marka/model).

```sql
CREATE TABLE public.device_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL DEFAULT 'HANDY',
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_type, brand, model)
);

CREATE INDEX idx_device_catalog_brand ON device_catalog(brand);

ALTER TABLE device_catalog ENABLE ROW LEVEL SECURITY;
```

#### 2.5.4 stock_locations
Stok konumları.

```sql
CREATE TABLE public.stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  name TEXT NOT NULL DEFAULT 'Hauptlager',
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_locations_location ON stock_locations(location_id);

ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
```

#### 2.5.5 stock_movements
Stok hareketleri.

```sql
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id),
  stock_location_id UUID NOT NULL REFERENCES stock_locations(id),
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,                         -- Pozitif = giriş, Negatif = çıkış
  
  -- Fiyat Bilgileri
  unit_price NUMERIC,
  total_value NUMERIC,
  
  -- Stok Takibi
  stock_before INTEGER DEFAULT 0,
  stock_after INTEGER DEFAULT 0,
  
  -- Referanslar
  repair_ticket_id UUID REFERENCES repair_tickets(id),
  supplier_id UUID REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  complaint_id UUID REFERENCES complaints(id),
  transfer_movement_id UUID REFERENCES stock_movements(id),
  inventory_session_id UUID REFERENCES inventory_sessions(id),
  
  -- Onay
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  reason TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_part ON stock_movements(part_id);
CREATE INDEX idx_stock_movements_location ON stock_movements(stock_location_id);
CREATE INDEX idx_stock_movements_ticket ON stock_movements(repair_ticket_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
```

#### 2.5.6 ticket_part_usage
Bilet parça kullanımı.

```sql
CREATE TABLE public.ticket_part_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  quantity INTEGER DEFAULT 1,
  
  -- Kullanıcı Bilgisi
  used_by_user_id UUID NOT NULL REFERENCES profiles(id),
  used_by_role TEXT NOT NULL,
  
  -- Neden & Not
  reason part_usage_reason DEFAULT 'REPARATUR',
  note TEXT,
  
  -- Onay (SELBSTVERSCHULDEN için gerekli)
  requires_admin_approval BOOLEAN DEFAULT false,
  approval_status approval_status,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  approval_note TEXT,
  reserved_at TIMESTAMPTZ,                           -- Onay beklerken rezerve
  
  -- Stok Hareket Bağlantısı
  stock_movement_id UUID REFERENCES stock_movements(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_part_usage_ticket ON ticket_part_usage(repair_ticket_id);
CREATE INDEX idx_ticket_part_usage_part ON ticket_part_usage(part_id);

ALTER TABLE ticket_part_usage ENABLE ROW LEVEL SECURITY;
```

#### 2.5.7 suppliers
Tedarikçiler.

```sql
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,                                       -- Vergi numarası
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
```

#### 2.5.8 purchase_orders
Satın alma siparişleri.

```sql
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,                 -- Sipariş numarası (PO-YYYY-NNNNN)
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  stock_location_id UUID NOT NULL REFERENCES stock_locations(id),
  status TEXT DEFAULT 'DRAFT',                       -- DRAFT, ORDERED, PARTIAL, RECEIVED, CANCELLED
  
  -- Tarihler
  order_date DATE,
  expected_delivery DATE,
  
  -- Fatura
  invoice_number TEXT,
  invoice_date DATE,
  
  total_amount NUMERIC,
  notes TEXT,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
```

#### 2.5.9 purchase_order_items
Satın alma sipariş kalemleri.

```sql
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_items_order ON purchase_order_items(purchase_order_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
```

#### 2.5.10 complaints
Tedarikçi şikayetleri (reklamasyon).

```sql
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT NOT NULL UNIQUE,             -- RK-YYYY-NNNNN
  part_id UUID NOT NULL REFERENCES parts(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  stock_location_id UUID NOT NULL REFERENCES stock_locations(id),
  repair_ticket_id UUID REFERENCES repair_tickets(id),
  
  status complaint_status DEFAULT 'OPEN',
  quantity INTEGER DEFAULT 1,
  reason TEXT NOT NULL,
  
  -- Çözüm
  resolution_type TEXT,                              -- credit, replacement, rejected
  credit_amount NUMERIC,
  replacement_quantity INTEGER,
  
  -- Takip
  tracking_number TEXT,
  sent_back_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_supplier ON complaints(supplier_id);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
```

#### 2.5.11 inventory_sessions
Envanter sayım oturumları.

```sql
CREATE TABLE public.inventory_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number TEXT NOT NULL UNIQUE,               -- INV-YYYY-NNNNN
  stock_location_id UUID NOT NULL REFERENCES stock_locations(id),
  status inventory_status DEFAULT 'IN_PROGRESS',
  
  -- Sayım Bilgileri
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_items_counted INTEGER,
  total_discrepancies INTEGER,
  total_value_difference NUMERIC,
  
  -- Onay
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_sessions_status ON inventory_sessions(status);

ALTER TABLE inventory_sessions ENABLE ROW LEVEL SECURITY;
```

#### 2.5.12 inventory_counts
Envanter sayım detayları.

```sql
CREATE TABLE public.inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_session_id UUID NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  
  expected_quantity INTEGER DEFAULT 0,               -- Beklenen miktar
  counted_quantity INTEGER DEFAULT 0,                -- Sayılan miktar
  difference INTEGER,                                -- Fark (hesaplanır)
  
  unit_value NUMERIC,                                -- Birim değer
  value_difference NUMERIC,                          -- Değer farkı
  
  discrepancy_reason TEXT,                           -- Fark nedeni
  counted_by UUID NOT NULL,
  counted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_counts_session ON inventory_counts(inventory_session_id);

ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
```

---

### 2.6 İLETİŞİM

#### 2.6.1 ticket_messages
Bilet mesajları.

```sql
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  
  -- Gönderen
  sender_type TEXT NOT NULL,                         -- staff, b2b, customer
  sender_user_id UUID REFERENCES profiles(id),       -- NULL = müşteri
  
  -- İçerik
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'customer_message',      -- Eski format
  message_type_enum message_type,                    -- Yeni format
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(repair_ticket_id);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
```

#### 2.6.2 ticket_internal_notes
Dahili notlar (sadece çalışanlar görür).

```sql
CREATE TABLE public.ticket_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_notes_ticket ON ticket_internal_notes(repair_ticket_id);

ALTER TABLE ticket_internal_notes ENABLE ROW LEVEL SECURITY;
```

#### 2.6.3 ticket_photos
Bilet fotoğrafları.

```sql
CREATE TABLE public.ticket_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  storage_url TEXT NOT NULL,                         -- Supabase Storage URL
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  
  -- Kategorilendirme
  category TEXT,                                     -- Eski format
  category_enum photo_category,                      -- Yeni format
  note TEXT,
  
  -- Görünürlük
  b2b_visible BOOLEAN DEFAULT true,                  -- B2B görebilir mi
  customer_visible BOOLEAN DEFAULT false,            -- Müşteri görebilir mi
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_photos_ticket ON ticket_photos(repair_ticket_id);

ALTER TABLE ticket_photos ENABLE ROW LEVEL SECURITY;
```

#### 2.6.4 notification_templates
Bildirim şablonları.

```sql
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger notification_trigger NOT NULL,
  channel notification_channel DEFAULT 'EMAIL',
  subject TEXT,                                      -- E-posta konusu
  body TEXT NOT NULL,                                -- Şablon gövdesi (placeholder'larla)
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_notification_templates_unique ON notification_templates(trigger, channel);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
```

#### 2.6.5 notification_logs
Gönderilen bildirimler.

```sql
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- İlişkiler
  repair_ticket_id UUID REFERENCES repair_tickets(id),
  related_ticket_id UUID REFERENCES repair_tickets(id),  -- Alternatif referans
  customer_id UUID REFERENCES customers(id),
  user_id UUID REFERENCES profiles(id),              -- Dahili kullanıcı için
  
  -- Bildirim Bilgileri
  trigger notification_trigger NOT NULL,
  channel notification_channel NOT NULL,
  type TEXT,                                         -- Ek tür bilgisi
  title TEXT,
  message TEXT,
  
  -- Durum
  status TEXT DEFAULT 'pending',                     -- pending, sent, failed
  payload JSONB,                                     -- Ham payload
  is_read BOOLEAN DEFAULT false,                     -- Okundu mu
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_logs_ticket ON notification_logs(repair_ticket_id);
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
```

#### 2.6.6 feedback
Müşteri geri bildirimleri.

```sql
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID REFERENCES repair_tickets(id),
  customer_id UUID REFERENCES customers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_complaint BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_ticket ON feedback(repair_ticket_id);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
```

---

### 2.7 KALİTE KONTROL

#### 2.7.1 checklist_templates
Checklist şablonları.

```sql
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  device_type device_type,                           -- NULL = tüm cihazlar için
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
```

#### 2.7.2 checklist_items
Checklist kalemleri.

```sql
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_checklist_items_template ON checklist_items(checklist_template_id);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
```

#### 2.7.3 ticket_checklist_items
Bilete atanan checklist kalemleri.

```sql
CREATE TABLE public.ticket_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id),
  checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by_user_id UUID REFERENCES profiles(id)
);

CREATE INDEX idx_ticket_checklist_ticket ON ticket_checklist_items(repair_ticket_id);

ALTER TABLE ticket_checklist_items ENABLE ROW LEVEL SECURITY;
```

---

### 2.8 FİYATLANDIRMA

#### 2.8.1 price_list
Standart fiyat listesi.

```sql
CREATE TABLE public.price_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type device_type NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,                                        -- NULL = tüm modeller
  repair_type error_code NOT NULL,
  price NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_list_device ON price_list(device_type, brand);

ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;
```

---

### 2.9 SİSTEM

#### 2.9.1 app_settings
Uygulama ayarları.

```sql
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
```

#### 2.9.2 audit_logs
Denetim günlükleri.

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,                              -- create, update, delete, login, vb.
  entity_type TEXT NOT NULL,                         -- Tablo/varlık adı
  entity_id TEXT,                                    -- Varlık ID
  meta JSONB,                                        -- Ek bilgiler
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

#### 2.9.3 document_templates
Belge şablonları (dahili).

```sql
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                                -- eingangsbeleg, abholschein, reparaturbericht
  locale TEXT DEFAULT 'de',                          -- Dil
  title TEXT NOT NULL,
  intro TEXT,
  conditions TEXT,
  footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_document_templates_type_locale ON document_templates(type, locale);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
```

#### 2.9.4 model_requests
Model ekleme talepleri (B2B'den).

```sql
CREATE TABLE public.model_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID REFERENCES b2b_partners(id),
  requested_by UUID REFERENCES profiles(id),
  
  device_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model_name TEXT NOT NULL,
  
  status TEXT DEFAULT 'PENDING',                     -- PENDING, APPROVED, REJECTED
  rejection_reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_model_requests_status ON model_requests(status);
CREATE INDEX idx_model_requests_partner ON model_requests(b2b_partner_id);

ALTER TABLE model_requests ENABLE ROW LEVEL SECURITY;
```

---

## 3. RLS POLİTİKALARI

### 3.1 TEMEL PRENSİPLER

```sql
-- Yardımcı Fonksiyonlar (SECURITY DEFINER = RLS bypass)

-- Kullanıcının çalışan olup olmadığını kontrol eder
CREATE OR REPLACE FUNCTION public.is_employee(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- Kullanıcının B2B kullanıcısı olup olmadığını kontrol eder
CREATE OR REPLACE FUNCTION public.is_b2b_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id 
        AND role IN ('B2B_ADMIN', 'B2B_USER', 'B2B_INHABER')
    )
  END
$$;

-- Kullanıcının B2B partner ID'sini döndürür
CREATE OR REPLACE FUNCTION public.get_b2b_partner_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b2b_partner_id FROM public.profiles WHERE id = _user_id
$$;

-- Kullanıcının belirli bir role sahip olup olmadığını kontrol eder
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 3.2 TABLO BAZINDA POLİTİKALAR

#### customers
```sql
-- Çalışanlar tüm müşterileri görebilir
CREATE POLICY "Employees can view customers" 
ON public.customers FOR SELECT 
TO authenticated 
USING (is_employee(auth.uid()));

-- Çalışanlar müşteri oluşturabilir
CREATE POLICY "Employees can create customers" 
ON public.customers FOR INSERT 
TO authenticated 
WITH CHECK (is_employee(auth.uid()));

-- Çalışanlar müşteri güncelleyebilir
CREATE POLICY "Employees can update customers" 
ON public.customers FOR UPDATE 
TO authenticated 
USING (is_employee(auth.uid()));
```

#### b2b_customers
```sql
-- B2B kullanıcıları sadece kendi müşterilerini görebilir
CREATE POLICY "B2B users can view own customers" 
ON public.b2b_customers FOR SELECT 
TO public 
USING (
  is_b2b_user(auth.uid()) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

-- B2B kullanıcıları kendi müşterilerini oluşturabilir
CREATE POLICY "B2B users can create own customers" 
ON public.b2b_customers FOR INSERT 
TO public 
WITH CHECK (
  is_b2b_user(auth.uid()) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

-- B2B kullanıcıları kendi müşterilerini güncelleyebilir
CREATE POLICY "B2B users can update own customers" 
ON public.b2b_customers FOR UPDATE 
TO public 
USING (
  is_b2b_user(auth.uid()) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

-- Sadece B2B_INHABER kendi müşterilerini silebilir
CREATE POLICY "B2B_INHABER can delete own customers" 
ON public.b2b_customers FOR DELETE 
TO public 
USING (
  has_role(auth.uid(), 'B2B_INHABER') 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

-- Çalışanlar tüm B2B müşterilerini yönetebilir
CREATE POLICY "Employees can manage b2b_customers" 
ON public.b2b_customers FOR ALL 
TO public 
USING (is_employee(auth.uid()));
```

#### repair_tickets
```sql
-- Çalışanlar tüm biletleri görebilir
CREATE POLICY "Employees can view tickets" 
ON public.repair_tickets FOR SELECT 
TO authenticated 
USING (is_employee(auth.uid()));

-- B2B kullanıcıları sadece kendi biletlerini görebilir
CREATE POLICY "B2B users can view own tickets" 
ON public.repair_tickets FOR SELECT 
TO public 
USING (
  is_b2b_user(auth.uid()) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

-- Çalışanlar bilet oluşturabilir
CREATE POLICY "Employees can create tickets" 
ON public.repair_tickets FOR INSERT 
TO authenticated 
WITH CHECK (is_employee(auth.uid()));

-- B2B kullanıcıları kendi partner_id'leriyle bilet oluşturabilir
CREATE POLICY "B2B users can create own tickets" 
ON public.repair_tickets FOR INSERT 
TO public 
WITH CHECK (
  is_b2b_user(auth.uid()) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

-- Çalışanlar bilet güncelleyebilir
CREATE POLICY "Employees can update tickets" 
ON public.repair_tickets FOR UPDATE 
TO authenticated 
USING (is_employee(auth.uid()));

-- B2B kullanıcıları kendi biletlerini güncelleyebilir (sınırlı)
CREATE POLICY "B2B users can update own tickets" 
ON public.repair_tickets FOR UPDATE 
TO public 
USING (
  is_b2b_user(auth.uid()) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);
```

#### b2b_partners
```sql
-- Admin tüm B2B ortaklarını yönetebilir
CREATE POLICY "Admins can manage B2B partners" 
ON public.b2b_partners FOR ALL 
TO public 
USING (has_role(auth.uid(), 'ADMIN'));

-- B2B kullanıcıları sadece kendi ortaklarını görebilir
CREATE POLICY "B2B users can view own partner" 
ON public.b2b_partners FOR SELECT 
TO public 
USING (
  is_b2b_user(auth.uid()) 
  AND id = get_b2b_partner_id(auth.uid())
);

-- Çalışanlar tüm B2B ortaklarını görebilir
CREATE POLICY "Employees can view all B2B partners" 
ON public.b2b_partners FOR SELECT 
TO public 
USING (is_employee(auth.uid()));
```

#### ticket_messages
```sql
-- Çalışanlar tüm mesajları görebilir
CREATE POLICY "Employees can view all messages" 
ON public.ticket_messages FOR SELECT 
TO authenticated 
USING (is_employee(auth.uid()));

-- B2B kullanıcıları kendi biletlerinin mesajlarını görebilir (internal_note hariç)
CREATE POLICY "B2B users can view own ticket messages" 
ON public.ticket_messages FOR SELECT 
TO public 
USING (
  is_b2b_user(auth.uid())
  AND message_type_enum != 'internal_note'
  AND EXISTS (
    SELECT 1 FROM repair_tickets 
    WHERE id = repair_ticket_id 
    AND b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);

-- Çalışanlar mesaj oluşturabilir
CREATE POLICY "Employees can create messages" 
ON public.ticket_messages FOR INSERT 
TO authenticated 
WITH CHECK (is_employee(auth.uid()));

-- B2B kullanıcıları kendi biletlerine mesaj ekleyebilir
CREATE POLICY "B2B users can create messages on own tickets" 
ON public.ticket_messages FOR INSERT 
TO public 
WITH CHECK (
  is_b2b_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM repair_tickets 
    WHERE id = repair_ticket_id 
    AND b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);
```

#### ticket_internal_notes
```sql
-- Sadece çalışanlar dahili notları görebilir
CREATE POLICY "Employees can view internal notes" 
ON public.ticket_internal_notes FOR SELECT 
TO authenticated 
USING (is_employee(auth.uid()));

-- Sadece çalışanlar dahili not ekleyebilir
CREATE POLICY "Employees can create internal notes" 
ON public.ticket_internal_notes FOR INSERT 
TO authenticated 
WITH CHECK (is_employee(auth.uid()));
```

#### user_roles
```sql
-- Kullanıcılar kendi rollerini görebilir
CREATE POLICY "Users can view own roles" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Sadece admin rolleri yönetebilir
CREATE POLICY "Admins can manage roles" 
ON public.user_roles FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'ADMIN'));
```

---

## 4. RPC FONKSİYONLARI

### 4.1 NUMARA ÜRETİCİLER

```sql
-- Bilet numarası üretici
CREATE OR REPLACE FUNCTION public.generate_order_number(
  _location_id UUID, 
  _b2b_partner_id UUID DEFAULT NULL,
  _workshop_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year SMALLINT;
  _year_str TEXT;
  _code TEXT;
  _seq_num INTEGER;
  _order_number TEXT;
BEGIN
  _year := (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER % 100)::SMALLINT;
  _year_str := LPAD(_year::TEXT, 2, '0');
  
  -- Kod belirleme (öncelik: B2B > Workshop > Location)
  IF _b2b_partner_id IS NOT NULL THEN
    SELECT code INTO _code FROM public.b2b_partners WHERE id = _b2b_partner_id;
  ELSIF _workshop_id IS NOT NULL THEN
    SELECT code INTO _code FROM public.workshops WHERE id = _workshop_id;
  ELSE
    SELECT code INTO _code FROM public.locations WHERE id = _location_id;
  END IF;
  
  IF _code IS NULL OR _code = '' THEN
    _code := 'XX';
  END IF;
  
  _code := UPPER(SUBSTRING(_code, 1, 3));
  
  -- Sıra numarası al (concurrent-safe)
  LOOP
    SELECT next_number INTO _seq_num
    FROM public.ticket_number_sequence
    WHERE year = _year
    FOR UPDATE;
    
    IF FOUND THEN
      UPDATE public.ticket_number_sequence 
      SET next_number = next_number + 1 
      WHERE year = _year;
      EXIT;
    ELSE
      BEGIN
        INSERT INTO public.ticket_number_sequence (year, next_number)
        VALUES (_year, 101);
        _seq_num := 100;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        NULL; -- Yeniden dene
      END;
    END IF;
  END LOOP;
  
  -- Format: TE + Kod + Yıl + Sıra (örn: TEBO250105)
  _order_number := 'TE' || _code || _year_str || LPAD(_seq_num::TEXT, 4, '0');
  
  RETURN _order_number;
END;
$$;

-- Takip kodu üretici (müşteri için)
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 0/O, 1/I hariç
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Gönderi numarası üretici
CREATE OR REPLACE FUNCTION public.generate_shipment_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num 
  FROM public.b2b_shipments 
  WHERE shipment_number LIKE 'B2B-' || year_str || '-%';
  RETURN 'B2B-' || year_str || '-' || lpad(seq_num::TEXT, 6, '0');
END;
$$;

-- Satın alma sipariş numarası
CREATE OR REPLACE FUNCTION public.generate_purchase_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO _seq
  FROM public.purchase_orders
  WHERE order_number LIKE 'PO-' || _year || '-%';
  RETURN 'PO-' || _year || '-' || lpad(_seq::TEXT, 5, '0');
END;
$$;

-- Şikayet numarası
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO _seq
  FROM public.complaints
  WHERE complaint_number LIKE 'RK-' || _year || '-%';
  RETURN 'RK-' || _year || '-' || lpad(_seq::TEXT, 5, '0');
END;
$$;

-- Envanter oturum numarası
CREATE OR REPLACE FUNCTION public.generate_inventory_session_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO _seq
  FROM public.inventory_sessions
  WHERE session_number LIKE 'INV-' || _year || '-%';
  RETURN 'INV-' || _year || '-' || lpad(_seq::TEXT, 5, '0');
END;
$$;
```

### 4.2 STOK YÖNETİMİ

```sql
-- Stok miktarını hesapla
CREATE OR REPLACE FUNCTION public.get_stock_quantity(
  _part_id UUID, 
  _stock_location_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(quantity), 0)::INTEGER
  FROM public.stock_movements
  WHERE part_id = _part_id
    AND (_stock_location_id IS NULL OR stock_location_id = _stock_location_id)
$$;

-- Stok hareketi oluştur
CREATE OR REPLACE FUNCTION public.create_stock_movement(
  _movement_type stock_movement_type,
  _part_id UUID,
  _stock_location_id UUID,
  _quantity INTEGER,
  _unit_price NUMERIC DEFAULT NULL,
  _repair_ticket_id UUID DEFAULT NULL,
  _supplier_id UUID DEFAULT NULL,
  _purchase_order_id UUID DEFAULT NULL,
  _complaint_id UUID DEFAULT NULL,
  _transfer_movement_id UUID DEFAULT NULL,
  _inventory_session_id UUID DEFAULT NULL,
  _reason TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _requires_approval BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_stock INTEGER;
  _new_stock INTEGER;
  _movement_id UUID;
BEGIN
  SELECT get_stock_quantity(_part_id, _stock_location_id) INTO _current_stock;
  _new_stock := _current_stock + _quantity;
  
  -- Negatif stok kontrolü
  IF _new_stock < 0 AND _movement_type NOT IN ('WRITE_OFF', 'INVENTORY_MINUS') THEN
    RAISE EXCEPTION 'Yetersiz stok. Mevcut: %, İstenen: %', _current_stock, ABS(_quantity);
  END IF;
  
  -- Hareket oluştur
  INSERT INTO public.stock_movements (
    movement_type, part_id, stock_location_id, quantity, unit_price,
    repair_ticket_id, supplier_id, purchase_order_id, complaint_id,
    transfer_movement_id, inventory_session_id, reason, notes,
    requires_approval, stock_before, stock_after, created_by
  ) VALUES (
    _movement_type, _part_id, _stock_location_id, _quantity, _unit_price,
    _repair_ticket_id, _supplier_id, _purchase_order_id, _complaint_id,
    _transfer_movement_id, _inventory_session_id, _reason, _notes,
    _requires_approval, _current_stock, _new_stock, auth.uid()
  )
  RETURNING id INTO _movement_id;
  
  -- parts.stock_quantity güncelle
  UPDATE public.parts
  SET stock_quantity = _new_stock, updated_at = now()
  WHERE id = _part_id;
  
  -- Satın alma ise fiyatları güncelle
  IF _movement_type = 'PURCHASE' AND _unit_price IS NOT NULL THEN
    UPDATE public.parts
    SET last_purchase_price = _unit_price,
        avg_purchase_price = (
          SELECT COALESCE(AVG(unit_price), _unit_price)
          FROM public.stock_movements
          WHERE part_id = _part_id AND movement_type = 'PURCHASE' AND unit_price IS NOT NULL
        ),
        updated_at = now()
    WHERE id = _part_id;
  END IF;
  
  RETURN _movement_id;
END;
$$;

-- Stok transferi
CREATE OR REPLACE FUNCTION public.create_stock_transfer(
  _part_id UUID,
  _from_location_id UUID,
  _to_location_id UUID,
  _quantity INTEGER,
  _reason TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _out_movement_id UUID;
  _in_movement_id UUID;
  _current_stock INTEGER;
BEGIN
  SELECT get_stock_quantity(_part_id, _from_location_id) INTO _current_stock;
  
  IF _current_stock < _quantity THEN
    RAISE EXCEPTION 'Kaynak konumda yetersiz stok. Mevcut: %, İstenen: %', _current_stock, _quantity;
  END IF;
  
  -- Çıkış hareketi
  _out_movement_id := create_stock_movement(
    'TRANSFER_OUT', _part_id, _from_location_id, -_quantity,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, _reason, _notes, false
  );
  
  -- Giriş hareketi
  _in_movement_id := create_stock_movement(
    'TRANSFER_IN', _part_id, _to_location_id, _quantity,
    NULL, NULL, NULL, NULL, NULL, _out_movement_id, NULL, _reason, _notes, false
  );
  
  -- Çıkış hareketini giriş ile ilişkilendir
  UPDATE public.stock_movements
  SET transfer_movement_id = _in_movement_id
  WHERE id = _out_movement_id;
  
  RETURN _out_movement_id;
END;
$$;
```

### 4.3 PARÇA KULLANIMI

```sql
-- Parça kullanımı kaydet
CREATE OR REPLACE FUNCTION public.book_part_usage(
  _ticket_id UUID,
  _part_id UUID,
  _quantity INTEGER,
  _reason part_usage_reason,
  _note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _user_role TEXT;
  _usage_id UUID;
  _requires_approval BOOLEAN;
  _stock_location_id UUID;
  _movement_id UUID;
BEGIN
  _user_id := auth.uid();
  
  -- Rol belirle
  SELECT CASE
    WHEN public.has_role(_user_id, 'ADMIN') THEN 'ADMIN'
    WHEN public.has_role(_user_id, 'TECHNIKER') THEN 'TECHNIKER'
    WHEN public.has_role(_user_id, 'THEKE') THEN 'THEKE'
    ELSE NULL
  END INTO _user_role;
  
  IF _user_role IS NULL THEN
    RAISE EXCEPTION 'Parça kullanım yetkisi yok';
  END IF;
  
  -- THEKE için not zorunlu
  IF _user_role = 'THEKE' AND (_note IS NULL OR _note = '') THEN
    RAISE EXCEPTION 'THEKE rolü için neden belirtilmeli';
  END IF;
  
  -- SELBSTVERSCHULDEN için admin onayı gerekir (admin hariç)
  _requires_approval := (_reason = 'SELBSTVERSCHULDEN' AND _user_role != 'ADMIN');
  
  SELECT stock_location_id INTO _stock_location_id FROM public.parts WHERE id = _part_id;
  
  IF _stock_location_id IS NULL THEN
    RAISE EXCEPTION 'Parçanın stok konumu atanmamış';
  END IF;
  
  -- Kullanım kaydı oluştur
  INSERT INTO public.ticket_part_usage (
    repair_ticket_id, part_id, quantity, used_by_user_id, used_by_role,
    reason, note, requires_admin_approval, approval_status, reserved_at
  ) VALUES (
    _ticket_id, _part_id, _quantity, _user_id, _user_role,
    _reason, _note, _requires_approval,
    CASE WHEN _requires_approval THEN 'PENDING'::approval_status ELSE NULL END,
    CASE WHEN _requires_approval THEN now() ELSE NULL END
  )
  RETURNING id INTO _usage_id;
  
  -- Onay gerekmiyorsa stoktan düş
  IF NOT _requires_approval THEN
    _movement_id := public.create_stock_movement(
      'CONSUMPTION'::stock_movement_type,
      _part_id, _stock_location_id, -_quantity,
      NULL, _ticket_id, NULL, NULL, NULL, NULL, NULL,
      _reason::TEXT, _note, false
    );
    
    UPDATE public.ticket_part_usage 
    SET stock_movement_id = _movement_id
    WHERE id = _usage_id;
  END IF;
  
  RETURN _usage_id;
END;
$$;

-- Parça kullanımı onayla/reddet
CREATE OR REPLACE FUNCTION public.approve_part_usage(
  _usage_id UUID,
  _approved BOOLEAN,
  _note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _usage RECORD;
  _stock_location_id UUID;
  _movement_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Sadece ADMIN onay verebilir';
  END IF;
  
  SELECT * INTO _usage FROM public.ticket_part_usage WHERE id = _usage_id;
  
  IF _usage IS NULL THEN
    RAISE EXCEPTION 'Kullanım kaydı bulunamadı';
  END IF;
  
  IF _usage.approval_status != 'PENDING' THEN
    RAISE EXCEPTION 'Bu kayıt zaten işlenmiş';
  END IF;
  
  IF _approved THEN
    SELECT stock_location_id INTO _stock_location_id FROM public.parts WHERE id = _usage.part_id;
    
    _movement_id := public.create_stock_movement(
      'CONSUMPTION'::stock_movement_type,
      _usage.part_id, _stock_location_id, -_usage.quantity,
      NULL, _usage.repair_ticket_id, NULL, NULL, NULL, NULL, NULL,
      _usage.reason::TEXT, COALESCE(_note, _usage.note), false
    );
    
    UPDATE public.ticket_part_usage SET
      approval_status = 'APPROVED',
      approved_by = auth.uid(),
      approved_at = now(),
      approval_note = _note,
      stock_movement_id = _movement_id,
      updated_at = now()
    WHERE id = _usage_id;
  ELSE
    UPDATE public.ticket_part_usage SET
      approval_status = 'REJECTED',
      approved_by = auth.uid(),
      approved_at = now(),
      approval_note = _note,
      updated_at = now()
    WHERE id = _usage_id;
  END IF;
  
  RETURN _approved;
END;
$$;
```

### 4.4 YETKİ KONTROL FONKSİYONLARI

```sql
-- İzin kontrolü
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
  )
$$;

-- Kullanıcı izinlerini listele
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(permission_key TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT rp.permission_key
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = _user_id
$$;

-- Kullanıcı rolünü al
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Konum görüntüleme yetkisi
CREATE OR REPLACE FUNCTION public.can_view_location(_user_id UUID, _location_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN has_role(_user_id, 'ADMIN') THEN true
    WHEN has_permission(_user_id, 'VIEW_ALL_LOCATIONS') THEN true
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND can_view_all_locations = true) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.user_locations ul
      WHERE ul.user_id = _user_id AND ul.location_id = _location_id AND ul.can_view = true
    ) THEN true
    ELSE false
  END
$$;

-- Kullanıcı konumlarını listele
CREATE OR REPLACE FUNCTION public.get_user_locations(_user_id UUID)
RETURNS TABLE(location_id UUID, is_default BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ul.location_id, ul.is_default
  FROM public.user_locations ul
  WHERE ul.user_id = _user_id AND ul.can_view = true
$$;

-- B2B için placeholder müşteri oluştur/al
CREATE OR REPLACE FUNCTION public.get_or_create_b2b_placeholder_customer(partner_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_partner RECORD;
BEGIN
  SELECT placeholder_customer_id INTO v_customer_id
  FROM b2b_partners WHERE id = partner_id;
  
  IF v_customer_id IS NOT NULL THEN
    RETURN v_customer_id;
  END IF;
  
  SELECT * INTO v_partner FROM b2b_partners WHERE id = partner_id;
  
  IF v_partner IS NULL THEN
    RAISE EXCEPTION 'B2B Partner bulunamadı';
  END IF;
  
  INSERT INTO customers (first_name, last_name, phone, email, address)
  VALUES (
    v_partner.name, 'B2B Partner',
    COALESCE(v_partner.contact_phone, '0000000000'),
    v_partner.contact_email,
    CONCAT_WS(', ', v_partner.street, CONCAT(v_partner.zip, ' ', v_partner.city))
  )
  RETURNING id INTO v_customer_id;
  
  UPDATE b2b_partners SET placeholder_customer_id = v_customer_id WHERE id = partner_id;
  
  RETURN v_customer_id;
END;
$$;
```

---

## 5. TRIGGER'LAR

### 5.1 UPDATED_AT OTOMATİK GÜNCELLEME

```sql
-- Genel updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Alternatif isim (eski uyumluluk)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger'lar (her tablo için)
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_repair_tickets_updated_at
  BEFORE UPDATE ON public.repair_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_b2b_partners_updated_at
  BEFORE UPDATE ON public.b2b_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_b2b_customers_updated_at
  BEFORE UPDATE ON public.b2b_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_b2b_shipments_updated_at
  BEFORE UPDATE ON public.b2b_shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_kva_estimates_updated_at
  BEFORE UPDATE ON public.kva_estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.2 TAKİP KODU OLUŞTURMA

```sql
-- Bilet oluşturulduğunda takip kodu ata
CREATE OR REPLACE FUNCTION public.set_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  IF NEW.kva_token IS NULL OR NEW.kva_token = '' THEN
    LOOP
      new_code := generate_tracking_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM repair_tickets WHERE kva_token = new_code);
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION '10 denemede benzersiz takip kodu oluşturulamadı';
      END IF;
    END LOOP;
    NEW.kva_token := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_tracking_code
  BEFORE INSERT ON public.repair_tickets
  FOR EACH ROW EXECUTE FUNCTION set_tracking_code();
```

### 5.3 KVA DURUM SENKRONİZASYONU

```sql
-- KVA oluşturulduğunda/güncellendiğinde bilet durumunu güncelle
CREATE OR REPLACE FUNCTION public.kva_status_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Yeni KVA oluşturulduğunda
  IF TG_OP = 'INSERT' THEN
    UPDATE public.repair_tickets
    SET status = 'WARTET_AUF_TEIL_ODER_FREIGABE'::ticket_status,
        kva_required = true,
        updated_at = now()
    WHERE id = NEW.repair_ticket_id
      AND status NOT IN ('ABGEHOLT', 'STORNIERT');
    
    INSERT INTO public.status_history (repair_ticket_id, old_status, new_status, changed_by_user_id, note)
    SELECT id, status, 'WARTET_AUF_TEIL_ODER_FREIGABE'::ticket_status, NEW.created_by, 'KVA oluşturuldu'
    FROM public.repair_tickets
    WHERE id = NEW.repair_ticket_id;
  END IF;
  
  -- KVA onaylandığında
  IF TG_OP = 'UPDATE' AND NEW.status = 'FREIGEGEBEN' AND OLD.status != 'FREIGEGEBEN' THEN
    UPDATE public.repair_tickets
    SET status = 'FREIGEGEBEN'::ticket_status,
        kva_approved = true,
        kva_approved_at = now(),
        updated_at = now()
    WHERE id = NEW.repair_ticket_id
      AND status NOT IN ('ABGEHOLT', 'STORNIERT');
    
    INSERT INTO public.status_history (repair_ticket_id, old_status, new_status, changed_by_user_id, note)
    SELECT id, status, 'FREIGEGEBEN'::ticket_status, NEW.updated_by, 'KVA onaylandı'
    FROM public.repair_tickets
    WHERE id = NEW.repair_ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER kva_status_sync
  AFTER INSERT OR UPDATE ON public.kva_estimates
  FOR EACH ROW EXECUTE FUNCTION kva_status_trigger();
```

### 5.4 YENİ KULLANICI OLUŞTURMA

```sql
-- Yeni kullanıcı kaydında profil ve rol oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  SELECT (COUNT(*) = 0) INTO is_first_user FROM public.user_roles;
  
  -- Profil oluştur
  INSERT INTO public.profiles (id, name, email, is_active)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    NEW.email,
    is_first_user  -- İlk kullanıcı aktif, diğerleri onay bekler
  );
  
  -- Varsayılan rol ata
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'ADMIN');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'THEKE');
  END IF;
  
  RETURN NEW;
END;
$$;

-- auth.users tablosuna trigger (Supabase tarafından yönetilir)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 6. YARDIMCI TABLOLAR

### 6.1 ticket_number_sequence
Bilet numarası sırası (yıl bazlı).

```sql
CREATE TABLE public.ticket_number_sequence (
  year SMALLINT PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 100
);

-- Başlangıç verisi
INSERT INTO ticket_number_sequence (year, next_number) VALUES (25, 100);
```

---

## 7. STORAGE BUCKET'LAR

### 7.1 BUCKET TANIMLARI

```sql
-- Bilet fotoğrafları
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-photos',
  'ticket-photos',
  false,  -- Özel (RLS ile korunuyor)
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Giriş belgeleri
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intake_documents',
  'intake_documents',
  false,
  10485760,  -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);
```

### 7.2 STORAGE POLİTİKALARI

```sql
-- ticket-photos politikaları
CREATE POLICY "Employees can upload ticket photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-photos' 
  AND public.is_employee(auth.uid())
);

CREATE POLICY "Employees can view ticket photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-photos' 
  AND public.is_employee(auth.uid())
);

CREATE POLICY "B2B users can view own ticket photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-photos'
  AND public.is_b2b_user(auth.uid())
  -- Dosya yolu kontrolü için ek mantık gerekebilir
);

CREATE POLICY "Employees can delete ticket photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-photos' 
  AND public.is_employee(auth.uid())
);

-- intake_documents politikaları
CREATE POLICY "Employees can manage intake documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'intake_documents' 
  AND public.is_employee(auth.uid())
);
```

---

## EK: B2B İZOLASYON PRENSİPLERİ

### Mandant (Tenant) Ayrımı

1. **Her B2B tablosu `b2b_partner_id` içerir**
2. **RLS politikası**: `b2b_partner_id = get_b2b_partner_id(auth.uid())`
3. **Çalışanlar tüm B2B verilerini görebilir** (destek için)
4. **B2B kullanıcıları sadece kendi verilerini görür**

### Tipik Hatalar ve Çözümleri

| Hata | Neden | Çözüm |
|------|-------|-------|
| `new row violates row level security policy` | INSERT'te b2b_partner_id yanlış | get_b2b_partner_id(auth.uid()) kullan |
| Veri görünmüyor | SELECT politikası eksik | is_b2b_user kontrolü ekle |
| Silme başarısız | DELETE politikası eksik | B2B_INHABER rolü gerekli |

---

## SONUÇ

Bu dokümantasyon, Telya Reparatur-Management-System'in tam teknik referansını içerir. Sistem:

- **38 ana tablo** ile kapsamlı veri modeli
- **20 enum tipi** ile tip güvenliği
- **70+ RLS politikası** ile güvenlik
- **25+ RPC fonksiyonu** ile iş mantığı
- **15+ trigger** ile otomatik işlemler

içerir ve bağımsız olarak yeniden oluşturulabilir.

---

*Oluşturulma Tarihi: 2026-01-15*
*Versiyon: 2.0*
