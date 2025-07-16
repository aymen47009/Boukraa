const firebaseConfig = {
  apiKey: "AIzaSyC4lRLZEIaHDfeoigFxvjqQhxbIkU9NUuE",
  authDomain: "hala9i.firebaseapp.com",
  projectId: "hala9i",
  storageBucket: "hala9i.appspot.com",
  messagingSenderId: "1068748204618",
  appId: "1:1068748204618:web:238df060c97d48a735d4b3"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let countdownInterval;

auth.onAuthStateChanged(user => {
  if (user) {
    const uid = user.uid;
    db.collection("users").doc(uid).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        fillProfile(data, user.email);
        if (data.nextAppointment) {
          const date = new Date(data.nextAppointment);
          startCountdown(date);
        }
      } else {
        alert("🚫 لم يتم العثور على البيانات.");
      }
    });

    db.collection("media").orderBy("createdAt", "desc").limit(10).get().then(snapshot => {
      const wrapper = document.getElementById("carousel-wrapper");
      snapshot.forEach(doc => {
        const item = doc.data();
        const slide = document.createElement("div");
        slide.className = "swiper-slide";

        if (item.type === "image") {
          const img = document.createElement("img");
          img.src = item.url;
          slide.appendChild(img);
        } else if (item.type === "video") {
          const video = document.createElement("video");
          video.controls = true;
          video.innerHTML = `<source src="${item.url}" type="video/mp4">`;
          slide.appendChild(video);
        }

        wrapper.appendChild(slide);
      });

      new Swiper(".mySwiper", {
        slidesPerView: 1.2,
        spaceBetween: 20,
        loop: true,
        centeredSlides: true,
      });
    });

    db.collection("settings").doc("clientBg").get().then(doc => {
      if (doc.exists && doc.data().url) {
        document.body.style.backgroundImage = `url(${doc.data().url})`;
      }
    });

  } else {
    window.location.href = "login.html";
  }
});

function fillProfile(data, email) {
  document.getElementById("user-name").textContent = `مرحباً ${data.name || "..."}`;
  document.getElementById("user-phone").textContent = data.phone || "—";
  document.getElementById("profile-name").textContent = data.name || "—";
  document.getElementById("profile-phone").textContent = data.phone || "—";
  document.getElementById("profile-email").textContent = email || "—";
  document.getElementById("last-haircut").textContent = data.lastHaircut || "—";
  document.getElementById("points").textContent = data.points || "0";
  document.getElementById("next-appointment").textContent = formatDate(data.nextAppointment);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.toLocaleDateString("ar-DZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} الساعة ${date.getHours()}:00`;
}

function startCountdown(date) {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const now = new Date();
    const diff = date - now;
    if (diff <= 0) {
      document.querySelector(".countdown").textContent = "🔔 حان وقت الحلاقة!";
      clearInterval(countdownInterval);
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    document.getElementById("days").textContent = days.toString().padStart(2, "0");
    document.getElementById("hours").textContent = hours.toString().padStart(2, "0");
    document.getElementById("minutes").textContent = minutes.toString().padStart(2, "0");
    document.getElementById("seconds").textContent = seconds.toString().padStart(2, "0");
  }, 1000);
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = "login.html";
  });
}
