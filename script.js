const deck = document.getElementById("deck");
const slides = Array.from(document.querySelectorAll(".slide"));
const pageIndex = document.getElementById("page-index");
const chipButtons = document.querySelectorAll(".chip");
const simPanel = document.querySelector(".sim-panel");
const simCopy = document.getElementById("sim-copy");
const fadeNodes = document.querySelectorAll(".fade-up");
const flowSteps = Array.from(document.querySelectorAll(".flow-step"));
const reports = document.getElementById("reports");
const insightSlide = document.getElementById("slide-insight");
const featureButtons = Array.from(document.querySelectorAll(".switch-btn"));
const featurePanels = Array.from(document.querySelectorAll(".feature-panel"));
const featureStage = document.getElementById("feature-stage");

let activeIndex = 0;
let wheelLock = false;
let flowPlaying = false;
let featureIndex = 0;

function pad(value) {
  return String(value + 1).padStart(2, "0");
}

function updatePager(index) {
  if (!pageIndex) return;
  pageIndex.textContent = pad(index);
}

function goToSlide(index) {
  if (!slides.length) return;
  const target = Math.max(0, Math.min(index, slides.length - 1));
  activeIndex = target;
  slides[target].scrollIntoView({ behavior: "smooth", block: "start" });
  updatePager(target);
}

function detectActiveSlide() {
  if (!deck || !slides.length) return;
  const current = Math.round(deck.scrollTop / deck.clientHeight);
  if (current !== activeIndex) {
    activeIndex = Math.max(0, Math.min(current, slides.length - 1));
    updatePager(activeIndex);
  }
}

function playInsightFlow() {
  if (flowPlaying || !flowSteps.length) return;
  flowPlaying = true;
  reports?.classList.remove("show");
  flowSteps.forEach((step) => step.classList.remove("active"));

  let i = 0;
  const timer = window.setInterval(() => {
    if (i > 0) flowSteps[i - 1].classList.remove("active");
    if (i < flowSteps.length) {
      flowSteps[i].classList.add("active");
      i += 1;
      return;
    }
    window.clearInterval(timer);
    reports?.classList.add("show");
    flowPlaying = false;
  }, 680);
}

if (deck) {
  // Desktop wheel is quantized to one full slide per interaction.
  deck.addEventListener(
    "wheel",
    (event) => {
      if (window.matchMedia("(pointer: coarse)").matches) return;
      event.preventDefault();
      if (wheelLock) return;
      if (Math.abs(event.deltaY) < 6) return;
      wheelLock = true;
      goToSlide(activeIndex + (event.deltaY > 0 ? 1 : -1));
      window.setTimeout(() => {
        wheelLock = false;
      }, 700);
    },
    { passive: false }
  );

  deck.addEventListener("scroll", detectActiveSlide, { passive: true });
}

window.addEventListener("keydown", (event) => {
  if (["ArrowDown", "PageDown", "Space"].includes(event.code)) {
    event.preventDefault();
    goToSlide(activeIndex + 1);
  }
  if (["ArrowUp", "PageUp"].includes(event.code)) {
    event.preventDefault();
    goToSlide(activeIndex - 1);
  }
});

chipButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.getAttribute("data-mode");
    chipButtons.forEach((chip) => chip.classList.remove("active"));
    button.classList.add("active");
    if (!simPanel || !simCopy) return;
    simPanel.dataset.mode = mode;
    simCopy.textContent =
      mode === "physics"
        ? "2D to 3D drill: wind-field delivery physics, flight telemetry, road-network transfer, and global zoom-out."
        : "ArcGIS + OSM real road network: UGV follows streets, UAV flies straight paths, strategy scales to global view.";
  });
});

const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("in");
    });
  },
  { threshold: 0.22 }
);

fadeNodes.forEach((node) => fadeObserver.observe(node));

if (insightSlide) {
  const insightObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) playInsightFlow();
      });
    },
    { threshold: 0.46 }
  );
  insightObserver.observe(insightSlide);
}

function setFeaturePanel(index) {
  if (!featurePanels.length) return;
  featureIndex = (index + featurePanels.length) % featurePanels.length;
  featurePanels.forEach((panel, i) => panel.classList.toggle("active", i === featureIndex));
  featureButtons.forEach((btn, i) => btn.classList.toggle("active", i === featureIndex));
}

featureButtons.forEach((button, i) => {
  button.addEventListener("click", () => setFeaturePanel(i));
});

if (featureStage && featurePanels.length) {
  let startX = 0;
  featureStage.addEventListener(
    "touchstart",
    (event) => {
      startX = event.changedTouches[0].clientX;
    },
    { passive: true }
  );
  featureStage.addEventListener(
    "touchend",
    (event) => {
      const endX = event.changedTouches[0].clientX;
      const delta = endX - startX;
      if (Math.abs(delta) < 40) return;
      setFeaturePanel(featureIndex + (delta < 0 ? 1 : -1));
    },
    { passive: true }
  );
}

setFeaturePanel(0);
updatePager(activeIndex);
