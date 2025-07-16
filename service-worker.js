const BASE_URL = self.location.pathname.replace(/\/[^\/]*$/, "");

const STATIC_CACHE = "barberapp-static-v1";
const DYNAMIC_CACHE = "barberapp-dynamic-v1";

const STATIC_ASSETS = [
  `${BASE_URL}/`,
  `${BASE_URL}/index.html`,
  `${BASE_URL}/login.html`,
  `${BASE_URL}/register.html`,
  `${BASE_URL}/dashboard.html`,
  `${BASE_URL}/main.js`,
  `${BASE_URL}/dashboard.js`,
  `${BASE_URL}/manifest.json`,
  `${BASE_URL}/favicon.ico`,
  `${BASE_URL}/assets/barber.jpg`,
  `${BASE_URL}/assets/bg-dashboard.jpg`,
  `${BASE_URL}/assets/icons/facebook.svg`,
  `${BASE_URL}/assets/icons/google.svg`,
  `${BASE_URL}/assets/icons/apple.svg`,
  `${BASE_URL}/assets/icons/icon-96.png`,
  `${BASE_URL}/assets/icons/icon-36.png`,
  `${BASE_URL}/assets/icons/icon-192.png`
];


// ✅ تثبيت الـ Service Worker وتخزين الملفات الثابتة
self.addEventListener("install", (event) => {
  console.log("[SW] ✅ Installing Service Worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] ✅ Caching static assets...");
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.error("[SW] ❌ Failed to cache:", url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});


// ✅ تفعيل SW وحذف الكاش القديم
self.addEventListener("activate", (event) => {
  console.log("[SW] ⚙️ Activating Service Worker...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, DYNAMIC_CACHE].includes(key)) {
            console.log("[SW] 🧹 Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ✅ إدارة الطلبات (fetch): static ثم dynamic cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  // ملفات ديناميكية (صور، فيديوهات، ...etc)
  if (
    request.url.includes("/uploads/") ||
    request.url.endsWith(".jpg") ||
    request.url.endsWith(".jpeg") ||
    request.url.endsWith(".webp") ||
    request.url.endsWith(".mp4")
  ) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => caches.match(request));
      })
    );
    return;
  }

  // ملفات ثابتة
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request)
          .then((res) => {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, res.clone());
              return res;
            });
          })
          .catch(() => caches.match("/index.html"))
      );
    })
  );
});

// ✅ الإشعارات الفورية
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: "🔔 تنبيه موعد الحلاقة",
      body: "اقترب موعد حلاقتك! اضغط لتأكيد الحجز.",
      url: "/dashboard.html"
    };
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    data: { url: data.url || "/" }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ✅ عند الضغط على إشعار
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// ✅ دعم مزامنة الخلفية
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-haircut-reminder") {
    event.waitUntil(sendHaircutReminderToServer());
  }
});

async function sendHaircutReminderToServer() {
  try {
    const response = await fetch("/api/reminder", {
      method: "POST",
      body: JSON.stringify({ reminder: true }),
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Sync failed");
    console.log("[SW] ✅ Reminder sent");
  } catch (err) {
    console.warn("[SW] ❌ Reminder failed", err);
  }
}

// ✅ تحديث يدوي للسيرفس ووركر
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
