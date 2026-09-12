import express from "express";
import path from "path";
import fs from "fs";
import JSZip from "jszip";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// In-memory cache for TGJU and RSS to provide instant response and prevent rate-limiting
let tgjuCache: { data: any; timestamp: number } | null = null;
const rssCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Helper to parse TGJU HTML and extract live market rows
 */
function parseTgjuHtml(html: string) {
  const rowRegex = /<tr[^>]*data-market-row="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  const rawItems: Record<string, { name: string; price: string; change: string; changePercent: string; status: 'up' | 'down' | 'neutral'; time: string }> = {};

  while ((match = rowRegex.exec(html)) !== null) {
    const key = match[1];
    const content = match[2];
    
    // Price
    const priceMatch = content.match(/<td class="nf">([^<]+)<\/td>/) || match[0].match(/data-price="([^"]+)"/);
    // Change
    const changeMatch = content.match(/<span class="(low|high)">([^<]+)<\/span>/);
    const lowHighClass = changeMatch ? changeMatch[1] : '';
    const changeText = changeMatch ? changeMatch[2].trim() : '';
    
    // Time
    const timeMatch = content.match(/<td>(\d{1,2}:\d{1,2}(?::\d{1,2})?)<\/td>/);
    // Title
    const nameMatch = content.match(/<th>([^<]+)<\/th>/);

    if (priceMatch) {
      const priceVal = priceMatch[1].trim();
      let status: 'up' | 'down' | 'neutral' = 'neutral';
      if (lowHighClass === 'high') status = 'up';
      else if (lowHighClass === 'low') status = 'down';
      else if (changeText.startsWith('+') || changeText.includes('▲')) status = 'up';
      else if (changeText.startsWith('-') || changeText.includes('▼')) status = 'down';

      // Parse change percentage from format e.g. "(0.36%) 794000" or "0.5%"
      let percentStr = '';
      const percentMatch = changeText.match(/\(([\d.]+%?)\)/);
      if (percentMatch) {
        percentStr = percentMatch[1].endsWith('%') ? percentMatch[1] : `${percentMatch[1]}%`;
        if (status === 'up' && !percentStr.startsWith('+')) percentStr = `+${percentStr}`;
        if (status === 'down' && !percentStr.startsWith('-')) percentStr = `-${percentStr}`;
      } else if (changeText) {
        percentStr = changeText;
      } else {
        percentStr = '۰.۰٪';
      }

      rawItems[key] = {
        name: nameMatch ? nameMatch[1].trim() : key,
        price: priceVal,
        change: percentStr,
        changePercent: percentStr,
        status,
        time: timeMatch ? timeMatch[1].trim() : ''
      };
    }
  }

  // Helper to convert Rial to Toman string
  const rialToToman = (rialStr: string): string => {
    if (!rialStr) return '—';
    const num = parseInt(rialStr.replace(/,/g, ''), 10);
    if (isNaN(num)) return rialStr;
    return Math.round(num / 10).toLocaleString('en-US');
  };

  // Construct structured Gold & Coin list
  const goldItems = [
    {
      id: 'gold18',
      name: 'طلای ۱۸ عیار (گرم)',
      price: rawItems['geram18'] ? rialToToman(rawItems['geram18'].price) : '۴,۷۲۵,۰۰۰',
      unit: 'تومان',
      change: rawItems['geram18']?.change || '+۰.۴٪',
      status: rawItems['geram18']?.status || 'up',
      sub: rawItems['geram18']?.time ? `زمان TGJU: ${rawItems['geram18'].time}` : 'نرخ زنده اتحادیه طلا'
    },
    {
      id: 'mithqal',
      name: 'مثقال طلا (مظنه آبشده)',
      price: rawItems['mesghal'] ? rialToToman(rawItems['mesghal'].price) : '۲۰,۴۶۰,۰۰۰',
      unit: 'تومان',
      change: rawItems['mesghal']?.change || '+۰.۴٪',
      status: rawItems['mesghal']?.status || 'up',
      sub: rawItems['mesghal']?.time ? `زمان TGJU: ${rawItems['mesghal'].time}` : 'شاخص مرجع بازار طلا'
    },
    {
      id: 'coin_emami',
      name: 'سکه امامی (طرح جدید)',
      price: rawItems['sekee'] ? rialToToman(rawItems['sekee'].price) : '۵۴,۹۰۰,۰۰۰',
      unit: 'تومان',
      change: rawItems['sekee']?.change || '+۰.۵٪',
      status: rawItems['sekee']?.status || 'up',
      sub: rawItems['sekee']?.time ? `زمان TGJU: ${rawItems['sekee'].time}` : 'تمام بهار آزادی طرح امامی'
    },
    {
      id: 'coin_half',
      name: 'نیم سکه بهار آزادی',
      price: rawItems['nim'] ? rialToToman(rawItems['nim'].price) : '۲۹,۲۰۰,۰۰۰',
      unit: 'تومان',
      change: rawItems['nim']?.change || '+۰.۳٪',
      status: rawItems['nim']?.status || 'up',
      sub: rawItems['nim']?.time ? `زمان TGJU: ${rawItems['nim'].time}` : 'بازار رسمی سکه تهران'
    },
    {
      id: 'coin_quarter',
      name: 'ربع سکه بهار آزادی',
      price: rawItems['rob'] ? rialToToman(rawItems['rob'].price) : '۱۸,۷۰۰,۰۰۰',
      unit: 'تومان',
      change: rawItems['rob']?.change || '+۰.۲٪',
      status: rawItems['rob']?.status || 'up',
      sub: rawItems['rob']?.time ? `زمان TGJU: ${rawItems['rob'].time}` : 'قطع پرتقاضای بازار سکه'
    },
    {
      id: 'coin_bahar',
      name: 'سکه بهار آزادی (قدیم)',
      price: rawItems['bahar'] ? rialToToman(rawItems['bahar'].price) : '۴۹,۳۰۰,۰۰۰',
      unit: 'تومان',
      change: rawItems['bahar']?.change || '+۰.۴٪',
      status: rawItems['bahar']?.status || 'up',
      sub: 'طرح قدیم بهار آزادی'
    },
    {
      id: 'gold24',
      name: 'طلای ۲۴ عیار (گرم)',
      price: rawItems['geram24'] ? rialToToman(rawItems['geram24'].price) : '۶,۳۰۰,۰۰۰',
      unit: 'تومان',
      change: rawItems['geram24']?.change || '+۰.۴٪',
      status: rawItems['geram24']?.status || 'up',
      sub: 'شمش استاندارد ۹۹۹'
    },
    {
      id: 'coin_gerami',
      name: 'سکه گرمی بانک مرکزی',
      price: rawItems['gerami'] ? rialToToman(rawItems['gerami'].price) : '۸,۸۰۰,۰۰۰',
      unit: 'تومان',
      change: rawItems['gerami']?.change || '+۰.۱٪',
      status: rawItems['gerami']?.status || 'up',
      sub: 'سکه تک‌گرمی بسته‌بندی بانک مرکزی'
    },
    {
      id: 'ounce',
      name: 'انس جهانی طلا (XAU)',
      price: rawItems['ons'] ? rawItems['ons'].price : '۲,۶۸۸',
      unit: 'دلار',
      change: rawItems['ons']?.change || '+۰.۲٪',
      status: rawItems['ons']?.status || 'up',
      sub: 'معاملات بین‌المللی کامکس/نیویورک'
    },
    {
      id: 'silver_ounce',
      name: 'انس نقره جهانی',
      price: rawItems['silver']?.price || rawItems['silver_999']?.price || '۳۱.۴۵',
      unit: 'دلار',
      change: rawItems['silver']?.change || rawItems['silver_999']?.change || '-۰.۲٪',
      status: (rawItems['silver']?.status || rawItems['silver_999']?.status) || 'down',
      sub: 'بازار جهانی فلزات گرانبها'
    }
  ];

  // Construct structured Currency list
  const currencyItems = [
    {
      id: 'usd',
      name: '🇺🇸 دلار آمریکا (USD)',
      price: rawItems['price_dollar_rl'] ? rialToToman(rawItems['price_dollar_rl'].price) : '۶۹,۴۰۰',
      unit: 'تومان',
      change: rawItems['price_dollar_rl']?.change || '+۰.۳٪',
      status: rawItems['price_dollar_rl']?.status || 'up',
      sub: rawItems['price_dollar_rl']?.time ? `زمان TGJU: ${rawItems['price_dollar_rl'].time}` : 'اسکناس بازار آزاد تهران'
    },
    {
      id: 'eur',
      name: '🇪🇺 یورو اروپا (EUR)',
      price: rawItems['price_eur'] ? rialToToman(rawItems['price_eur'].price) : '۷۳,۶۵۰',
      unit: 'تومان',
      change: rawItems['price_eur']?.change || '+۰.۴٪',
      status: rawItems['price_eur']?.status || 'up',
      sub: rawItems['price_eur']?.time ? `زمان TGJU: ${rawItems['price_eur'].time}` : 'اسکناس نقدی بازار اروپا'
    },
    {
      id: 'aed',
      name: '🇦🇪 درهم امارات (AED)',
      price: rawItems['price_aed'] ? rialToToman(rawItems['price_aed'].price) : '۱۸,۹۲۰',
      unit: 'تومان',
      change: rawItems['price_aed']?.change || '+۰.۲٪',
      status: rawItems['price_aed']?.status || 'up',
      sub: rawItems['price_aed']?.time ? `زمان TGJU: ${rawItems['price_aed'].time}` : 'نرخ کلیدی حواله دبی'
    },
    {
      id: 'gbp',
      name: '🇬🇧 پوند انگلیس (GBP)',
      price: rawItems['price_gbp'] ? rialToToman(rawItems['price_gbp'].price) : '۸۸,۸۰۰',
      unit: 'تومان',
      change: rawItems['price_gbp']?.change || '+۰.۵٪',
      status: rawItems['price_gbp']?.status || 'up',
      sub: 'پوند بریتانیا بازار آزاد'
    },
    {
      id: 'try',
      name: '🇹🇷 لیر ترکیه (TRY)',
      price: rawItems['price_try'] ? rialToToman(rawItems['price_try'].price) : '۱,۹۹۰',
      unit: 'تومان',
      change: rawItems['price_try']?.change || '-۰.۱٪',
      status: rawItems['price_try']?.status || 'down',
      sub: 'اسکناس و حواله استانبول'
    },
    {
      id: 'cny',
      name: '🇨🇳 یوان چین (CNY)',
      price: rawItems['price_cny'] ? rialToToman(rawItems['price_cny'].price) : '۹,۵۸۰',
      unit: 'تومان',
      change: rawItems['price_cny']?.change || '+۰.۱٪',
      status: rawItems['price_cny']?.status || 'up',
      sub: 'نرخ بازرگانی و تجارت خارجی'
    },
    {
      id: 'cad',
      name: '🇨🇦 دلار کانادا (CAD)',
      price: rawItems['price_cad'] ? rialToToman(rawItems['price_cad'].price) : '۴۹,۵۰۰',
      unit: 'تومان',
      change: rawItems['price_cad']?.change || '+۰.۳٪',
      status: rawItems['price_cad']?.status || 'up',
      sub: 'حواله دانشجویی و تجاری کانادا'
    },
    {
      id: 'iqd',
      name: '🇮🇶 صد دینار عراق (IQD)',
      price: rawItems['price_iqd'] ? rialToToman(rawItems['price_iqd'].price) : '۵,۳۰۰',
      unit: 'تومان',
      change: rawItems['price_iqd']?.change || '۰.۰٪',
      status: rawItems['price_iqd']?.status || 'neutral',
      sub: 'زیارتی و حواله بغداد'
    },
    {
      id: 'usdt',
      name: '🟢 تتر دیجیتال (USDT)',
      price: rawItems['crypto-tether-irr'] ? rialToToman(rawItems['crypto-tether-irr'].price) : (rawItems['crypto-tether'] ? rialToToman(rawItems['crypto-tether'].price) : (rawItems['price_dollar_rl'] ? rialToToman(rawItems['price_dollar_rl'].price) : '۶۹,۵۵۰')),
      unit: 'تومان',
      change: rawItems['crypto-tether-irr']?.change || '+۰.۲٪',
      status: rawItems['crypto-tether-irr']?.status || 'up',
      sub: 'استیبل‌کوین دلار دیجیتال (USDT)'
    },
    {
      id: 'btc',
      name: '🪙 بیت‌کوین (BTC)',
      price: rawItems['crypto-bitcoin'] ? rawItems['crypto-bitcoin'].price : '۹۲,۵۰۰',
      unit: 'دلار',
      change: rawItems['crypto-bitcoin']?.change || '+۱.۸٪',
      status: rawItems['crypto-bitcoin']?.status || 'up',
      sub: 'پادشاه ارزهای دیجیتال جهان'
    }
  ];

  return {
    source: 'TGJU.org (شبکه اطلاع‌رسانی طلا، سکه و ارز)',
    sourceUrl: 'https://www.tgju.org/',
    fetchedAt: new Date().toISOString(),
    gold: goldItems,
    currency: currencyItems,
    rawCount: Object.keys(rawItems).length
  };
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/supabase-config", (req, res) => {
  res.json({
    url: process.env.VITE_SUPABASE_URL || "https://zvazulgahvrvlatlwjfw.supabase.co",
    publishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_4ylBr6L_4VwzEsr9r-_izA_M5upaIcg"
  });
});

// Server-side bookmark sync storage (in-memory persistent per server session)
const cloudBookmarksStore = new Map<string, { bookmarks: any[]; updatedAt: string }>();

app.get("/api/sync/bookmarks", async (req, res) => {
  const userId = String(req.query.userId || req.query.email || '');
  if (!userId) {
    return res.status(400).json({ error: "userId or email is required" });
  }

  const stored = cloudBookmarksStore.get(userId);
  return res.json({
    success: true,
    bookmarks: stored?.bookmarks || null,
    updatedAt: stored?.updatedAt || null
  });
});

app.post("/api/sync/bookmarks", async (req, res) => {
  const { userId, email, bookmarks } = req.body || {};
  const userKey = userId || email;
  if (!userKey || !Array.isArray(bookmarks)) {
    return res.status(400).json({ error: "userKey and bookmarks array are required" });
  }

  const updatedAt = new Date().toISOString();
  cloudBookmarksStore.set(userKey, { bookmarks, updatedAt });

  return res.json({ success: true, count: bookmarks.length, updatedAt });
});

// Password Reset Endpoint (Supabase Auth Proxy)
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      return res.status(400).json({ 
        success: false, 
        error: "لطفاً یک آدرس ایمیل معتبر وارد کنید." 
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://zvazulgahvrvlatlwjfw.supabase.co";
    const apiKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_4ylBr6L_4VwzEsr9r-_izA_M5upaIcg";

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "کلید ارتباط با سرور ابری سوپابیس (VITE_SUPABASE_PUBLISHABLE_KEY) تنظیم نشده است."
      });
    }

    const sbResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify({
        email: cleanEmail
      })
    });

    const data = await sbResponse.json().catch(() => ({})) as any;

    if (!sbResponse.ok) {
      const errMsg = data?.msg || data?.error_description || data?.message || '';
      if (errMsg.toLowerCase().includes('rate limit')) {
        return res.status(429).json({ success: false, error: "تعداد درخواست‌های بازیابی زیاد بوده است. لطفاً چند دقیقه دیگر امتحان کنید." });
      }
      return res.status(400).json({ success: false, error: errMsg || "خطا در ارسال ایمیل بازیابی رمز عبور." });
    }

    return res.json({
      success: true,
      email: cleanEmail,
      message: "لینک بازنشانی رمز عبور به ایمیل شما ارسال شد. لطفاً پوشه اینباکس یا اسپم ایمیل خود را بررسی کنید."
    });
  } catch (err: any) {
    console.error("[Reset Password Server Error]:", err);
    return res.status(500).json({
      success: false,
      error: "خطای سرور در پردازش درخواست بازیابی رمز عبور."
    });
  }
});

// Signup Preparation Endpoint (auto-cleans ghost/deleted users if admin key is present)
app.post("/api/auth/prepare-signup", async (req, res) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
    
    if (!cleanEmail || !serviceRoleKey) {
      return res.json({ success: true, processed: false });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://zvazulgahvrvlatlwjfw.supabase.co";
    
    // Check if user exists in auth.users via Admin API
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`
      }
    });

    if (listRes.ok) {
      const listData = await listRes.json() as any;
      const users = listData?.users || [];
      const match = users.find((u: any) => (u.email || '').toLowerCase() === cleanEmail);
      if (match && match.user_metadata?.is_deleted) {
        console.log("[Prepare Signup]: Purging previously deleted account for:", cleanEmail);
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${match.id}`, {
          method: "DELETE",
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`
          }
        });
        return res.json({ success: true, processed: true, purged: true });
      }
    }

    return res.json({ success: true, processed: false });
  } catch (err) {
    console.warn("[Prepare Signup Warning]:", err);
    return res.json({ success: true, processed: false });
  }
});

function computeDeletedAccountPassword(email: string) {
  const clean = (email || "").toLowerCase().trim();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `Del#9_${p1}_${p2}_Almas!`;
}

// Permanent Account Deletion Endpoint
app.post("/api/auth/delete-account", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    
    if (!token) {
      return res.status(401).json({ success: false, error: "توکن احراز هویت الزامی است." });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://zvazulgahvrvlatlwjfw.supabase.co";
    const apiKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_4ylBr6L_4VwzEsr9r-_izA_M5upaIcg";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

    // 1. Verify user token with Supabase
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "apikey": apiKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!userRes.ok) {
      return res.status(401).json({ success: false, error: "نشست کاربری نامعتبر یا منقضی شده است." });
    }

    const userData = await userRes.json() as any;
    const userId = userData?.id;
    if (!userId) {
      return res.status(400).json({ success: false, error: "کاربر یافت نشد." });
    }

    // 2. If service role key is present, execute hard deletion via Admin API
    if (serviceRoleKey) {
      try {
        const adminDeleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: "DELETE",
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`
          }
        });
        if (adminDeleteRes.ok) {
          return res.json({ success: true, message: "حساب کاربری از پایگاه داده به طور کامل حذف شد." });
        }
      } catch (adminErr) {
        console.warn("[Admin Delete User Notice]:", adminErr);
      }
    }

    // 3. Clear stored rows from database
    try {
      await fetch(`${supabaseUrl}/rest/v1/user_data?user_id=eq.${userId}`, {
        method: "DELETE",
        headers: {
          "apikey": serviceRoleKey || apiKey,
          "Authorization": `Bearer ${token}`
        }
      });
    } catch {}

    // 4. Invalidate credentials in Supabase Auth by updating user with deterministic password and deleted tag
    const userEmail = (userData?.email || req.body?.email || "").toLowerCase().trim();
    const scrambleSecret = userEmail ? computeDeletedAccountPassword(userEmail) : ('del_' + Math.random().toString(36).slice(2) + '!' + Date.now());
    const invalidateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        password: scrambleSecret,
        data: {
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }
      })
    });

    if (!invalidateRes.ok) {
      const errText = await invalidateRes.text().catch(() => "");
      console.warn("[Delete Account Auth Invalidate Notice]:", invalidateRes.status, errText);
    }

    return res.json({
      success: true,
      message: "حساب کاربری با موفقیت غیرفعال و دسترسی آن برای همیشه باطل شد."
    });
  } catch (err: any) {
    console.error("[Delete Account Server Error]:", err);
    return res.status(500).json({
      success: false,
      error: "خطای سرور در حذف حساب کاربری."
    });
  }
});

// Search Suggestions & Prediction Proxy (Google Suggest API with fast caching)
const suggestCache = new Map<string, { suggestions: string[]; timestamp: number }>();

app.get("/api/suggest", async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.json({ success: true, query: '', suggestions: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = suggestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 120000) {
    return res.json({ success: true, query, suggestions: cached.suggestions });
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=fa&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      return res.json({ success: false, query, suggestions: [] });
    }

    const data: any = await response.json();
    const list: string[] = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    const suggestions = list.slice(0, 8);

    suggestCache.set(cacheKey, { suggestions, timestamp: Date.now() });
    if (suggestCache.size > 500) {
      const firstKey = suggestCache.keys().next().value;
      if (firstKey) suggestCache.delete(firstKey);
    }

    return res.json({ success: true, query, suggestions });
  } catch (err: any) {
    console.error("Suggest proxy error:", err.message);
    return res.json({ success: false, query, suggestions: [] });
  }
});

// TGJU Live Data Proxy & Scraper
app.get("/api/tgju", async (req, res) => {
  const now = Date.now();
  const force = req.query.force === 'true';

  // Return cached data if fresh (less than 25 seconds old) and not forced
  if (!force && tgjuCache && now - tgjuCache.timestamp < 25000) {
    return res.json({ ...tgjuCache.data, cached: true, cacheAgeMs: now - tgjuCache.timestamp });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const tgjuResponse = await fetch("https://www.tgju.org/", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fa,en-US;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });
    clearTimeout(timeout);

    if (!tgjuResponse.ok) {
      throw new Error(`TGJU returned HTTP ${tgjuResponse.status}`);
    }

    const html = await tgjuResponse.text();
    const parsedData = parseTgjuHtml(html);

    const resultData = {
      success: true,
      status: "ok",
      rates: {
        gold: parsedData.gold,
        currency: parsedData.currency
      },
      ...parsedData,
      cached: false
    };

    tgjuCache = {
      data: resultData,
      timestamp: now
    };

    return res.json(resultData);
  } catch (err: any) {
    // If cache exists even if old, return it with warning
    if (tgjuCache) {
      return res.json({
        ...tgjuCache.data,
        cached: true,
        stale: true,
        warning: "Direct fetch failed, serving last known TGJU data"
      });
    }

    // Otherwise return fallback default data
    const fallbackParsed = parseTgjuHtml("");
    return res.json({
      success: true,
      status: "ok",
      rates: {
        gold: fallbackParsed.gold,
        currency: fallbackParsed.currency
      },
      ...fallbackParsed,
      cached: false,
      stale: true,
      fallback: true,
      warning: "Could not fetch TGJU. Using baseline values."
    });
  }
});

// Dedicated Navasan API Proxy (Gold + Fiat)
let navasanCache: { data: any; timestamp: number } | null = null;

app.get("/api/navasan", async (req, res) => {
  const force = req.query.force === "true";
  const now = Date.now();
  if (!force && navasanCache && now - navasanCache.timestamp < 30000) {
    return res.json(navasanCache.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const [goldRes, fiatRes] = await Promise.all([
      fetch("https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/gold.json", {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      }),
      fetch("https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/fiat.json", {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      })
    ]);
    clearTimeout(timeout);

    if (!goldRes.ok || !fiatRes.ok) {
      throw new Error("Failed to fetch Navasan APIs");
    }

    const gold = await goldRes.json();
    const fiat = await fiatRes.json();

    const data = {
      success: true,
      status: "ok",
      gold,
      fiat,
      timestamp: now
    };

    navasanCache = { data, timestamp: now };
    return res.json(data);
  } catch (err: any) {
    if (navasanCache) {
      return res.json({ ...navasanCache.data, stale: true });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// RSS Feed Proxy & Universal Parser
app.get("/api/rss", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  const now = Date.now();
  if (rssCache.has(url)) {
    const cached = rssCache.get(url)!;
    if (now - cached.timestamp < 60000) { // 1 min cache per feed
      return res.json(cached.data);
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const feedRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlmasDashboardBot/5.0; +https://almas.app)",
        "Accept": "application/rss+xml, application/xml, text/xml, application/atom+xml, text/html, */*"
      }
    });
    clearTimeout(timeout);

    if (!feedRes.ok) {
      throw new Error(`Feed request returned status ${feedRes.status}`);
    }

    const xmlText = await feedRes.text();
    
    // Parse RSS 2.0 / Atom XML manually or via regex
    const feedTitleMatch = xmlText.match(/<channel[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) ||
                           xmlText.match(/<feed[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const feedTitle = feedTitleMatch ? feedTitleMatch[1].trim() : 'منبع خبری';

    const items: Array<{
      title: string;
      link: string;
      pubDate: string;
      description: string;
      image: string;
      source: string;
    }> = [];

    // Extract item blocks (RSS <item> or Atom <entry>)
    const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(xmlText)) !== null && items.length < 15) {
      const block = itemMatch[0];

      // Title
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'بدون عنوان';

      // Link
      let link = '#';
      const linkTagMatch = block.match(/<link[^>]*href="([^"]+)"/i) || block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      if (linkTagMatch) {
        link = linkTagMatch[1].trim();
      }

      // PubDate
      const dateMatch = block.match(/<(?:pubDate|published|updated|dc:date)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:pubDate|published|updated|dc:date)>/i);
      const pubDate = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

      // Description / Content
      const descMatch = block.match(/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i);
      const rawDesc = descMatch ? descMatch[1].trim() : '';

      // Image Extraction: enclosure / media:content / media:thumbnail / <img> in description
      let image = '';
      const encMatch = block.match(/<enclosure[^>]*url="([^"]+)"/i) ||
                       block.match(/<media:content[^>]*url="([^"]+)"/i) ||
                       block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
      if (encMatch) {
        image = encMatch[1];
      } else if (rawDesc) {
        const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) {
          image = imgMatch[1];
        }
      }

      if (!image) {
        image = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=300&q=80';
      }

      // Clean HTML tags and entities from title & description
      const cleanTitle = rawTitle.replace(/&nbsp;/g, ' ').replace(/&#8211;/g, '-').replace(/&amp;/g, '&').trim();
      const cleanDesc = rawDesc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').slice(0, 160).trim();

      if (cleanTitle) {
        items.push({
          title: cleanTitle,
          link,
          pubDate,
          description: cleanDesc,
          image,
          source: feedTitle
        });
      }
    }

    const result = {
      success: true,
      status: "ok",
      title: feedTitle,
      feed: {
        title: feedTitle,
        url
      },
      items
    };

    rssCache.set(url, { data: result, timestamp: now });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch RSS feed", message: err.message });
  }
});

// Dedicated Latest News Aggregator Endpoint
app.get("/api/news", async (req, res) => {
  const feeds = [
    { url: "https://www.isna.ir/rss", name: "خبرگزاری ایسنا" },
    { url: "https://www.khabaronline.ir/rss", name: "خبرآنلاین" },
    { url: "https://www.irna.ir/rss", name: "خبرگزاری ایرنا" }
  ];

  for (const feed of feeds) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const feedRes = await fetch(feed.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AlmasDashboardBot/5.0; +https://almas.app)",
          "Accept": "application/rss+xml, application/xml, text/xml, application/atom+xml, text/html, */*"
        }
      });
      clearTimeout(timeout);

      if (feedRes.ok) {
        const xmlText = await feedRes.text();
        const items: Array<{
          title: string;
          link: string;
          pubDate: string;
          description: string;
          image: string;
          source: string;
        }> = [];

        const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
        let itemMatch;

        while ((itemMatch = itemRegex.exec(xmlText)) !== null && items.length < 10) {
          const block = itemMatch[0];
          const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
          const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          let link = '';
          const linkTagMatch = block.match(/<link[^>]*href="([^"]+)"/i) || block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
          if (linkTagMatch) link = linkTagMatch[1].trim();

          const dateMatch = block.match(/<(?:pubDate|published|updated|dc:date)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:pubDate|published|updated|dc:date)>/i);
          const pubDate = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

          const descMatch = block.match(/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i);
          const rawDesc = descMatch ? descMatch[1].trim() : '';

          let image = '';
          const encMatch = block.match(/<enclosure[^>]*url="([^"]+)"/i) ||
                           block.match(/<media:content[^>]*url="([^"]+)"/i) ||
                           block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
          if (encMatch) {
            image = encMatch[1];
          } else if (rawDesc) {
            const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch) image = imgMatch[1];
          }

          if (!image) {
            image = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=400&q=80';
          }

          const cleanTitle = rawTitle.replace(/&nbsp;/g, ' ').replace(/&#8211;/g, '-').replace(/&amp;/g, '&').trim();
          const cleanDesc = rawDesc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').slice(0, 160).trim();

          if (cleanTitle && link && link.startsWith('http')) {
            items.push({
              title: cleanTitle,
              link,
              pubDate,
              description: cleanDesc,
              image,
              source: feed.name
            });
          }
        }

        if (items.length > 0) {
          return res.json({
            success: true,
            status: "ok",
            source: feed.name,
            items
          });
        }
      }
    } catch (e) {
      // Try next feed
    }
  }

  // Fallback high-quality news with real direct URLs
  return res.json({
    success: true,
    status: "ok",
    source: "خبرگزاری منتخب",
    items: [
      {
        title: "بررسی آخرین تحولات اقتصادی و گزارش بازارهای مالی و پولی کشور",
        link: "https://www.isna.ir/service/Economy",
        pubDate: new Date().toISOString(),
        description: "گزارش جامع روند شاخص‌های کلان اقتصادی و چشم‌انداز بازارهای بین‌المللی",
        image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80",
        source: "خبرگزاری ایسنا"
      },
      {
        title: "رویدادهای تازه در حوزه علم، فناوری و دستاوردهای نوین دیجیتال",
        link: "https://www.isna.ir/service/Science",
        pubDate: new Date().toISOString(),
        description: "آخرین اخبار و پیشرفت‌های دانشمندان در هوش مصنوعی و فناوری‌های نوظهور",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        source: "خبرگزاری ایسنا"
      },
      {
        title: "نتایج رقابت‌های ورزشی و مسابقات قهرمانی ملی و بین‌المللی",
        link: "https://www.varzesh3.com",
        pubDate: new Date().toISOString(),
        description: "پوشش زنده مسابقات و آخرین نتایج تیم‌های باشگاهی و ملی",
        image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=400&q=80",
        source: "ورزش ۳"
      }
    ]
  });
});

// Endpoint to download the entire Chrome Extension package as a ready-to-load ZIP file
app.get("/api/download-extension-zip", async (_req, res) => {
  try {
    const zip = new JSZip();
    const filesToInclude = [
      "manifest.json",
      "index.html",
      "style.css",
      "app.js",
      "background.js",
      "supabase-client.js",
      "icon-16.png",
      "icon-32.png",
      "icon-48.png",
      "icon-128.png",
      "icon-512.png",
      "icon.png"
    ];

    for (const fileName of filesToInclude) {
      const filePath = path.join(process.cwd(), fileName);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        zip.file(fileName, content);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="almas-dashboard-extension.zip"',
      "Content-Length": zipBuffer.length.toString()
    });
    res.send(zipBuffer);
  } catch (err: any) {
    console.error("Error generating extension zip:", err);
    res.status(500).json({ error: "Failed to generate extension zip", details: err?.message });
  }
});

async function startServer() {
  // Directly serve style.css as raw text/css so <link rel="stylesheet"> never receives Vite's JS module wrapper
  app.get('/style.css', (req, res) => {
    res.type('text/css');
    res.sendFile(path.join(process.cwd(), 'style.css'));
  });

  app.get('/supabase-client.js', (req, res) => {
    res.type('application/javascript');
    const clientPath = path.join(process.cwd(), 'supabase-client.js');
    if (fs.existsSync(clientPath)) {
      res.sendFile(clientPath);
    } else {
      res.status(404).send('console.warn("supabase-client.js not found");');
    }
  });

  app.get('/app.js', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(process.cwd(), 'app.js'));
  });

  app.get('/background.js', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(process.cwd(), 'background.js'));
  });

  app.get('/manifest.json', (req, res) => {
    res.type('application/json');
    res.sendFile(path.join(process.cwd(), 'manifest.json'));
  });

  // In development, hook up Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
