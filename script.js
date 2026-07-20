const canvas = document.querySelector("#stars");
const ctx = canvas.getContext("2d");
const playButtons = [...document.querySelectorAll("[data-play-music]")];
const playIcons = [...document.querySelectorAll("[data-play-icon]")];
const loveSong = document.querySelector("#loveSong");
const musicStatus = document.querySelector("[data-music-status]");
const seekBar = document.querySelector("[data-seek-bar]");
const playProgress = document.querySelector("[data-play-progress]");
const currentTime = document.querySelector("[data-current-time]");
const remainingTime = document.querySelector("[data-remaining-time]");
const restartMusic = document.querySelector("[data-restart-music]");
const backMusic = document.querySelector("[data-back-music]");
const forwardMusic = document.querySelector("[data-forward-music]");
const loopMusic = document.querySelector("[data-loop-music]");
const giftLoader = document.querySelector("[data-gift-loader]");
const presentOpening = document.querySelector("[data-present-opening]");
const openPresent = document.querySelector("[data-open-present]");
const startPresent = document.querySelector("[data-start-present]");
const heartBurst = document.querySelector("[data-heart-burst]");
const lyricMoment = document.querySelector("[data-lyric-moment]");
const lyricStars = document.querySelector("[data-lyric-stars]");
const lyricText = document.querySelector("[data-lyric-text]");
const openLetter = document.querySelector("[data-open-letter]");
const finalCounter = document.querySelector("[data-final-counter]");
const showInviteButton = document.querySelector("[data-show-invite]");
const inviteNote = document.querySelector("[data-invite-note]");
const acceptInviteButton = document.querySelector("[data-accept-invite]");
const stories = [...document.querySelectorAll(".story")];
const storiesRoot = document.querySelector("[data-stories]");
const storyProgress = document.querySelector("[data-story-progress]");
const START_DATE = new Date("2016-09-16T08:22:00");
const STORY_DURATION = 10000;
const LYRIC_MOMENT_TIME = 114;
const AUDIO_END_TIME = 162;
const WHATSAPP_INVITE_URL =
  "https://wa.me/5511948725039?text=Eu%20aceito%20o%20convite%20para%20o%20Restaurante%20Bosco%20em%2023%2F07%2F2026%20%C3%A0s%2019%3A00.";

let width = 0;
let height = 0;
let stars = [];
let storyIndex = 0;
let storyStartedAt = 0;
let storyFrame = 0;
let storyPausedAt = 0;
let holdStartedAt = 0;
let shouldIgnoreTap = false;
let storyProgressRunning = false;
let lyricMomentShown = false;
let lyricTypingTimer = 0;
let storyHoldWasPlaying = false;

function resizeStars() {
  const scale = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  stars = Array.from({ length: Math.min(150, Math.floor(width / 5)) }, createStar);
}

function createStar() {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.7 + 0.4,
    alpha: Math.random() * 0.5 + 0.25,
    speed: Math.random() * 0.18 + 0.04,
    pulse: Math.random() * Math.PI * 2,
  };
}

function drawStars() {
  ctx.clearRect(0, 0, width, height);
  for (const star of stars) {
    star.y += star.speed;
    star.pulse += 0.025;

    if (star.y > height + 8) {
      star.y = -8;
      star.x = Math.random() * width;
    }

    const glow = star.alpha + Math.sin(star.pulse) * 0.18;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244, 213, 141, ${glow})`;
    ctx.fill();
  }
  requestAnimationFrame(drawStars);
}

storyProgress.style.setProperty("--story-count", stories.length);
storyProgress.replaceChildren(...stories.map(() => document.createElement("span")));

function renderStoryProgress(activeFill) {
  [...storyProgress.children].forEach((bar, currentIndex) => {
    const fill = currentIndex < storyIndex ? 100 : currentIndex === storyIndex ? activeFill : 0;
    bar.style.setProperty("--fill", `${fill}%`);
  });
}

function renderStoryProgressInstant(activeFill) {
  storyProgress.classList.add("is-jumping");
  renderStoryProgress(activeFill);
  requestAnimationFrame(() => {
    storyProgress.classList.remove("is-jumping");
  });
}

function runStoryProgress(now = performance.now()) {
  if (!storyProgressRunning) return;

  const elapsed = now - storyStartedAt;
  const fill = Math.min(100, (elapsed / STORY_DURATION) * 100);
  renderStoryProgress(fill);

  if (fill >= 100 && storyIndex < stories.length - 1) {
    nextStory();
    return;
  }

  if (fill >= 100) return;

  storyFrame = requestAnimationFrame(runStoryProgress);
}

function startStoryProgress() {
  if (storyProgressRunning) return;

  storyProgressRunning = true;
  storyStartedAt = performance.now();
  cancelAnimationFrame(storyFrame);
  storyFrame = requestAnimationFrame(runStoryProgress);
}

function pauseStoryProgress() {
  if (!storyProgressRunning) return;
  if (storyPausedAt) return;

  storyPausedAt = performance.now();
  cancelAnimationFrame(storyFrame);
  document.body.classList.add("is-holding-story");
}

function resumeStoryProgress() {
  if (!storyProgressRunning) return;
  if (!storyPausedAt) return;

  storyStartedAt += performance.now() - storyPausedAt;
  storyPausedAt = 0;
  document.body.classList.remove("is-holding-story");
  storyFrame = requestAnimationFrame(runStoryProgress);
}

function showStory(index) {
  storyIndex = Math.max(0, Math.min(index, stories.length - 1));
  stories.forEach((story, currentIndex) => {
    story.classList.toggle("is-active", currentIndex === storyIndex);
  });

  cancelAnimationFrame(storyFrame);
  storyPausedAt = 0;
  holdStartedAt = 0;
  shouldIgnoreTap = false;
  document.body.classList.remove("is-holding-story");
  storyStartedAt = performance.now();
  renderStoryProgressInstant(0);
  if (storyProgressRunning) {
    storyFrame = requestAnimationFrame(runStoryProgress);
  }
  if (stories[storyIndex] === finalCounter && !finalCounter.classList.contains("is-invite-visible")) {
    requestAnimationFrame(pauseStoryProgress);
  }
}

function nextStory() {
  showStory(storyIndex + 1);
}

function prevStory() {
  showStory(storyIndex - 1);
}

function formatTime(value) {
  const total = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function syncPlayer() {
  const duration = Math.min(loveSong.duration || AUDIO_END_TIME, AUDIO_END_TIME);
  const current = Math.min(loveSong.currentTime || 0, duration);
  const progress = duration ? Math.min(100, (current / duration) * 100) : 0;

  playProgress.style.width = `${progress}%`;
  currentTime.textContent = formatTime(current);
  remainingTime.textContent = duration ? `-${formatTime(duration - current)}` : "-0:00";

  playIcons.forEach((button) => {
    button.setAttribute("aria-label", loveSong.paused ? "Tocar musica" : "Pausar musica");
    button.classList.toggle("is-playing", !loveSong.paused);
  });

  if (musicStatus) {
    musicStatus.textContent = "";
  }
}

function floatHearts(options = {}) {
  if (!heartBurst) return;

  const count = options.count || 36;
  const intense = options.intense || false;

  for (let index = 0; index < count; index += 1) {
    const heart = document.createElement("span");
    const drift = Math.round((Math.random() - 0.5) * (intense ? 280 : 170));
    const delay = Math.random() * (intense ? 0.95 : 0.65);
    const size = Math.random() * (intense ? 1.8 : 1.15) + (intense ? 1.45 : 1.15);
    const colors = ["#ff1f4f", "#e5163f", "#ff5f7e", "#d80f35", "#ff7a91"];

    heart.textContent = "\u2665";
    heart.style.left = `${intense ? 6 + Math.random() * 88 : 20 + Math.random() * 60}%`;
    heart.style.color = colors[Math.floor(Math.random() * colors.length)];
    heart.style.setProperty("--drift", `${drift}px`);
    heart.style.setProperty("--delay", `${delay}s`);
    heart.style.setProperty("--scale", size.toFixed(2));
    heart.style.setProperty("--rise", intense ? `${58 + Math.random() * 22}dvh` : "50dvh");
    heartBurst.appendChild(heart);

    heart.addEventListener("animationend", () => heart.remove(), { once: true });
  }
}

function floatFlowers(options = {}) {
  if (!heartBurst) return;

  const count = options.count || 64;
  const flowers = ["\u273f", "\u273d", "\u2740", "\u2665"];
  const colors = ["#f4d58d", "#ff9aae", "#fff3c4", "#e86f8a", "#f8c7d0"];

  for (let index = 0; index < count; index += 1) {
    const flower = document.createElement("span");
    const drift = Math.round((Math.random() - 0.5) * 320);
    const delay = Math.random() * 1.1;
    const size = Math.random() * 1.65 + 1.05;
    const spin = Math.round((Math.random() - 0.5) * 280);

    flower.classList.add("is-flower");
    flower.textContent = flowers[Math.floor(Math.random() * flowers.length)];
    flower.style.left = `${4 + Math.random() * 92}%`;
    flower.style.color = colors[Math.floor(Math.random() * colors.length)];
    flower.style.setProperty("--drift", `${drift}px`);
    flower.style.setProperty("--delay", `${delay}s`);
    flower.style.setProperty("--scale", size.toFixed(2));
    flower.style.setProperty("--rise", `${62 + Math.random() * 24}dvh`);
    flower.style.setProperty("--spin", `${spin}deg`);
    heartBurst.appendChild(flower);

    flower.addEventListener("animationend", () => flower.remove(), { once: true });
  }
}

function typeOpeningText() {
  const paragraphs = [...document.querySelectorAll(".present-opening__content p")];
  if (!paragraphs.length) return;

  const lines = paragraphs.map((paragraph) => {
    if (!paragraph.dataset.fullText) {
      paragraph.dataset.fullText = paragraph.textContent.trim();
    }
    paragraph.textContent = "";
    paragraph.classList.remove("is-current", "is-complete");
    return paragraph.dataset.fullText;
  });

  let paragraphIndex = 0;
  let charIndex = 0;

  function typeNextCharacter() {
    const paragraph = paragraphs[paragraphIndex];
    const text = lines[paragraphIndex];
    if (!paragraph || !text) return;

    paragraphs.forEach((item) => item.classList.remove("is-current"));
    paragraph.classList.add("is-current");
    paragraph.textContent = text.slice(0, charIndex + 1);
    charIndex += 1;

    if (charIndex < text.length) {
      window.setTimeout(typeNextCharacter, 34);
      return;
    }

    paragraph.classList.remove("is-current");
    paragraph.classList.add("is-complete");
    paragraphIndex += 1;
    charIndex = 0;

    if (paragraphIndex < paragraphs.length) {
      window.setTimeout(typeNextCharacter, 360);
    }
  }

  window.setTimeout(typeNextCharacter, 780);
}

function showLyricMoment() {
  if (!lyricMoment || !lyricStars || !lyricText) return;

  lyricMomentShown = true;
  lyricMoment.classList.remove("is-visible");
  lyricStars.replaceChildren();
  lyricText.textContent = "";
  window.clearInterval(lyricTypingTimer);

  for (let index = 0; index < 42; index += 1) {
    const star = document.createElement("span");
    const size = Math.random() * 0.9 + 0.55;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty("--delay", `${Math.random() * 0.8}s`);
    star.style.setProperty("--scale", size.toFixed(2));
    lyricStars.appendChild(star);
  }

  requestAnimationFrame(() => {
    lyricMoment.classList.add("is-visible");
  });

  const fullText = lyricText.dataset.fullText || "";
  let currentIndex = 0;
  lyricTypingTimer = window.setInterval(() => {
    lyricText.textContent = fullText.slice(0, currentIndex + 1);
    currentIndex += 1;

    if (currentIndex >= fullText.length) {
      window.clearInterval(lyricTypingTimer);
    }
  }, 42);

  window.setTimeout(() => {
    lyricMoment.classList.remove("is-visible");
    window.clearInterval(lyricTypingTimer);
  }, 5000);
}

function watchLyricMoment() {
  if (loveSong.currentTime < LYRIC_MOMENT_TIME - 2) {
    lyricMomentShown = false;
  }

  if (!lyricMomentShown && loveSong.currentTime >= LYRIC_MOMENT_TIME) {
    showLyricMoment();
  }
}

async function startMusic(options = {}) {
  const wasPaused = loveSong.paused;
  const showHearts = options.hearts !== false;

  try {
    if (loveSong.currentTime >= AUDIO_END_TIME) {
      loveSong.currentTime = 0;
    }
    await loveSong.play();
    document.body.classList.add("is-playing");
    if (wasPaused) {
      if (storyPausedAt) {
        resumeStoryProgress();
      } else {
        startStoryProgress();
      }
      if (showHearts) {
        floatHearts();
      }
    }
  } catch {
    document.body.classList.remove("is-playing");
    if (musicStatus) {
      musicStatus.textContent = "";
    }
  }
  syncPlayer();
}

function toggleMusic() {
  if (loveSong.paused) {
    startMusic();
    return;
  }

  loveSong.pause();
  document.body.classList.remove("is-playing");
  pauseStoryProgress();
  syncPlayer();
}

playButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMusic();
  });
});

if (openPresent && presentOpening) {
  openPresent.addEventListener("click", (event) => {
    event.stopPropagation();
    if (presentOpening.classList.contains("is-opened")) return;
    presentOpening.classList.add("is-opened");
    floatHearts({ count: 96, intense: true });
    typeOpeningText();
    window.setTimeout(() => startPresent?.focus(), 700);
    window.setTimeout(() => presentOpening.classList.add("is-gift-gone"), 1280);
  });
}

if (startPresent) {
  startPresent.addEventListener("click", (event) => {
    event.stopPropagation();
    document.body.classList.remove("has-present-opening");
    presentOpening?.classList.add("is-hidden");
    showStory(0);
    syncPlayer();
  });
}

if (openLetter) {
  openLetter.addEventListener("click", (event) => {
    event.stopPropagation();
    openLetter.closest(".letter-status")?.classList.add("is-letter-open");
    floatFlowers({ count: 90 });
  });
}

if (showInviteButton && finalCounter && inviteNote) {
  showInviteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    finalCounter.classList.add("is-invite-visible");
    inviteNote.scrollIntoView({ behavior: "smooth", block: "nearest" });
    resumeStoryProgress();
    floatFlowers({ count: 70 });
  });
}

if (acceptInviteButton) {
  acceptInviteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    window.location.href = WHATSAPP_INVITE_URL;
  });
}

seekBar.addEventListener("click", (event) => {
  event.stopPropagation();
  const duration = Math.min(loveSong.duration || AUDIO_END_TIME, AUDIO_END_TIME);
  if (!duration) return;

  const bounds = seekBar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  loveSong.currentTime = ratio * duration;
  syncPlayer();
});

restartMusic.addEventListener("click", (event) => {
  event.stopPropagation();
  loveSong.currentTime = 0;
  startMusic();
});

backMusic.addEventListener("click", (event) => {
  event.stopPropagation();
  loveSong.currentTime = Math.max(0, loveSong.currentTime - 10);
  syncPlayer();
});

forwardMusic.addEventListener("click", (event) => {
  event.stopPropagation();
  loveSong.currentTime = Math.min(AUDIO_END_TIME, loveSong.currentTime + 10);
  syncPlayer();
});

loopMusic.addEventListener("click", (event) => {
  event.stopPropagation();
  loveSong.loop = !loveSong.loop;
  loopMusic.classList.toggle("is-active", loveSong.loop);
});

loveSong.addEventListener("loadedmetadata", syncPlayer);
loveSong.addEventListener("timeupdate", () => {
  if (loveSong.currentTime >= AUDIO_END_TIME) {
    loveSong.pause();
    loveSong.currentTime = AUDIO_END_TIME;
    document.body.classList.remove("is-playing");
    pauseStoryProgress();
  }
  syncPlayer();
});
loveSong.addEventListener("play", syncPlayer);
loveSong.addEventListener("pause", syncPlayer);

function updateCounter() {
  const now = new Date();
  let years = now.getFullYear() - START_DATE.getFullYear();
  let months = now.getMonth() - START_DATE.getMonth();
  let days = now.getDate() - START_DATE.getDate();
  let hours = now.getHours() - START_DATE.getHours();
  let minutes = now.getMinutes() - START_DATE.getMinutes();
  let seconds = now.getSeconds() - START_DATE.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += previousMonth.getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  document.querySelector("[data-count='years']").textContent = years;
  document.querySelector("[data-count='months']").textContent = months;
  document.querySelector("[data-count='days-part']").textContent = days;
  document.querySelector("[data-count='hours-part']").textContent = hours;
  document.querySelector("[data-count='minutes-part']").textContent = minutes;
  document.querySelector("[data-count='seconds-part']").textContent = seconds;
}

document.querySelectorAll("[data-next-story]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    nextStory();
  });
});

document.querySelectorAll("[data-prev-story]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    prevStory();
  });
});

storiesRoot.addEventListener("click", (event) => {
  if (event.target.closest("button, a")) return;
  if (shouldIgnoreTap) {
    shouldIgnoreTap = false;
    return;
  }

  const bounds = storiesRoot.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  if (x < bounds.width * 0.34) {
    prevStory();
  } else {
    nextStory();
  }
});

storiesRoot.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button, a")) return;

  holdStartedAt = performance.now();
  shouldIgnoreTap = false;
  storyHoldWasPlaying = !loveSong.paused;
  if (storyHoldWasPlaying) {
    loveSong.pause();
    document.body.classList.remove("is-playing");
    syncPlayer();
  }
  pauseStoryProgress();
});

function releaseStoryHold() {
  if (!holdStartedAt) return;

  shouldIgnoreTap = performance.now() - holdStartedAt > 220;
  holdStartedAt = 0;
  const shouldResumeMusic = storyHoldWasPlaying;
  storyHoldWasPlaying = false;
  resumeStoryProgress();
  if (shouldResumeMusic) {
    startMusic({ hearts: false });
  }
}

window.addEventListener("pointerup", releaseStoryHold);
window.addEventListener("pointercancel", releaseStoryHold);
window.addEventListener("blur", releaseStoryHold);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === " ") nextStory();
  if (event.key === "ArrowLeft") prevStory();
});

window.addEventListener("resize", resizeStars);
showStory(0);
updateCounter();
setInterval(updateCounter, 1000);
syncPlayer();
resizeStars();
drawStars();
setTimeout(() => {
  giftLoader?.classList.add("is-hidden");
}, 1700);

