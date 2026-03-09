const deck = document.getElementById("deck");
const slides = Array.from(document.querySelectorAll(".slide"));
const pager = document.getElementById("pager");
let pagerButtons = [];

const chipButtons = document.querySelectorAll(".chip");
const simPanel = document.querySelector(".sim-panel");
const simCopy = document.getElementById("sim-copy");

const fadeNodes = document.querySelectorAll(".fade-up");

const moduleButtons = Array.from(document.querySelectorAll(".module-btn"));
const modulePanels = Array.from(document.querySelectorAll(".module-panel"));
const moduleStage = document.getElementById("module-stage");

const featureButtons = Array.from(document.querySelectorAll(".feature-switch .switch-btn"));
const featurePanels = Array.from(document.querySelectorAll(".feature-panel"));
const featureStage = document.getElementById("feature-stage");

const businessPanels = Array.from(document.querySelectorAll(".business-panel"));
const businessStage = document.getElementById("business-stage");
const businessPrevButton = document.getElementById("ba-prev");
const businessNextButton = document.getElementById("ba-next");
const businessNavIndex = document.getElementById("ba-nav-index");
const businessNavLabel = document.getElementById("ba-nav-label");
const businessCompetitionHead = document.getElementById("ba-competition-head");
const businessCompetitionBody = document.getElementById("ba-competition-body");

const insightButtons = Array.from(document.querySelectorAll(".insight-btn"));
const insightTrack = document.getElementById("insight-track");
const insightText = document.getElementById("insight-text");
const insightStepTitle = document.getElementById("insight-step-title");
const insightStepDesc = document.getElementById("insight-step-desc");
const insightStage = document.getElementById("insight-stage");

const autoScrollToggle = document.getElementById("auto-scroll-toggle");
const compareChartDom = document.getElementById("compare-chart3d");
const vizChartDom = document.getElementById("viz-chart3d");

const CONFIG = {
  AUTO_SCROLL_INTERVAL_MS: 5000,
  COMPACT_LAYOUT_QUERY: "(max-width: 1180px), (max-height: 720px)",
  DECK_WHEEL_MIN_DELTA: 6,
  DECK_WHEEL_LOCK_MS: 700,
  TOUCH_SWITCH_X_THRESHOLD: 40,
  TOUCH_SWITCH_Y_THRESHOLD: 36,
  INSIGHT_WHEEL_MIN_DELTA: 12,
  INSIGHT_WHEEL_LOCK_MS: 460,
  FADE_OBSERVER_THRESHOLD: 0.22,
  CHART_RESIZE_DEBOUNCE_MS: 180
};

const coarsePointerMedia = window.matchMedia("(pointer: coarse)");

let activeIndex = 0;
let wheelLock = false;
let moduleIndex = 0;
let featureIndex = 0;
let businessIndex = 0;
let insightIndex = 0;
let businessPanelToken = 0;
let insightWheelLock = false;
let insightTextToken = 0;
let autoScrollTimer = null;
let autoScrollTimers = [];
let compareChart = null;
let vizChart = null;

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

function isCompactLayout() {
  return window.matchMedia(CONFIG.COMPACT_LAYOUT_QUERY).matches;
}

function clampIndex(index, total) {
  if (!total) return 0;
  return (index + total) % total;
}

function debounce(fn, waitMs) {
  let timer = null;
  return (...args) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };
}

function toggleActiveState(nodes, activeIdx) {
  nodes.forEach((node, i) => node.classList.toggle("active", i === activeIdx));
}

function bindIndexedButtons(buttons, onSelect) {
  buttons.forEach((button, i) => {
    button.addEventListener("click", () => onSelect(i));
  });
}

function bindTouchSwitch(element, axis, threshold, onStep) {
  if (!element) return;

  let startPos = 0;
  const isX = axis === "x";

  element.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.changedTouches[0];
      startPos = isX ? touch.clientX : touch.clientY;
    },
    { passive: true }
  );

  element.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches[0];
      const endPos = isX ? touch.clientX : touch.clientY;
      const delta = endPos - startPos;
      if (Math.abs(delta) < threshold) return;
      onStep(delta);
    },
    { passive: true }
  );
}

function createCyclicSwitcher(options) {
  const { buttons, getIndex, setIndex } = options;
  bindIndexedButtons(buttons, setIndex);

  return {
    prev() {
      setIndex(getIndex() - 1);
    },
    next() {
      setIndex(getIndex() + 1);
    }
  };
}

function isTextInputLike(element) {
  if (!(element instanceof HTMLElement)) return false;
  const tag = element.tagName;
  return element.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function updateDeckScale() {
  if (isCompactLayout()) {
    document.documentElement.style.setProperty("--deck-scale", "1");
    return;
  }

  const designWidth = 1920;
  const designHeight = 1080;
  const widthRatio = window.innerWidth / designWidth;
  const heightRatio = window.innerHeight / designHeight;
  const scale = Math.min(1, widthRatio, heightRatio);
  document.documentElement.style.setProperty("--deck-scale", String(scale));
}

function syncResponsiveState() {
  const compact = isCompactLayout();
  document.documentElement.classList.toggle("compact-layout", compact);

  if (!autoScrollToggle) return;
  autoScrollToggle.disabled = compact;

  if (compact) {
    autoScrollToggle.checked = false;
    stopAutoScroll();
  }
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
  
  // 如果自动滚动开启，调度下一次转换
  if (autoScrollToggle && autoScrollToggle.checked && !autoScrollToggle.disabled) {
    stopAutoScroll();
    // 等待滚动动画完成后再开始计时
    window.setTimeout(() => {
      scheduleNextTransition();
    }, 800);
  }
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    window.clearTimeout(autoScrollTimer);
    autoScrollTimer = null;
  }
  autoScrollTimers.forEach(window.clearTimeout);
  autoScrollTimers = [];
}

function getSlideSwitcherById(slideId) {
  if (slideId === "slide-modules" && modulePanels.length > 0) {
    return {
      totalCount: modulePanels.length,
      setIndex: setModulePanel,
      next: () => moduleSwitcher.next(),
      prev: () => moduleSwitcher.prev()
    };
  }

  if (slideId === "slide-agent" && featurePanels.length > 0) {
    return {
      totalCount: featurePanels.length,
      setIndex: setFeaturePanel,
      next: () => featureSwitcher.next(),
      prev: () => featureSwitcher.prev()
    };
  }

  if (slideId === "slide-business" && businessPanels.length > 0) {
    return {
      totalCount: businessPanels.length,
      setIndex: setBusinessPanel,
      next: () => businessSwitcher.next(),
      prev: () => businessSwitcher.prev()
    };
  }

  if (slideId === "slide-insight" && insightSteps.length > 0) {
    return {
      totalCount: insightSteps.length,
      setIndex: setInsightStep,
      next: () => insightSwitcher.next(),
      prev: () => insightSwitcher.prev()
    };
  }

  return null;
}

function scheduleNextTransition() {
  if (!autoScrollToggle || !autoScrollToggle.checked) {
    stopAutoScroll();
    return;
  }

  const currentSlide = slides[activeIndex] || null;
  const isAutoPlayableSlide = currentSlide && ["slide-modules", "slide-agent"].includes(currentSlide.id);
  const switcher = isAutoPlayableSlide ? getSlideSwitcherById(currentSlide.id) : null;
  
  if (switcher && switcher.totalCount > 1) {
    // 每个模块的停留时间与页面切换时间保持一致
    const intervalPerModule = CONFIG.AUTO_SCROLL_INTERVAL_MS;
    const totalTime = intervalPerModule * switcher.totalCount;
    
    // 立即显示第一个模块
    switcher.setIndex(0);
    
    // 设置定时器依次切换剩余模块
    for (let i = 1; i < switcher.totalCount; i++) {
      const timer = window.setTimeout(() => {
        if (autoScrollToggle && autoScrollToggle.checked) {
          switcher.next();
        }
      }, intervalPerModule * i);
      autoScrollTimers.push(timer);
    }
    
    // 所有模块切换完后，切换到下一页
    autoScrollTimer = window.setTimeout(() => {
      if (autoScrollToggle && autoScrollToggle.checked) {
        goToSlide((activeIndex + 1) % slides.length);
      }
    }, totalTime);
  } else {
    // 当前页面没有模块或只有一个模块，直接等待后切换
    autoScrollTimer = window.setTimeout(() => {
      if (autoScrollToggle && autoScrollToggle.checked) {
        goToSlide((activeIndex + 1) % slides.length);
      }
    }, CONFIG.AUTO_SCROLL_INTERVAL_MS);
  }
}

function startAutoScroll() {
  stopAutoScroll();
  if (!slides.length) return;
  scheduleNextTransition();
}

function syncAutoScrollState() {
  if (!autoScrollToggle || autoScrollToggle.disabled) {
    stopAutoScroll();
    return;
  }

  if (autoScrollToggle.checked) {
    startAutoScroll();
    return;
  }

  stopAutoScroll();
}

function detectActiveSlide() {
  if (!deck || !slides.length) return;

  const viewportMid = deck.scrollTop + deck.clientHeight / 2;
  let current = activeIndex;
  let closestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, index) => {
    const slideMid = slide.offsetTop + slide.offsetHeight / 2;
    const distance = Math.abs(slideMid - viewportMid);
    if (distance < closestDistance) {
      closestDistance = distance;
      current = index;
    }
  });

  if (current !== activeIndex) {
    activeIndex = Math.max(0, Math.min(current, slides.length - 1));
    updatePager(activeIndex);
  }
}

function setFeaturePanel(index) {
  if (!featurePanels.length) return;
  featureIndex = clampIndex(index, featurePanels.length);
  toggleActiveState(featurePanels, featureIndex);
  toggleActiveState(featureButtons, featureIndex);
}

function getBusinessSlideOffset(direction) {
  return direction > 0 ? -44 : 44;
}

function animateBusinessPanelTransition(prevPanel, nextPanel, direction) {
  const token = ++businessPanelToken;
  const outOffset = getBusinessSlideOffset(direction);
  const inOffset = -outOffset;

  if (typeof prevPanel.getAnimations === "function") {
    prevPanel.getAnimations().forEach((anim) => anim.cancel());
  }
  if (typeof nextPanel.getAnimations === "function") {
    nextPanel.getAnimations().forEach((anim) => anim.cancel());
  }

  prevPanel.classList.add("active");
  prevPanel.style.zIndex = "3";
  nextPanel.classList.add("active");
  nextPanel.style.zIndex = "2";

  if (typeof prevPanel.animate !== "function" || typeof nextPanel.animate !== "function") {
    prevPanel.classList.remove("active");
    prevPanel.style.zIndex = "";
    nextPanel.style.zIndex = "";
    return;
  }

  const animationOptions = {
    duration: 360,
    easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    fill: "forwards"
  };

  const outAnim = prevPanel.animate(
    [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: `translateX(${outOffset}px)` }
    ],
    animationOptions
  );

  const inAnim = nextPanel.animate(
    [
      { opacity: 0, transform: `translateX(${inOffset}px)` },
      { opacity: 1, transform: "translateX(0)" }
    ],
    animationOptions
  );

  Promise.all([outAnim.finished.catch(() => null), inAnim.finished.catch(() => null)]).then(() => {
    if (token !== businessPanelToken) return;
    prevPanel.classList.remove("active");
    prevPanel.style.opacity = "";
    prevPanel.style.transform = "";
    prevPanel.style.zIndex = "";
    nextPanel.style.opacity = "";
    nextPanel.style.transform = "";
    nextPanel.style.zIndex = "";
  });
}

function setBusinessPanel(index) {
  if (!businessPanels.length) return;
  const prevIndex = businessIndex;
  const prevPanel = businessPanels[prevIndex] || null;
  const nextIndex = clampIndex(index, businessPanels.length);
  const direction = getInsightDirection(prevIndex, nextIndex, businessPanels.length);

  businessIndex = nextIndex;
  const current = businessPanels[businessIndex];

  if (businessNavIndex) {
    businessNavIndex.textContent = `${String(businessIndex + 1).padStart(2, "0")} / ${String(businessPanels.length).padStart(2, "0")}`;
  }
  if (businessNavLabel) {
    businessNavLabel.textContent = current.dataset.businessTitle || "";
  }

  if (prevIndex === businessIndex) {
    current.classList.add("active");
    return;
  }

  if (prevPanel && prevPanel !== current) {
    animateBusinessPanelTransition(prevPanel, current, direction);
  } else {
    current.classList.add("active");
  }
}

function setModulePanel(index) {
  if (!modulePanels.length) return;
  moduleIndex = clampIndex(index, modulePanels.length);
  toggleActiveState(modulePanels, moduleIndex);
  toggleActiveState(moduleButtons, moduleIndex);
}

function parseCsvLine(line) {
  return line.split(",").map((cell) => cell.trim());
}

function normalizeBusinessCsvHeader(value) {
  if (!value) return "";
  if (value.includes("AirGroundLAB")) return "AirGroundLAB (OUR)";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeBusinessCsvCell(value) {
  if (!value) return "";

  const knownValues = [
    "High",
    "Low/None",
    "Single/Micro",
    "Massive",
    "Air Traffic Only",
    "Static Env.",
    "Math Logic",
    "No Demand",
    "Real-time"
  ];

  for (const label of knownValues) {
    if (value.includes(label)) return label;
  }

  return value
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\)+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderBusinessCompetitionTable(rows) {
  if (!businessCompetitionHead || !businessCompetitionBody || !rows.length) return;

  const [headerRow, ...bodyRows] = rows;
  const normalizedHeaders = headerRow.map(normalizeBusinessCsvHeader);
  businessCompetitionHead.innerHTML = normalizedHeaders.map((cell) => `<th>${cell}</th>`).join("");

  businessCompetitionBody.innerHTML = bodyRows
    .map((row) => {
      const [dimension, ...cells] = row;
      const normalizedCells = cells.map(normalizeBusinessCsvCell);
      return `
        <tr>
          <th>${dimension}</th>
          ${normalizedCells.map((cell) => `<td>${cell}</td>`).join("")}
        </tr>
      `;
    })
    .join("");
}

async function loadBusinessCompetitionTable() {
  if (!businessCompetitionBody) return;

  const fallbackRows = [
    ["Core Dimensions", "AirSim", "AnyLogic", "NASA UTM", "AirGroundLAB (OUR)"],
    ["Physical Fidelity", "High", "Low/None", "Low/None", "High"],
    ["Logistics Network Scale", "Single/Micro", "Massive", "Air Traffic Only", "Massive"],
    ["Dynamic Social Simulation", "Static Env.", "Math Logic", "No Demand", "Real-time"]
  ];

  try {
    const response = await fetch("./assets/商业分析素材/竞品对比：三维范式转变 - 竞品对比：三维范式转变.csv");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    const rows = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseCsvLine);

    if (rows.length < 2) throw new Error("CSV has no body rows");
    renderBusinessCompetitionTable(rows);
  } catch (error) {
    console.warn("Failed to load business competition CSV, using fallback table.", error);
    renderBusinessCompetitionTable(fallbackRows);
  }
}

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
  const nextIndex = clampIndex(index, insightSteps.length);
  const current = insightSteps[nextIndex];

  insightIndex = nextIndex;
  toggleActiveState(insightButtons, insightIndex);
  insightTrack.style.transform = `translateY(-${(insightIndex * 100) / insightSteps.length}%)`;

  if (instant || prevIndex === nextIndex) {
    renderInsightText(current);
    return;
  }

  const direction = getInsightDirection(prevIndex, nextIndex, insightSteps.length);
  animateInsightText(current, direction);
}

function getCurrentSlide() {
  if (!slides.length) return null;
  return slides[Math.max(0, Math.min(activeIndex, slides.length - 1))] || null;
}

function buildVizSeriesData() {
  const lineData = [];
  const scatterData = [];
  const totalPoints = 260;

  for (let i = 0; i < totalPoints; i += 1) {
    const t = i * 0.18;
    const radius = 16 + i * 0.24;
    const x = Math.cos(t) * radius;
    const y = Math.sin(t) * radius;
    const z = -40 + i * 0.42 + Math.sin(t * 1.8) * 4.5;

    lineData.push([x, y, z]);

    if (i % 4 === 0) {
      scatterData.push([x, y, z, i / totalPoints]);
    }
  }

  return { lineData, scatterData };
}

function bindChartDomInteractions(chartDom) {
  if (!chartDom) return;

  chartDom.addEventListener(
    "wheel",
    (event) => {
      event.stopPropagation();
    },
    { passive: false }
  );

  chartDom.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

function resizeCharts() {
  if (compareChart) compareChart.resize();
  if (vizChart) vizChart.resize();
}

const debouncedResizeCharts = debounce(resizeCharts, CONFIG.CHART_RESIZE_DEBOUNCE_MS);

function createTooltipOption(formatter) {
  return {
    backgroundColor: "rgba(7, 14, 24, 0.92)",
    borderColor: "rgba(114, 164, 255, 0.26)",
    borderWidth: 1,
    textStyle: {
      color: "#e9f2ff",
      fontSize: 12
    },
    formatter
  };
}

function createGrid3D(config) {
  return {
    show: true,
    boxWidth: config.boxWidth,
    boxDepth: config.boxDepth,
    boxHeight: config.boxHeight,
    environment: "transparent",
    viewControl: {
      projection: "perspective",
      alpha: config.alpha,
      beta: config.beta,
      distance: config.distance,
      minDistance: config.minDistance,
      maxDistance: config.maxDistance,
      rotateSensitivity: config.rotateSensitivity,
      zoomSensitivity: config.zoomSensitivity,
      panSensitivity: config.panSensitivity,
      rotateMouseButton: "left",
      panMouseButton: "right",
      autoRotate: false
    },
    light: {
      main: {
        intensity: config.mainLightIntensity,
        alpha: config.mainLightAlpha,
        beta: config.mainLightBeta
      },
      ambient: {
        intensity: config.ambientLightIntensity
      }
    }
  };
}

function createAxis3D(axisConfig) {
  return {
    type: "value",
    name: axisConfig.name,
    min: axisConfig.min,
    max: axisConfig.max,
    interval: axisConfig.interval,
    nameTextStyle: axisConfig.nameTextStyle,
    axisLine: {
      lineStyle: axisConfig.axisLineStyle
    },
    axisLabel: axisConfig.axisLabel,
    splitLine: {
      show: true,
      lineStyle: axisConfig.splitLineStyle
    }
  };
}

function initCompareChart() {
  if (!compareChartDom || typeof echarts === "undefined") return;

  const compareNodes = [
    {
      name: "AirSim",
      value: [88, 28, 18],
      itemStyle: {
        color: "#66d8ff",
        borderColor: "rgba(214, 242, 255, 0.52)",
        borderWidth: 1
      }
    },
    {
      name: "AnyLogic",
      value: [34, 94, 24],
      itemStyle: {
        color: "#ffd166",
        borderColor: "rgba(255, 236, 190, 0.52)",
        borderWidth: 1
      }
    },
    {
      name: "NASA UTM",
      value: [18, 44, 34],
      itemStyle: {
        color: "#97adc6",
        borderColor: "rgba(221, 234, 248, 0.42)",
        borderWidth: 1
      }
    }
  ];

  const highlightedNode = {
    name: "AirGroundLAB",
    value: [94, 96, 88],
    itemStyle: {
      color: "#43f3a6",
      borderColor: "rgba(240, 255, 248, 0.92)",
      borderWidth: 2
    }
  };

  const allCompareNodes = [...compareNodes, highlightedNode];

  const linkSeries = allCompareNodes.map((node) => ({
    name: `${node.name} Link`,
    type: "line3D",
    data: [
      [0, 0, 0],
      node.value
    ],
    silent: true,
    tooltip: {
      show: false
    },
    lineStyle: {
      width: node.name === "AirGroundLAB" ? 5 : 2.5,
      color: node.itemStyle.color,
      opacity: node.name === "AirGroundLAB" ? 0.92 : 0.45
    }
  }));

  compareChart = echarts.init(compareChartDom, null, { renderer: "canvas" });

  compareChart.setOption({
    backgroundColor: "transparent",
    tooltip: createTooltipOption((params) => {
      if (!params.data || !params.data.value) return params.seriesName;
      const [x, y, z] = params.data.value;
      return [
        `<strong>${params.data.name}</strong>`,
        `Physical Fidelity: ${x}`,
        `Logistics Scale: ${y}`,
        `Social Dynamics: ${z}`
      ].join("<br/>");
    }),
    animationDuration: 1500,
    animationEasing: "cubicOut",
    grid3D: createGrid3D({
      boxWidth: 140,
      boxDepth: 140,
      boxHeight: 100,
      alpha: 20,
      beta: 36,
      distance: 235,
      minDistance: 140,
      maxDistance: 340,
      rotateSensitivity: 1.1,
      zoomSensitivity: 1.05,
      panSensitivity: 1.05,
      mainLightIntensity: 1.05,
      mainLightAlpha: 42,
      mainLightBeta: 28,
      ambientLightIntensity: 0.58
    }),
    xAxis3D: createAxis3D({
      name: "X Physical Fidelity",
      min: 0,
      max: 100,
      interval: 20,
      nameTextStyle: {
        color: "rgba(100, 216, 255, 0.96)",
        fontSize: 15,
        fontWeight: 700
      },
      axisLineStyle: {
        color: "rgba(100, 216, 255, 0.85)",
        width: 3
      },
      axisLabel: {
        color: "rgba(218, 247, 255, 0.96)",
        fontSize: 13,
        fontWeight: 700
      },
      splitLineStyle: {
        color: "rgba(145, 178, 225, 0.22)",
        width: 1
      }
    }),
    yAxis3D: createAxis3D({
      name: "Y Logistics Scale",
      min: 0,
      max: 100,
      interval: 20,
      nameTextStyle: {
        color: "rgba(255, 209, 102, 0.98)",
        fontSize: 15,
        fontWeight: 700
      },
      axisLineStyle: {
        color: "rgba(255, 209, 102, 0.85)",
        width: 3
      },
      axisLabel: {
        color: "rgba(255, 241, 199, 0.98)",
        fontSize: 13,
        fontWeight: 700
      },
      splitLineStyle: {
        color: "rgba(145, 178, 225, 0.22)",
        width: 1
      }
    }),
    zAxis3D: createAxis3D({
      name: "Z Social Dynamics",
      min: 0,
      max: 100,
      interval: 20,
      nameTextStyle: {
        color: "rgba(255, 138, 101, 0.98)",
        fontSize: 15,
        fontWeight: 700
      },
      axisLineStyle: {
        color: "rgba(255, 138, 101, 0.85)",
        width: 3
      },
      axisLabel: {
        color: "rgba(255, 221, 210, 0.98)",
        fontSize: 13,
        fontWeight: 700
      },
      splitLineStyle: {
        color: "rgba(145, 178, 225, 0.22)",
        width: 1
      }
    }),
    series: [
      ...linkSeries,
      {
        name: "Capability Nodes",
        type: "scatter3D",
        data: compareNodes,
        symbolSize: 14,
        label: {
          show: true,
          formatter(params) {
            return params.data.name;
          },
          color: "#ecf7ff",
          fontSize: 12,
          backgroundColor: "rgba(7, 18, 30, 0.74)",
          borderColor: "rgba(132, 184, 255, 0.18)",
          borderWidth: 1,
          borderRadius: 999,
          padding: [6, 10]
        },
        emphasis: {
          label: {
            color: "#ffffff"
          },
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2
          }
        }
      },
      {
        name: "AirGroundLAB Glow",
        type: "scatter3D",
        data: [highlightedNode],
        silent: true,
        tooltip: {
          show: false
        },
        symbolSize: 38,
        itemStyle: {
          color: "#43f3a6",
          opacity: 0.16
        }
      },
      {
        name: "AirGroundLAB Highlight",
        type: "scatter3D",
        data: [highlightedNode],
        symbolSize: 24,
        label: {
          show: true,
          formatter() {
            return "{project|AirGroundLAB}";
          },
          rich: {
            project: {
              color: "#f2fff8",
              fontSize: 13,
              fontWeight: 800,
              backgroundColor: "rgba(5, 26, 17, 0.48)",
              borderColor: "rgba(67, 243, 166, 0.42)",
              borderWidth: 1,
              borderRadius: 999,
              padding: [7, 12],
              shadowBlur: 28,
              shadowColor: "rgba(67, 243, 166, 0.34)",
              textShadowBlur: 24,
              textShadowColor: "rgba(132, 255, 208, 0.98)",
              textShadowOffsetX: 0,
              textShadowOffsetY: 0
            }
          }
        },
        emphasis: {
          label: {
            formatter() {
              return "{project|AirGroundLAB}";
            }
          },
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2.5
          }
        }
      }
    ]
  });

  bindChartDomInteractions(compareChartDom);
}

function initVizChart() {
  if (!vizChartDom || typeof echarts === "undefined") return;

  const { lineData, scatterData } = buildVizSeriesData();
  vizChart = echarts.init(vizChartDom, null, { renderer: "canvas" });

  vizChart.setOption({
    backgroundColor: "transparent",
    tooltip: createTooltipOption((params) => {
      const value = params.value;
      return [
        params.seriesName,
        `X: ${Number(value[0]).toFixed(2)}`,
        `Y: ${Number(value[1]).toFixed(2)}`,
        `Z: ${Number(value[2]).toFixed(2)}`
      ].join("<br/>");
    }),
    animationDuration: 1800,
    animationEasing: "cubicOut",
    grid3D: createGrid3D({
      boxWidth: 170,
      boxDepth: 170,
      boxHeight: 120,
      alpha: 22,
      beta: 36,
      distance: 210,
      minDistance: 120,
      maxDistance: 320,
      rotateSensitivity: 1.1,
      zoomSensitivity: 1.15,
      panSensitivity: 1.05,
      mainLightIntensity: 1,
      mainLightAlpha: 40,
      mainLightBeta: 35,
      ambientLightIntensity: 0.55
    }),
    xAxis3D: createAxis3D({
      name: "X Axis",
      min: -90,
      max: 90,
      interval: 30,
      nameTextStyle: {
        color: "rgba(229, 239, 255, 0.88)",
        fontSize: 14
      },
      axisLineStyle: {
        color: "rgba(135, 178, 255, 0.72)",
        width: 2
      },
      axisLabel: {
        color: "rgba(220, 232, 255, 0.72)",
        fontSize: 12
      },
      splitLineStyle: {
        color: "rgba(145, 178, 225, 0.18)",
        width: 1
      }
    }),
    yAxis3D: createAxis3D({
      name: "Y Axis",
      min: -90,
      max: 90,
      interval: 30,
      nameTextStyle: {
        color: "rgba(229, 239, 255, 0.88)",
        fontSize: 14
      },
      axisLineStyle: {
        color: "rgba(135, 178, 255, 0.72)",
        width: 2
      },
      axisLabel: {
        color: "rgba(220, 232, 255, 0.72)",
        fontSize: 12
      },
      splitLineStyle: {
        color: "rgba(145, 178, 225, 0.18)",
        width: 1
      }
    }),
    zAxis3D: createAxis3D({
      name: "Z Axis",
      min: -50,
      max: 80,
      interval: 15,
      nameTextStyle: {
        color: "rgba(229, 239, 255, 0.88)",
        fontSize: 14
      },
      axisLineStyle: {
        color: "rgba(135, 178, 255, 0.72)",
        width: 2
      },
      axisLabel: {
        color: "rgba(220, 232, 255, 0.72)",
        fontSize: 12
      },
      splitLineStyle: {
        color: "rgba(145, 178, 225, 0.18)",
        width: 1
      }
    }),
    series: [
      {
        name: "Spiral Line",
        type: "line3D",
        data: lineData,
        blendMode: "lighter",
        lineStyle: {
          width: 4,
          color: "#59d6ff",
          opacity: 0.95
        }
      },
      {
        name: "Spiral Nodes",
        type: "scatter3D",
        data: scatterData,
        symbolSize(value) {
          return 7 + value[3] * 8;
        },
        itemStyle: {
          color: "#c7f4ff",
          opacity: 0.95,
          borderColor: "rgba(95, 214, 255, 0.45)",
          borderWidth: 1
        },
        emphasis: {
          itemStyle: {
            color: "#ffffff",
            borderColor: "#6ce2ff",
            borderWidth: 2
          }
        }
      }
    ]
  });

  bindChartDomInteractions(vizChartDom);
}

if (deck) {
  updateDeckScale();
  syncResponsiveState();

  deck.addEventListener(
    "wheel",
    (event) => {
      if (coarsePointerMedia.matches) return;
      if (event.target instanceof Element && event.target.closest(".echarts-wheel-zone")) return;
      event.preventDefault();
      if (wheelLock) return;
      if (Math.abs(event.deltaY) < CONFIG.DECK_WHEEL_MIN_DELTA) return;

      wheelLock = true;
      goToSlide(activeIndex + (event.deltaY > 0 ? 1 : -1));
      window.setTimeout(() => {
        wheelLock = false;
      }, CONFIG.DECK_WHEEL_LOCK_MS);
    },
    { passive: false }
  );

  deck.addEventListener("scroll", detectActiveSlide, { passive: true });
}

window.addEventListener(
  "resize",
  () => {
    updateDeckScale();
    syncResponsiveState();
    detectActiveSlide();
  },
  { passive: true }
);

window.addEventListener("keydown", (event) => {
  if (isTextInputLike(event.target)) return;

  if (["ArrowLeft", "ArrowRight"].includes(event.code)) {
    const currentSlide = getCurrentSlide();
    if (currentSlide && !currentSlide.hidden) {
      const activeSwitcher = getSlideSwitcherById(currentSlide.id);

      if (activeSwitcher) {
        event.preventDefault();
        if (event.code === "ArrowRight") {
          activeSwitcher.next();
        } else {
          activeSwitcher.prev();
        }
        return;
      }
    }
  }

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
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      fadeObserver.unobserve(entry.target);
    });
  },
  { threshold: CONFIG.FADE_OBSERVER_THRESHOLD }
);

fadeNodes.forEach((node) => fadeObserver.observe(node));

const moduleSwitcher = createCyclicSwitcher({
  buttons: moduleButtons,
  getIndex: () => moduleIndex,
  setIndex: setModulePanel
});

const featureSwitcher = createCyclicSwitcher({
  buttons: featureButtons,
  getIndex: () => featureIndex,
  setIndex: setFeaturePanel
});

const businessSwitcher = {
  prev() {
    setBusinessPanel(businessIndex - 1);
  },
  next() {
    setBusinessPanel(businessIndex + 1);
  }
};

const insightSwitcher = createCyclicSwitcher({
  buttons: insightButtons,
  getIndex: () => insightIndex,
  setIndex: setInsightStep
});

if (moduleStage && modulePanels.length) {
  bindTouchSwitch(moduleStage, "x", CONFIG.TOUCH_SWITCH_X_THRESHOLD, (delta) => {
    if (delta < 0) {
      moduleSwitcher.next();
      return;
    }
    moduleSwitcher.prev();
  });
}

if (featureStage && featurePanels.length) {
  bindTouchSwitch(featureStage, "x", CONFIG.TOUCH_SWITCH_X_THRESHOLD, (delta) => {
    if (delta < 0) {
      featureSwitcher.next();
      return;
    }
    featureSwitcher.prev();
  });
}

if (businessStage && businessPanels.length) {
  bindTouchSwitch(businessStage, "x", CONFIG.TOUCH_SWITCH_X_THRESHOLD, (delta) => {
    if (delta < 0) {
      businessSwitcher.next();
      return;
    }
    businessSwitcher.prev();
  });
}

if (businessPrevButton) {
  businessPrevButton.addEventListener("click", () => businessSwitcher.prev());
}

if (businessNextButton) {
  businessNextButton.addEventListener("click", () => businessSwitcher.next());
}

if (insightStage) {
  insightStage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (insightWheelLock) return;
      if (Math.abs(event.deltaY) < CONFIG.INSIGHT_WHEEL_MIN_DELTA) return;

      insightWheelLock = true;
      if (event.deltaY > 0) {
        insightSwitcher.next();
      } else {
        insightSwitcher.prev();
      }
      window.setTimeout(() => {
        insightWheelLock = false;
      }, CONFIG.INSIGHT_WHEEL_LOCK_MS);
    },
    { passive: false }
  );

  bindTouchSwitch(insightStage, "y", CONFIG.TOUCH_SWITCH_Y_THRESHOLD, (delta) => {
    if (delta < 0) {
      insightSwitcher.next();
      return;
    }
    insightSwitcher.prev();
  });
}

setModulePanel(0);
setFeaturePanel(0);
setBusinessPanel(0);
setInsightStep(0, { instant: true });
loadBusinessCompetitionTable();

initCompareChart();
initVizChart();

initPager();
updatePager(activeIndex);

if (autoScrollToggle) {
  autoScrollToggle.addEventListener("change", syncAutoScrollState);
  syncAutoScrollState();
}

window.addEventListener("visibilitychange", () => {
  if (!autoScrollToggle) return;
  if (document.hidden) {
    stopAutoScroll();
    return;
  }
  syncAutoScrollState();
});

window.addEventListener("resize", debouncedResizeCharts, { passive: true });
