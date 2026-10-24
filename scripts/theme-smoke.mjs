import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_URL = process.env.THEME_TEST_URL || "http://localhost:3000";
const PORT = 9333;
const THEMES = ["midnight", "ocean", "ember", "orchid", "daylight"];
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBrowser() {
  const browser = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!browser) throw new Error("Chrome or Edge was not found. Set CHROME_PATH to run this test.");
  return browser;
}

async function connect() {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((response) => response.json());
      const page = pages.find((entry) => entry.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (error) {
      lastError = error;
    }
    await sleep(120);
  }
  throw new Error(`Chrome debugging endpoint did not start${lastError ? `: ${lastError.message}` : ""}`);
}

async function openCdp(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  const exceptions = [];
  const consoleProblems = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      exceptions.push(message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && ["warning", "error"].includes(message.params.type)) {
      consoleProblems.push(message.params.args.map((argument) => argument.value ?? argument.description ?? argument.type).join(" "));
    }
    if (message.method === "Log.entryAdded" && ["warning", "error"].includes(message.params.entry.level)) {
      consoleProblems.push(`${message.params.entry.level}: ${message.params.entry.text}`);
    }
    for (const listener of listeners.get(message.method) || []) listener(message.params);
  });

  return {
    exceptions,
    consoleProblems,
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    once(method) {
      return new Promise((resolve) => {
        const handler = (params) => {
          listeners.set(method, (listeners.get(method) || []).filter((item) => item !== handler));
          resolve(params);
        };
        listeners.set(method, [...(listeners.get(method) || []), handler]);
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(cdp, expression, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(cdp, expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const browserPath = findBrowser();
const profileDir = await mkdtemp(join(tmpdir(), "dropdesk-theme-smoke-"));
const screenshotDir = await mkdtemp(join(tmpdir(), "dropdesk-theme-screenshots-"));
const browser = spawn(browserPath, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
], { stdio: "ignore", windowsHide: true });

let cdp;
try {
  cdp = await openCdp(await connect());
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: APP_URL });
  await loaded;
  await waitFor(cdp, "Boolean(document.querySelector('.theme-picker-trigger'))", "theme picker");

  for (const theme of THEMES) {
    await evaluate(cdp, "document.querySelector('.theme-picker-trigger').click()");
    await waitFor(cdp, `Boolean(document.querySelector('[data-theme-id="${theme}"]'))`, `${theme} option`);
    const optionCount = await evaluate(cdp, "document.querySelectorAll('[data-theme-id]').length");
    if (optionCount !== THEMES.length) {
      throw new Error(`Expected ${THEMES.length} theme options, found ${optionCount}`);
    }
    await evaluate(cdp, `document.querySelector('[data-theme-id="${theme}"]').click()`);
    await waitFor(cdp, `document.documentElement.dataset.theme === "${theme}"`, `${theme} activation`);
    await sleep(240);

    const result = await evaluate(cdp, `(() => {
      const root = document.documentElement;
      const landing = document.querySelector('.landing-page');
      const style = getComputedStyle(landing);
      const probe = document.createElement('div');
      probe.innerHTML = '<aside class="sidebar"></aside><header class="topbar"></header><section class="panel"></section><div class="modal"></div>';
      document.body.appendChild(probe);
      const workspaceSurfaces = ['.sidebar', '.topbar', '.panel', '.modal'].map(selector => getComputedStyle(probe.querySelector(selector)).backgroundColor);
      probe.remove();
      return {
        theme: root.dataset.theme,
        tone: root.dataset.tone,
        saved: localStorage.getItem('dropdesk-theme'),
        menuClosed: !document.querySelector('.theme-picker-menu'),
        landingBackground: style.backgroundColor,
        landingColor: style.color,
        ctaBackground: getComputedStyle(document.querySelector('.landing-button-dark')).backgroundColor,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        workspaceSurfaces
      };
    })()`);

    if (result.theme !== theme || result.saved !== theme || !result.menuClosed) {
      throw new Error(`${theme} did not activate or persist correctly: ${JSON.stringify(result)}`);
    }
    if (result.landingBackground === "rgba(0, 0, 0, 0)" || result.landingColor === "rgba(0, 0, 0, 0)") {
      throw new Error(`${theme} left the landing surface unstyled: ${JSON.stringify(result)}`);
    }
    if (result.workspaceSurfaces.some((color) => color === "rgba(0, 0, 0, 0)")) {
      throw new Error(`${theme} left a workspace surface unstyled: ${JSON.stringify(result)}`);
    }
    if (theme !== "daylight" && result.workspaceSurfaces[0] === result.landingBackground) {
      throw new Error(`${theme} did not give the workspace a distinct surface: ${JSON.stringify(result)}`);
    }

    const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(join(screenshotDir, `${theme}.png`), Buffer.from(screenshot.data, "base64"));
    console.log(`PASS ${theme}: ${result.landingBackground} on ${result.landingColor}; CTA ${result.ctaBackground}`);
  }

  const reloaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.reload", { ignoreCache: true });
  await reloaded;
  await waitFor(cdp, "Boolean(document.querySelector('.theme-picker-trigger'))", "reloaded theme picker");
  const persisted = await evaluate(cdp, `({
    theme: document.documentElement.dataset.theme,
    tone: document.documentElement.dataset.tone,
    saved: localStorage.getItem('dropdesk-theme')
  })`);
  if (persisted.theme !== "daylight" || persisted.tone !== "light" || persisted.saved !== "daylight") {
    throw new Error(`Theme did not survive reload: ${JSON.stringify(persisted)}`);
  }
  console.log("PASS persisted theme after reload: daylight");
  await evaluate(cdp, "document.querySelector('.theme-picker-trigger').click()");
  await waitFor(cdp, "Boolean(document.querySelector('.theme-picker-menu'))", "theme menu screenshot");
  const menuScreenshot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(join(screenshotDir, "theme-picker.png"), Buffer.from(menuScreenshot.data, "base64"));

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const mobileLoaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.reload", { ignoreCache: true });
  await mobileLoaded;
  await waitFor(cdp, "Boolean(document.querySelector('.landing-demo-link'))", "mobile landing actions");
  const mobileLanding = await evaluate(cdp, `(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    actions: Array.from(document.querySelectorAll('.landing-hero-actions > *')).map(action => {
      const rect = action.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    }),
    navActions: Array.from(document.querySelectorAll('.landing-nav-actions > *')).map(action => {
      const rect = action.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    })
  }))()`);
  const allLandingActions = [...mobileLanding.actions, ...mobileLanding.navActions];
  if (mobileLanding.documentWidth > mobileLanding.viewport + 1 || allLandingActions.some((action) => action.left < -1 || action.right > mobileLanding.viewport + 1)) {
    throw new Error(`Mobile landing actions overflow the viewport: ${JSON.stringify(mobileLanding)}`);
  }
  await evaluate(cdp, "document.querySelector('.theme-picker-trigger').click()");
  await waitFor(cdp, "Boolean(document.querySelector('.theme-picker-menu'))", "mobile theme menu");
  const mobileMenu = await evaluate(cdp, `(() => {
    const rect = document.querySelector('.theme-picker-menu').getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
  })()`);
  if (mobileMenu.left < 0 || mobileMenu.right > mobileMenu.width + 1 || mobileMenu.top < 0 || mobileMenu.bottom > mobileMenu.height + 1) {
    throw new Error(`Mobile theme menu overflows the viewport: ${JSON.stringify(mobileMenu)}`);
  }
  const mobileScreenshot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(join(screenshotDir, "landing-mobile.png"), Buffer.from(mobileScreenshot.data, "base64"));
  console.log("PASS mobile landing: actions and theme picker stay within the viewport");

  if (cdp.exceptions.length) {
    throw new Error(`Browser exceptions: ${cdp.exceptions.join(" | ")}`);
  }
  if (cdp.consoleProblems.length) {
    console.log(`Browser warnings: ${cdp.consoleProblems.join(" | ")}`);
  }
  console.log(`Screenshots: ${screenshotDir}`);
} finally {
  cdp?.close();
  browser.kill();
  await sleep(250);
  await rm(profileDir, { recursive: true, force: true });
}
