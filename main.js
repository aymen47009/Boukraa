// main.js – BarberApp Logic (Firebase v9.22.2 with namespaced SDK)

// ✅ الوضع الليلي حسب إعدادات النظام
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add('dark-mode');
}

// ✅ تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC4lRLZEIaHDfeoigFxvjqQhxbIkU9NUuE",
  authDomain: "hala9i.firebaseapp.com",
  projectId: "hala9i",
  storageBucket: "hala9i.appspot.com",
  messagingSenderId: "1068748204618",
  appId: "1:1068748204618:web:238df060c97d48a735d4b3",
  measurementId: "G-2Y45YBERGG"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ التحقق من حالة المستخدم
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("👤 مستخدم مسجل:", user.email);
    loadUserData(user.uid);
  } else {
    console.log("🚪 لا يوجد مستخدم حالياً");
  }
});

// ✅ تسجيل الدخول باستخدام البريد وكلمة المرور
function emailLogin(email, password) {
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch(err => alert("❌ فشل تسجيل الدخول: " + err.message));
}

// ✅ إنشاء حساب جديد
function registerNewUser(name, email, password) {
  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      return db.collection('users').doc(cred.user.uid).set({
        name,
        email,
        lastHaircut: null,
        points: 0
      });
    })
    .then(() => {
      alert("✅ تم إنشاء الحساب بنجاح");
      window.location.href = "dashboard.html";
    })
    .catch(err => alert("❌ فشل التسجيل: " + err.message));
}

// ✅ تسجيل الدخول بواسطة Google
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      const user = result.user;
      return db.collection("users").doc(user.uid).get().then(doc => {
        if (!doc.exists) {
          return db.collection("users").doc(user.uid).set({
            name: user.displayName || "مستخدم جديد",
            email: user.email,
            lastHaircut: null,
            points: 0
          });
        }
      });
    })
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch(err => alert("❌ فشل الدخول بواسطة Google: " + err.message));
}

// ✅ تسجيل الخروج
function logoutUser() {
  auth.signOut()
    .then(() => {
      window.location.href = "index.html";
    })
    .catch(err => alert("❌ خطأ في تسجيل الخروج: " + err.message));
}

// ✅ حفظ تاريخ الحلاقة
function saveHaircutDate(userId, date) {
  db.collection("users").doc(userId).update({
    lastHaircut: date
  }).then(() => {
    console.log("📅 تم حفظ تاريخ الحلاقة");
    scheduleNotification(date);
  }).catch(err => {
    console.error("❌ فشل حفظ التاريخ", err);
  });
}

// ✅ إضافة نقاط ولاء
function addLoyaltyPoints(userId, points = 5) {
  const ref = db.collection("users").doc(userId);
  ref.get().then(doc => {
    if (doc.exists) {
      const current = doc.data().points || 0;
      return ref.update({ points: current + points });
    }
  }).then(() => {
    console.log("⭐ تمت إضافة نقاط");
  }).catch(err => console.error("❌ فشل إضافة النقاط", err));
}

// ✅ إرسال إشعار بموعد الحلاقة القادم
function scheduleNotification(date) {
  const targetDate = new Date(date);
  const now = new Date();
  const delay = targetDate.getTime() - now.getTime();

  if (delay > 0 && Notification.permission === "granted") {
    setTimeout(() => {
      new Notification("💈 موعد الحلاقة!", {
        body: "لا تنسَ تأكيد الحجز أو الاتصال بالحلاق.",
        icon: "icons/icon-192.png"
      });
    }, delay);
  }
}

// ✅ طلب إذن الإشعارات
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log("🔔 تم تفعيل الإشعارات");
      }
    });
  }
}

// ✅ تحميل قائمة الأسعار
function fetchPriceList() {
  db.collection("prices").get()
    .then(snapshot => {
      const list = document.getElementById("price-list");
      if (!list) return;
      list.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const item = document.createElement("li");
        item.textContent = `${data.service} - ${data.price} دج`;
        list.appendChild(item);
      });
    })
    .catch(err => console.error("❌ فشل تحميل الأسعار", err));
}

// ✅ إرسال تقييم الخدمة
function submitRating(userId, rating, comment) {
  db.collection("ratings").add({
    userId,
    rating,
    comment,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("✅ تم إرسال تقييمك");
  }).catch(err => alert("❌ فشل إرسال التقييم: " + err.message));
}

// ✅ تحميل بيانات المستخدم
function loadUserData(userId) {
  db.collection("users").doc(userId).get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        document.getElementById("user-name")?.textContent = data.name;
        document.getElementById("user-points")?.textContent = data.points + " نقطة";
        document.getElementById("last-cut-date")?.textContent = data.lastHaircut || "غير متوفر";
      }
    }).catch(err => {
      console.error("❌ فشل تحميل بيانات المستخدم", err);
    });
}

// ✅ الدردشة: تحميل آخر 10 رسائل
function loadChatMessages() {
  db.collection("messages")
    .orderBy("timestamp", "desc")
    .limit(10)
    .onSnapshot(snapshot => {
      const chatBox = document.getElementById("chat-box");
      if (!chatBox) return;
      chatBox.innerHTML = "";
      snapshot.docs.reverse().forEach(doc => {
        const data = doc.data();
        const msg = document.createElement("p");
        msg.textContent = `${data.sender}: ${data.text}`;
        chatBox.appendChild(msg);
      });
    });
}

// ✅ إرسال رسالة جديدة
function sendMessage(sender, text) {
  db.collection("messages").add({
    sender,
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    console.log("💬 تم إرسال الرسالة");
  }).catch(err => console.error("❌ فشل الإرسال", err));
}

// ✅ حماية صفحة تتطلب تسجيل دخول
function protectPage() {
  auth.onAuthStateChanged(user => {
    if (!user) {
      alert("🔒 يجب تسجيل الدخول أولاً");
      window.location.href = "index.html";
    }
  });
}

// ✅ تنفيذ العمليات عند تحميل الصفحة
window.addEventListener("load", () => {
  requestNotificationPermission();
  fetchPriceList();
});
