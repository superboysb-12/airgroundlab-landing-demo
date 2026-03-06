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
const autoScrollToggle = document.getElementById("auto-scroll-toggle");
const compareChartDom = document.getElementById("compare-chart3d");
const vizChartDom = document.getElementById("viz-chart3d");

let activeIndex = 0;
let wheelLock = false;
let featureIndex = 0;
let insightIndex = 0;
let insightTouchStartY = 0;
let insightWheelLock = false;
let insightTextToken = 0;
let autoScrollTimer = null;
let compareChart = null;
let vizChart = null;

const AUTO_SCROLL_INTERVAL_MS = 5000;
const COMPACT_LAYOUT_QUERY = "(max-width: 1180px), (max-height: 720px)";

function isCompactLayout() {
  return window.matchMedia(COMPACT_LAYOUT_QUERY).matches;
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
}

function stopAutoScroll() {
  if (!autoScrollTimer) return;
  window.clearInterval(autoScrollTimer);
  autoScrollTimer = null;
}

function startAutoScroll() {
  stopAutoScroll();
  if (!slides.length) return;
  autoScrollTimer = window.setInterval(() => {
    goToSlide((activeIndex + 1) % slides.length);
  }, AUTO_SCROLL_INTERVAL_MS);
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

if (deck) {
  updateDeckScale();
  syncResponsiveState();

  // Desktop wheel is quantized to one full slide per interaction.
  deck.addEventListener(
    "wheel",
    (event) => {
      if (window.matchMedia("(pointer: coarse)").matches) return;
      if (event.target instanceof Element && event.target.closest(".echarts-wheel-zone")) return;
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
    tooltip: {
      backgroundColor: "rgba(7, 14, 24, 0.92)",
      borderColor: "rgba(114, 164, 255, 0.26)",
      borderWidth: 1,
      textStyle: {
        color: "#e9f2ff",
        fontSize: 12
      },
      formatter(params) {
        if (!params.data || !params.data.value) return params.seriesName;
        const [x, y, z] = params.data.value;
        return [
          `<strong>${params.data.name}</strong>`,
          `Physical Fidelity: ${x}`,
          `Logistics Scale: ${y}`,
          `Social Dynamics: ${z}`
        ].join("<br/>");
      }
    },
    animationDuration: 1500,
    animationEasing: "cubicOut",
    grid3D: {
      show: true,
      boxWidth: 140,
      boxDepth: 140,
      boxHeight: 100,
      environment: "transparent",
      viewControl: {
        projection: "perspective",
        alpha: 20,
        beta: 36,
        distance: 235,
        minDistance: 140,
        maxDistance: 340,
        rotateSensitivity: 1.1,
        zoomSensitivity: 1.05,
        panSensitivity: 1.05,
        rotateMouseButton: "left",
        panMouseButton: "right",
        autoRotate: false
      },
      light: {
        main: {
          intensity: 1.05,
          alpha: 42,
          beta: 28
        },
        ambient: {
          intensity: 0.58
        }
      }
    },
    xAxis3D: {
      type: "value",
      name: "X Physical Fidelity",
      min: 0,
      max: 100,
      interval: 20,
      nameTextStyle: {
        color: "rgba(100, 216, 255, 0.96)",
        fontSize: 15,
        fontWeight: 700
      },
      axisLine: {
        lineStyle: {
          color: "rgba(100, 216, 255, 0.85)",
          width: 3
        }
      },
      axisLabel: {
        color: "rgba(218, 247, 255, 0.96)",
        fontSize: 13,
        fontWeight: 700
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(145, 178, 225, 0.22)",
          width: 1
        }
      }
    },
    yAxis3D: {
      type: "value",
      name: "Y Logistics Scale",
      min: 0,
      max: 100,
      interval: 20,
      nameTextStyle: {
        color: "rgba(255, 209, 102, 0.98)",
        fontSize: 15,
        fontWeight: 700
      },
      axisLine: {
        lineStyle: {
          color: "rgba(255, 209, 102, 0.85)",
          width: 3
        }
      },
      axisLabel: {
        color: "rgba(255, 241, 199, 0.98)",
        fontSize: 13,
        fontWeight: 700
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(145, 178, 225, 0.22)",
          width: 1
        }
      }
    },
    zAxis3D: {
      type: "value",
      name: "Z Social Dynamics",
      min: 0,
      max: 100,
      interval: 20,
      nameTextStyle: {
        color: "rgba(255, 138, 101, 0.98)",
        fontSize: 15,
        fontWeight: 700
      },
      axisLine: {
        lineStyle: {
          color: "rgba(255, 138, 101, 0.85)",
          width: 3
        }
      },
      axisLabel: {
        color: "rgba(255, 221, 210, 0.98)",
        fontSize: 13,
        fontWeight: 700
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(145, 178, 225, 0.22)",
          width: 1
        }
      }
    },
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

  const option = {
    /* =========================
       背景色：修改这里
       图表本体背景设为透明，实际视觉主背景由页面 CSS 控制；
       如果你希望图表区域单独换底色，可以修改这里的 backgroundColor。
       ========================= */
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "rgba(7, 14, 24, 0.92)",
      borderColor: "rgba(114, 164, 255, 0.26)",
      borderWidth: 1,
      textStyle: {
        color: "#e9f2ff",
        fontSize: 12
      },
      formatter(params) {
        const value = params.value;
        return [
          params.seriesName,
          `X: ${Number(value[0]).toFixed(2)}`,
          `Y: ${Number(value[1]).toFixed(2)}`,
          `Z: ${Number(value[2]).toFixed(2)}`
        ].join("<br/>");
      }
    },
    animationDuration: 1800,
    animationEasing: "cubicOut",
    grid3D: {
      show: true,
      boxWidth: 170,
      boxDepth: 170,
      boxHeight: 120,
      environment: "transparent",

      /* =========================
         鼠标交互参数：修改这里
         alpha / beta：初始观察角度
         distance：初始观察距离
         rotateMouseButton：左键旋转
         panMouseButton：右键平移
         zoomSensitivity：滚轮缩放灵敏度
         ========================= */
      viewControl: {
        projection: "perspective",
        alpha: 22,
        beta: 36,
        distance: 210,
        minDistance: 120,
        maxDistance: 320,
        rotateSensitivity: 1.1,
        zoomSensitivity: 1.15,
        panSensitivity: 1.05,
        rotateMouseButton: "left",
        panMouseButton: "right",
        autoRotate: false
      },
      light: {
        main: {
          intensity: 1,
          alpha: 40,
          beta: 35
        },
        ambient: {
          intensity: 0.55
        }
      }
    },
    xAxis3D: {
      type: "value",
      name: "X Axis",
      min: -90,
      max: 90,
      interval: 30,

      /* =========================
         坐标轴颜色：修改这里
         axisLine 控制坐标轴线颜色
         axisLabel 控制刻度文字颜色
         splitLine 控制三维网格线颜色
         xAxis3D / yAxis3D / zAxis3D 三处都可以分别调整
         ========================= */
      nameTextStyle: {
        color: "rgba(229, 239, 255, 0.88)",
        fontSize: 14
      },
      axisLine: {
        lineStyle: {
          color: "rgba(135, 178, 255, 0.72)",
          width: 2
        }
      },
      axisLabel: {
        color: "rgba(220, 232, 255, 0.72)",
        fontSize: 12
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(145, 178, 225, 0.18)",
          width: 1
        }
      }
    },
    yAxis3D: {
      type: "value",
      name: "Y Axis",
      min: -90,
      max: 90,
      interval: 30,
      nameTextStyle: {
        color: "rgba(229, 239, 255, 0.88)",
        fontSize: 14
      },
      axisLine: {
        lineStyle: {
          color: "rgba(135, 178, 255, 0.72)",
          width: 2
        }
      },
      axisLabel: {
        color: "rgba(220, 232, 255, 0.72)",
        fontSize: 12
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(145, 178, 225, 0.18)",
          width: 1
        }
      }
    },
    zAxis3D: {
      type: "value",
      name: "Z Axis",
      min: -50,
      max: 80,
      interval: 15,
      nameTextStyle: {
        color: "rgba(229, 239, 255, 0.88)",
        fontSize: 14
      },
      axisLine: {
        lineStyle: {
          color: "rgba(135, 178, 255, 0.72)",
          width: 2
        }
      },
      axisLabel: {
        color: "rgba(220, 232, 255, 0.72)",
        fontSize: 12
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(145, 178, 225, 0.18)",
          width: 1
        }
      }
    },
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
  };

  vizChart.setOption(option);
  bindChartDomInteractions(vizChartDom);
}

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

window.addEventListener("resize", resizeCharts, { passive: true });

