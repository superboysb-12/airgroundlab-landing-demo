const deck = document.getElementById("deck");
const slides = Array.from(document.querySelectorAll(".slide"));
const pager = document.getElementById("pager");
let pagerButtons = [];
const chipButtons = document.querySelectorAll(".chip");
const simPanel = document.querySelector(".sim-panel");
const simCopy = document.getElementById("sim-copy");
const fadeNodes = document.querySelectorAll(".fade-up");
const featureButtons = Array.from(document.querySelectorAll(".switch-btn"));
const featurePanels = Array.from(document.querySelectorAll(".feature-panel"));
const featureStage = document.getElementById("feature-stage");
const insightButtons = Array.from(document.querySelectorAll(".insight-btn"));
const insightTrack = document.getElementById("insight-track");
const insightText = document.getElementById("insight-text");
const insightStepTitle = document.getElementById("insight-step-title");
const insightStepDesc = document.getElementById("insight-step-desc");
const insightStage = document.getElementById("insight-stage");

let activeIndex = 0;
let wheelLock = false;
let featureIndex = 0;
let insightIndex = 0;
let insightTouchStartY = 0;
let insightWheelLock = false;
let insightTextToken = 0;

function updateDeckScale() {
  const designWidth = 1920;
  const designHeight = 1080;
  const widthRatio = window.innerWidth / designWidth;
  const heightRatio = window.innerHeight / designHeight;
  const scale = Math.min(1, widthRatio, heightRatio);
  document.documentElement.style.setProperty("--deck-scale", String(scale));
}

function updatePager(index) {
  if (!pagerButtons.length) return;
  pagerButtons.forEach((button, i) => {
    const isActive = i === index;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function initPager() {
  if (!pager || !slides.length) return;
  const fragment = document.createDocumentFragment();
  pagerButtons = slides.map((_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-dot";
    button.textContent = String(i + 1);
    button.setAttribute("aria-label", `Jump to slide ${i + 1}`);
    button.addEventListener("click", () => goToSlide(i));
    fragment.appendChild(button);
    return button;
  });
  pager.innerHTML = "";
  pager.appendChild(fragment);
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

if (deck) {
  updateDeckScale();

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

window.addEventListener("resize", updateDeckScale, { passive: true });

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

const insightSteps = [
  {
    title: "Module 1 - Simulation Launch",
    desc: "Set mission goals, urban context, and initial constraints. The system bootstraps the digital twin scene and loads baseline operational assumptions."
  },
  {
    title: "Module 2 - Policy Input",
    desc: "Inject policy rules and operating parameters, including low-altitude zoning, speed limits, time windows, and safety boundaries for compliant planning."
  },
  {
    title: "Module 3 - Simulation Execution",
    desc: "Run accelerated multi-agent delivery scenarios with synchronized UAV/UGV behaviors, then observe route dynamics, bottlenecks, and system response in real time."
  },
  {
    title: "Module 4 - Report Generation",
    desc: "Generate end-to-end AI insight reports for strategy comparison, highlighting cost-efficiency tradeoffs, risk hotspots, and deployment recommendations."
  }
];

function renderInsightText(step) {
  if (!step || !insightStepTitle || !insightStepDesc) return;
  insightStepTitle.textContent = step.title;
  insightStepDesc.textContent = step.desc;
}

function getInsightDirection(prev, next, total) {
  const forward = (next - prev + total) % total;
  const backward = (prev - next + total) % total;
  return forward <= backward ? 1 : -1;
}

function animateInsightText(step, direction) {
  if (!insightText || !insightStepTitle || !insightStepDesc) return;
  const token = ++insightTextToken;

  if (typeof insightText.getAnimations === "function") {
    insightText.getAnimations().forEach((anim) => anim.cancel());
  }

  if (typeof insightText.animate !== "function") {
    renderInsightText(step);
    return;
  }

  const outOffset = direction > 0 ? -14 : 14;
  const inOffset = direction > 0 ? 14 : -14;

  const outAnim = insightText.animate(
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: `translateY(${outOffset}px)` }
    ],
    {
      duration: 210,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards"
    }
  );

  outAnim.finished
    .catch(() => null)
    .then(() => {
      if (token !== insightTextToken) return;
      renderInsightText(step);

      const inAnim = insightText.animate(
        [
          { opacity: 0, transform: `translateY(${inOffset}px)` },
          { opacity: 1, transform: "translateY(0)" }
        ],
        {
          duration: 300,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
          fill: "forwards"
        }
      );

      inAnim.finished
        .catch(() => null)
        .then(() => {
          if (token !== insightTextToken) return;
          insightText.style.opacity = "";
          insightText.style.transform = "";
        });
    });
}

function setInsightStep(index, options = {}) {
  if (!insightSteps.length || !insightTrack) return;

  const { instant = false } = options;
  const prevIndex = insightIndex;
  const nextIndex = (index + insightSteps.length) % insightSteps.length;
  const current = insightSteps[nextIndex];

  insightIndex = nextIndex;
  insightButtons.forEach((btn, i) => btn.classList.toggle("active", i === insightIndex));
  insightTrack.style.transform = `translateY(-${(insightIndex * 100) / insightSteps.length}%)`;

  if (instant || prevIndex === nextIndex) {
    renderInsightText(current);
    return;
  }

  const direction = getInsightDirection(prevIndex, nextIndex, insightSteps.length);
  animateInsightText(current, direction);
}

insightButtons.forEach((button, i) => {
  button.addEventListener("click", () => setInsightStep(i));
});

if (insightStage) {
  insightStage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (insightWheelLock) return;
      if (Math.abs(event.deltaY) < 12) return;
      insightWheelLock = true;
      setInsightStep(insightIndex + (event.deltaY > 0 ? 1 : -1));
      window.setTimeout(() => {
        insightWheelLock = false;
      }, 460);
    },
    { passive: false }
  );

  insightStage.addEventListener(
    "touchstart",
    (event) => {
      insightTouchStartY = event.changedTouches[0].clientY;
    },
    { passive: true }
  );

  insightStage.addEventListener(
    "touchend",
    (event) => {
      const endY = event.changedTouches[0].clientY;
      const deltaY = endY - insightTouchStartY;
      if (Math.abs(deltaY) < 36) return;
      setInsightStep(insightIndex + (deltaY < 0 ? 1 : -1));
    },
    { passive: true }
  );
}

setFeaturePanel(0);
setInsightStep(0, { instant: true });

initPager();
updatePager(activeIndex);

