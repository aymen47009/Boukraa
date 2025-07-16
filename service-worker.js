const CACHE_NAME = "barberapp-v1.0.0";
const CACHE_URLS = [
  "/",
  "/index.html",
  "/login.html",
  "/register.html",
 // "/profile.html",
 // "/booking.html",
  //"/chat.html",
  "/main.js",
  //"/style.css",
  "/manifest.json",
  "/assets/barber.jpg",
  "/assets/icons/facebook.svg",
  "/assets/icons/google.svg",
  "/assets/icons/apple.svg",
  "/assets/icons/icon-36.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-96.png",
  /*"/icons/icon-128.png",
  "/icons/icon-144.png",
  "/icons/icon-192.png",
  "/icons/icon-384.png",
  "/icons/icon-512.png"*/
];

// ✅ التثبيت: تحميل الملفات وتخزينها
self.addEventListener("install", (event) => {
  console.log("[SW] ✅ Service Worker Installing...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] ✅ Caching essential assets...");
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ✅ التفعيل: حذف الكاش القديم
self.addEventListener("activate", (event) => {
  console.log("[SW] ⚙️ Activating new Service Worker...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] 🔄 Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ✅ الجلب: استراتيجية الشبكة أولا ثم الكاش
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((response) => {
          return response || caches.match("/offline.html");
        });
      })
  );
});

// ✅ إشعارات التنبيه عند اقتراب موعد الحلاقة
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: "🔔 تنبيه موعد الحلاقة",
      body: "لقد اقترب موعد حلاقتك! اضغط لتأكيد أو تغيير الوقت.",
      url: "/booking.html"
    };
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ✅ التعامل مع الضغط على الإشعار
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

// ✅ الاستماع لمزامنة الخلفية
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
    console.log("[SW] ✅ Reminder sent successfully");
  } catch (err) {
    console.warn("[SW] ❌ Reminder failed to sync", err);
  }
}

// ✅ تحديث يدوي عند إرسال رسالة من الصفحة
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});

// ✅ تخزين ملفات ديناميكية بشكل ذكي (مثال: صور زبائن)
const DYNAMIC_CACHE = "barberapp-dynamic-v1";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (
    request.url.includes("/uploads/") ||
    request.url.endsWith(".jpg") ||
    request.url.endsWith(".webp")
  ) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => {
            return caches.match(request);
          });
      })
    );
  }
});
