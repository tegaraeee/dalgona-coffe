// DALGONA COFFEE SIMULATOR
// Drag bahan ke area yang sesuai. Saat mengocok, gerakkan pointer berulang kali.

const $ = (id) => document.getElementById(id);

const steps = [
  { title: "Siapkan bahan", desc: "Seret kopi, gula, dan air panas ke dalam mangkuk.", icon: "🥣", hint: "Masukkan kopi, gula, dan air panas ke mangkuk. Urutannya bebas." },
  { title: "Campurkan bahan", desc: "Pastikan ketiga bahan sudah masuk ke mangkuk.", icon: "🥄", hint: "Semua bahan sudah siap. Tekan Selanjutnya untuk mulai mengocok." },
  { title: "Kocok hingga mengembang", desc: "Gerakkan mouse atau jari berulang kali di area mangkuk.", icon: "🌀", hint: "Gerakkan pointer bolak-balik di area mangkuk sampai meter penuh." },
  { title: "Tuang susu", desc: "Seret susu ke dalam gelas untuk mengisi dasar minuman.", icon: "🥛", hint: "Seret susu ke gelas. Susu akan mengisi bagian bawah gelas." },
  { title: "Tambahkan es & krim", desc: "Masukkan es batu, lalu letakkan krim Dalgona di atasnya.", icon: "🧊", hint: "Masukkan es batu, kemudian tekan Selanjutnya untuk menambahkan krim." },
  { title: "Sajikan Dalgona", desc: "Minumanmu sudah siap. Lihat hasil racikanmu!", icon: "✨", hint: "Keren! Tekan Sajikan untuk menyelesaikan permainan." }
];

const required = {
  0: ["coffee", "sugar", "water"],
  3: ["milk"],
  4: ["ice"]
};

let step = 0;
let score = 0;
let seconds = 0;
let timerId = null;
let started = false;
let ingredientsDone = new Set();
let whiskCount = 0;
let isWhisking = false;
let lastWhiskX = null;
let lastWhiskY = null;
let lastWhiskTime = 0;
let audioContext = null;

const ingredientNames = {
  coffee: "Kopi",
  sugar: "Gula",
  water: "Air panas",
  milk: "Susu",
  ice: "Es batu"
};

function playTone(freq = 520, duration = 0.12) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = freq;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.055, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Game tetap berjalan jika audio tidak didukung browser.
  }
}

function formatTime(value) {
  const min = String(Math.floor(value / 60)).padStart(2, "0");
  const sec = String(value % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function updateTimer() {
  $("timer").textContent = formatTime(seconds);
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    if (!started) return;
    seconds++;
    updateTimer();
  }, 1000);
}

function updateScore(points) {
  score += points;
  $("score").textContent = score;
}

function updateStepUI() {
  const data = steps[step];
  $("stepNumber").textContent = String(step + 1).padStart(2, "0");
  $("stepTitle").textContent = data.title;
  $("stepDescription").textContent = data.desc;
  $("stepIcon").textContent = data.icon;
  $("instruction").textContent = data.hint;
  $("stepCounter").textContent = `Langkah ${step + 1} dari 6`;
  $("progressBar").style.width = `${((step + 1) / 6) * 100}%`;
  $("actionBtn").disabled = !canContinue();
  $("actionBtn").textContent = step === 5 ? "Sajikan ☕" : "Selanjutnya →";
  $("workLabel").textContent = step === 3 || step === 4 ? "AREA GELAS" : "AREA MANGKUK";
}

function canContinue() {
  if (step === 0) return ["coffee", "sugar", "water"].every(x => ingredientsDone.has(x));
  if (step === 1) return true;
  if (step === 2) return whiskCount >= 18;
  if (step === 3) return ingredientsDone.has("milk");
  if (step === 4) return ingredientsDone.has("ice");
  return true;
}

function setDropMode() {
  $("bowlDrop").classList.toggle("hidden", step !== 0 && step !== 1);
  $("whiskArea").classList.toggle("hidden", step !== 2);
  $("glassDrop").classList.toggle("hidden", step !== 3 && step !== 4);
  $("serveArea").classList.toggle("hidden", step !== 5);

  $("dropHint").textContent = step === 1 ? "Bahan sudah tercampur" : "Taruh bahan di sini";
  $("glassHint").textContent = step === 3 ? "Taruh susu di gelas" : "Tambahkan es batu";

  if (step === 1) $("mixture").style.height = "55%";
  if (step === 2) $("whiskMixture").style.height = `${55 + Math.min(whiskCount, 18) * 2}%`;
  if (step >= 4) $("glassIce").style.opacity = "1";
  if (step === 5) $("glassFoam").style.height = "38px";
  updateStepUI();
}

function useIngredient(item, element) {
  if (!started) return;
  const valid = (required[step] || []).includes(item);
  if (!valid) {
    $("instruction").textContent = step < 3
      ? "Bahan itu belum dibutuhkan pada langkah ini. Ikuti petunjuk, ya!"
      : "Bahan itu belum dibutuhkan. Coba bahan yang sesuai langkah ini.";
    playTone(210, 0.1);
    return;
  }
  if (ingredientsDone.has(item)) {
    $("instruction").textContent = `${ingredientNames[item]} sudah dimasukkan.`;
    return;
  }

  ingredientsDone.add(item);
  element.classList.add("used");
  updateScore(10);
  playTone(item === "ice" ? 740 : 560, 0.14);

  if (item === "coffee" || item === "sugar" || item === "water") {
    $("mixture").style.height = `${ingredientsDone.size * 17}%`;
    $("instruction").textContent = `${ingredientNames[item]} berhasil dimasukkan ke mangkuk!`;
  }
  if (item === "milk") {
    $("glassMilk").style.height = "68%";
    $("instruction").textContent = "Susu berhasil dituangkan ke dalam gelas!";
  }
  if (item === "ice") {
    $("glassIce").style.opacity = "1";
    $("glassIce").style.transform = "translateY(-3px)";
    $("instruction").textContent = "Es batu sudah masuk. Gelasmu makin segar!";
  }

  updateStepUI();
}

function setupDragAndDrop() {
  document.querySelectorAll(".ingredient").forEach(button => {
    button.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", button.dataset.item);
      button.classList.add("dragging");
    });
    button.addEventListener("dragend", () => button.classList.remove("dragging"));

    // Sentuhan dan klik: pilih bahan, lalu ketuk area mangkuk/gelas.
    button.addEventListener("click", () => {
      if (!started || button.classList.contains("used")) return;
      const target = step === 3 || step === 4 ? $("glassDrop") : $("bowlDrop");
      if (target.classList.contains("hidden")) {
        $("instruction").textContent = "Ikuti langkah yang sedang aktif terlebih dahulu.";
        return;
      }
      useIngredient(button.dataset.item, button);
    });

    button.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" || !started || button.classList.contains("used")) return;
      // Tap bahan langsung memasukkan bahan yang sesuai, nyaman untuk layar sentuh.
      event.preventDefault();
      useIngredient(button.dataset.item, button);
    });
  });

  [ $("bowlDrop"), $("glassDrop") ].forEach(target => {
    target.addEventListener("dragover", event => {
      event.preventDefault();
      target.classList.add("drop-target");
    });
    target.addEventListener("dragleave", () => target.classList.remove("drop-target"));
    target.addEventListener("drop", event => {
      event.preventDefault();
      target.classList.remove("drop-target");
      const item = event.dataTransfer.getData("text/plain");
      const button = document.querySelector(`.ingredient[data-item="${item}"]`);
      if (button) useIngredient(item, button);
    });
  });
}

function registerWhiskMove(event) {
  if (!isWhisking || step !== 2 || whiskCount >= 18) return;
  const now = performance.now();
  const rect = $("whiskArea").getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (lastWhiskX !== null) {
    const distance = Math.hypot(x - lastWhiskX, y - lastWhiskY);
    if (distance > 18 && now - lastWhiskTime > 45) {
      whiskCount = Math.min(18, whiskCount + 1);
      lastWhiskTime = now;
      $("whiskProgress").style.width = `${(whiskCount / 18) * 100}%`;
      $("whiskCount").textContent = `${whiskCount} / 18 gerakan`;
      $("whiskMixture").style.height = `${55 + whiskCount * 2}%`;
      $("whiskMixture").style.borderRadius = `${45 + whiskCount}% ${45 + whiskCount}% 0 0`;
      playTone(300 + whiskCount * 22, 0.045);
      if (whiskCount >= 18) {
        $("instruction").textContent = "Wah, krim Dalgona-mu sudah mengembang sempurna! Tekan Selanjutnya.";
        updateScore(30);
        updateStepUI();
      }
    }
  }
  lastWhiskX = x;
  lastWhiskY = y;
}

function setupWhisk() {
  const area = $("whiskArea");
  area.addEventListener("pointerdown", event => {
    if (step !== 2 || !started) return;
    isWhisking = true;
    lastWhiskX = null;
    lastWhiskY = null;
    area.setPointerCapture(event.pointerId);
    registerWhiskMove(event);
  });
  area.addEventListener("pointermove", registerWhiskMove);
  const stop = () => { isWhisking = false; lastWhiskX = null; lastWhiskY = null; };
  area.addEventListener("pointerup", stop);
  area.addEventListener("pointercancel", stop);
  area.addEventListener("lostpointercapture", stop);
}

function nextStep() {
  if (!canContinue()) return;
  if (step === 5) {
    finishGame();
    return;
  }
  if (step === 1) updateScore(10);
  if (step === 2) {
    $("glassFoam").style.height = "0";
    $("glassMilk").style.height = "68%";
  }
  step++;
  playTone(650, 0.15);
  setDropMode();
}

function finishGame() {
  started = false;
  clearInterval(timerId);
  updateScore(20);
  $("finalScore").textContent = score;
  $("finalTime").textContent = formatTime(seconds);
  $("resultModal").classList.remove("hidden");
  playTone(880, 0.35);
}

function resetGame(showWelcome = false) {
  clearInterval(timerId);
  started = false;
  step = 0;
  score = 0;
  seconds = 0;
  ingredientsDone = new Set();
  whiskCount = 0;
  isWhisking = false;
  lastWhiskX = lastWhiskY = null;

  $("score").textContent = "0";
  $("timer").textContent = "00:00";
  $("whiskProgress").style.width = "0%";
  $("whiskCount").textContent = "0 / 18 gerakan";
  $("mixture").style.height = "0";
  $("whiskMixture").style.height = "55%";
  $("glassMilk").style.height = "0";
  $("glassIce").style.opacity = "0";
  $("glassFoam").style.height = "0";
  document.querySelectorAll(".ingredient").forEach(el => el.classList.remove("used"));
  $("resultModal").classList.add("hidden");
  $("startModal").classList.toggle("hidden", !showWelcome);
  setDropMode();
}

function startGame() {
  $("startModal").classList.add("hidden");
  $("resultModal").classList.add("hidden");
  started = true;
  startTimer();
  updateStepUI();
}

$("startBtn").addEventListener("click", startGame);
$("actionBtn").addEventListener("click", nextStep);
$("resetBtn").addEventListener("click", () => resetGame(false));
$("againBtn").addEventListener("click", () => {
  resetGame(false);
  startGame();
});
$("homeBtn").addEventListener("click", () => resetGame(true));

setupDragAndDrop();
setupWhisk();
resetGame(true);
