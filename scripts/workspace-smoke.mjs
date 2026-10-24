import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_URL = process.env.WORKSPACE_TEST_URL || "http://localhost:3000";
const PORT = 9334;
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
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((response) => response.json());
      const page = pages.find((entry) => entry.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(120);
  }
  throw new Error("Chrome debugging endpoint did not start");
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
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
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
  const response = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(cdp, expression, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(cdp, expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function clickSelector(cdp, selector) {
  const clicked = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.click();
    return true;
  })()`);
  assert(clicked, `Could not click ${selector}`);
}

async function clickText(cdp, selector, text) {
  const clicked = await evaluate(cdp, `(() => {
    const match = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find((element) => {
      const style = getComputedStyle(element);
      return element.textContent.trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())})
        && style.display !== 'none'
        && style.visibility !== 'hidden';
    });
    if (!match) return false;
    match.click();
    return true;
  })()`);
  assert(clicked, `Could not find a visible ${selector} containing "${text}"`);
}

async function setField(cdp, selector, value) {
  const updated = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  assert(updated, `Could not update ${selector}`);
}

async function capture(cdp, screenshotDir, name) {
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(join(screenshotDir, name), Buffer.from(screenshot.data, "base64"));
}

async function modalSnapshot(cdp) {
  return evaluate(cdp, `(() => {
    const modal = document.querySelector('.modal');
    if (!modal) return null;
    const rect = modal.getBoundingClientRect();
    return {
      title: modal.querySelector('h2')?.textContent.trim() || '',
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      scrollHeight: modal.scrollHeight,
      clientHeight: modal.clientHeight,
      bodyLocked: document.body.style.overflow === 'hidden',
      role: modal.getAttribute('role'),
      ariaModal: modal.getAttribute('aria-modal')
    };
  })()`);
}

async function assertModal(cdp, title, label) {
  await waitFor(cdp, "Boolean(document.querySelector('.modal h2'))", `${label} modal`);
  const snapshot = await modalSnapshot(cdp);
  assert(snapshot, `${label} modal is missing`);
  assert(snapshot.title.toLowerCase().includes(title.toLowerCase()), `${label} opened "${snapshot.title}" instead of "${title}"`);
  assert(snapshot.left >= 0 && snapshot.right <= snapshot.viewportWidth + 1, `${label} modal overflows horizontally: ${JSON.stringify(snapshot)}`);
  assert(snapshot.top >= 0 && snapshot.bottom <= snapshot.viewportHeight + 1, `${label} modal overflows vertically: ${JSON.stringify(snapshot)}`);
  assert(snapshot.bodyLocked, `${label} modal did not lock background scrolling`);
  assert(snapshot.role === "dialog" && snapshot.ariaModal === "true", `${label} modal is missing dialog semantics`);
  return snapshot;
}

async function closeModal(cdp) {
  await clickSelector(cdp, ".modal-close");
  await waitFor(cdp, "!document.querySelector('.modal')", "modal to close");
}

async function assertViewport(cdp, label) {
  const layout = await evaluate(cdp, `({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  })`);
  assert(layout.documentWidth <= layout.viewport + 1, `${label} has page-level horizontal overflow: ${JSON.stringify(layout)}`);
}

const browserPath = findBrowser();
const profileDir = await mkdtemp(join(tmpdir(), "dropdesk-workspace-smoke-"));
const screenshotDir = await mkdtemp(join(tmpdir(), "dropdesk-workspace-screenshots-"));
const csvPath = join(profileDir, "inventory-notes.csv");
await writeFile(csvPath, "SKU,Product,Note\nSKU-1001,Espresso maker,Restock weekly\nSKU-1002,Travel mug,Check supplier\n");
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
  await cdp.send("DOM.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: APP_URL });
  await loaded;
  await waitFor(cdp, "Boolean(document.querySelector('.landing-demo-link'))", "demo entry");
  await clickSelector(cdp, ".landing-demo-link");
  await waitFor(cdp, "Boolean(document.querySelector('.app-shell'))", "preview workspace");
  await assertViewport(cdp, "Desktop overview");
  await capture(cdp, screenshotDir, "01-desktop-empty-overview.png");

  await clickText(cdp, "button", "Add client");
  const clientModal = await assertModal(cdp, "Add a client", "Add client");
  await capture(cdp, screenshotDir, "02-desktop-add-client.png");
  await evaluate(cdp, "document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
  await waitFor(cdp, "!document.querySelector('.modal')", "Escape to close Add client");
  await clickText(cdp, "button", "Add client");
  await assertModal(cdp, "Add a client", "Reopened client");
  await setField(cdp, ".modal .modal-input", "Avery Stone");
  await clickSelector(cdp, ".modal .modal-submit");
  await waitFor(cdp, "!document.querySelector('.modal') && Boolean(document.querySelector('.client-link'))", "client creation");
  assert(clientModal.scrollHeight <= clientModal.clientHeight, "Add client modal unexpectedly scrolls on desktop");
  await waitFor(cdp, "Boolean(document.querySelector('.client-setup'))", "empty client setup");
  await capture(cdp, screenshotDir, "03-desktop-client-setup.png");

  await clickText(cdp, ".client-setup-option", "Product hunting");
  await waitFor(cdp, "Boolean(document.querySelector('.data-table-wrap'))", "Product hunting table");
  await clickText(cdp, "button.primary", "Add product");
  await assertModal(cdp, "Add product idea", "Product");
  await capture(cdp, screenshotDir, "04-desktop-product-modal.png");
  await setField(cdp, "#product-name", "Portable Espresso Maker");
  await setField(cdp, "#product-source-link", "https://www.aliexpress.com/item/100500123456.html");
  await setField(cdp, "#product-ebay-link", "https://www.ebay.com/itm/123456789");
  await setField(cdp, "#supplier-cost", "14.50");
  await setField(cdp, "#ebay-price", "39.99");
  await clickSelector(cdp, ".modal .modal-submit");
  await waitFor(cdp, "Boolean(document.querySelector('.data-table tbody tr'))", "product row");

  await clickSelector(cdp, ".data-table tbody tr:first-child .row-more");
  await waitFor(cdp, "Boolean(document.querySelector('.row-menu'))", "row menu");
  await clickText(cdp, ".row-menu button", "Edit row");
  await assertModal(cdp, "Edit row", "Product edit");
  await capture(cdp, screenshotDir, "05-desktop-edit-product.png");
  await setField(cdp, "#edit-title", "Portable Espresso Maker Pro");
  await clickText(cdp, ".modal button.primary", "Save changes");
  await waitFor(cdp, "!document.querySelector('.modal') && Array.from(document.querySelectorAll('.title-input')).some(input => input.value === 'Portable Espresso Maker Pro')", "saved product edit");

  await clickSelector(cdp, ".add-table-tab");
  await assertModal(cdp, "Import a CSV", "CSV import");
  await capture(cdp, screenshotDir, "06-desktop-import-modal.png");
  await setField(cdp, "#import-table-name", "Inventory notes");
  const documentNode = await cdp.send("DOM.getDocument");
  const fileNode = await cdp.send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: ".csv-picker input[type=file]" });
  assert(fileNode.nodeId, "CSV file input was not found");
  await cdp.send("DOM.setFileInputFiles", { nodeId: fileNode.nodeId, files: [csvPath] });
  await waitFor(cdp, "document.body.innerText.includes('inventory-notes.csv')", "CSV filename");
  await clickText(cdp, ".modal button.primary", "Import and create table");
  await waitFor(cdp, "document.body.innerText.includes('Inventory notes') && Array.from(document.querySelectorAll('.custom-cell-input')).some(input => input.value === 'SKU-1001')", "imported custom table");
  await assertViewport(cdp, "Desktop custom table");

  await clickText(cdp, ".sheet-tabs button", "Listings");
  await clickText(cdp, "button.primary", "Add listing");
  await assertModal(cdp, "Add listing", "Listing");
  await capture(cdp, screenshotDir, "07-desktop-listing-modal.png");
  await setField(cdp, "#listing-title", "Portable Espresso Maker — Cream");
  await setField(cdp, "#listing-source-link", "https://www.aliexpress.com/item/100500123456.html");
  await clickSelector(cdp, ".modal .modal-submit");
  await waitFor(cdp, "!document.querySelector('.modal') && Array.from(document.querySelectorAll('.title-input')).some(input => input.value === 'Portable Espresso Maker — Cream')", "listing creation");

  await clickText(cdp, ".sheet-tabs button", "Orders");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 756, height: 619, deviceScaleFactor: 1, mobile: false });
  await clickText(cdp, "button.primary", "Add order");
  const orderModal = await assertModal(cdp, "Add order", "Order");
  const orderForm = await evaluate(cdp, `(() => {
    const form = document.querySelector('.order-edit-form');
    const modal = document.querySelector('.modal');
    const heading = modal.querySelector('h2');
    const modalRect = modal.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    return {
      overflowY: getComputedStyle(form).overflowY,
      scrollHeight: form.scrollHeight,
      clientHeight: form.clientHeight,
      modalRect: { left: modalRect.left, right: modalRect.right, top: modalRect.top },
      formRect: { left: formRect.left, right: formRect.right },
      headingRect: { left: headingRect.left, right: headingRect.right },
      modalScrollLeft: modal.scrollLeft,
      modalScrollWidth: modal.scrollWidth,
      modalClientWidth: modal.clientWidth
    };
  })()`);
  assert(orderModal.scrollHeight <= orderModal.clientHeight, `Order modal still needs nested scrolling at the reported viewport: ${JSON.stringify(orderModal)}`);
  assert(orderForm.overflowY === "visible", `Order form still creates a nested scroll container: ${JSON.stringify(orderForm)}`);
  await capture(cdp, screenshotDir, "08-desktop-order-modal.png");
  await setField(cdp, "#order-orderId", "05-22010-77881");
  await setField(cdp, "#order-item", "Portable Espresso Maker — Cream");
  await setField(cdp, "#order-sourceId", "100500123456");
  await setField(cdp, "#order-tracking", "USPS 9400100000000000000000");
  await setField(cdp, "#order-subtotal", "59.99");
  await setField(cdp, "#order-transFee", "7.80");
  await setField(cdp, "#order-postage", "4.25");
  await setField(cdp, "#order-cost", "22.40");
  await clickSelector(cdp, ".modal .modal-submit");
  await waitFor(cdp, "!document.querySelector('.modal') && document.body.innerText.includes('05-22010-77881') && document.body.innerText.includes('TOTAL PROFIT')", "order creation");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const orderGrid = await evaluate(cdp, `(() => {
    const header = document.querySelector('.data-table thead tr');
    const row = document.querySelector('.data-table tbody tr');
    return {
      headers: header.children.length,
      visibleCells: Array.from(row.children).filter(cell => getComputedStyle(cell).display !== 'none').length
    };
  })()`);
  assert(orderGrid.headers === orderGrid.visibleCells, `Orders table header and row widths differ: ${JSON.stringify(orderGrid)}`);
  await assertViewport(cdp, "Desktop orders table");
  await capture(cdp, screenshotDir, "09-desktop-orders.png");

  await clickSelector(cdp, ".settings-link");
  await waitFor(cdp, "Boolean(document.querySelector('.settings-page'))", "settings page");
  await assertViewport(cdp, "Desktop settings");
  await capture(cdp, screenshotDir, "10-desktop-settings.png");
  await clickText(cdp, ".settings-actions button", "Edit");
  await assertModal(cdp, "Client settings", "Client settings");
  await capture(cdp, screenshotDir, "11-desktop-client-settings.png");
  await setField(cdp, "#client-settings-store", "Stone Supply Co.");
  await clickText(cdp, ".modal button.primary", "Save changes");
  await waitFor(cdp, "!document.querySelector('.modal') && document.body.innerText.includes('Stone Supply Co.')", "client settings save");

  await clickText(cdp, ".settings-actions button", "Delete");
  await assertModal(cdp, "Delete Avery Stone", "Delete client");
  await capture(cdp, screenshotDir, "12-desktop-delete-modal.png");
  await clickText(cdp, ".modal button", "Keep client");
  await waitFor(cdp, "!document.querySelector('.modal')", "delete cancellation");

  await clickSelector(cdp, ".invite-nav");
  await assertModal(cdp, "Invite a teammate", "Invite");
  await capture(cdp, screenshotDir, "13-desktop-invite-modal.png");
  await clickText(cdp, ".modal button", "Cancel");
  await waitFor(cdp, "!document.querySelector('.modal')", "invite cancellation");

  await clickText(cdp, ".guest-cta", "Create free account");
  await assertModal(cdp, "Create your Dropdesk account", "Auth");
  await capture(cdp, screenshotDir, "14-desktop-auth-modal.png");
  await closeModal(cdp);

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await clickText(cdp, ".nav-link", "Overview");
  await waitFor(cdp, "document.body.innerText.includes('Your clients')", "mobile overview");
  await assertViewport(cdp, "Mobile overview");
  await capture(cdp, screenshotDir, "20-mobile-overview.png");

  await clickSelector(cdp, ".nav-toggle");
  await waitFor(cdp, "Boolean(document.querySelector('.sidebar.nav-open'))", "mobile navigation drawer");
  await sleep(300);
  await capture(cdp, screenshotDir, "21-mobile-navigation.png");
  await clickText(cdp, ".workspace-table-menu .nav-link", "Product hunting");
  await sleep(300);
  await waitFor(cdp, "Boolean(document.querySelector('.data-table-wrap'))", "mobile product table");
  await assertViewport(cdp, "Mobile product table");
  const tableMetrics = await evaluate(cdp, `(() => {
    const wrapper = document.querySelector('.data-table-wrap');
    return { clientWidth: wrapper.clientWidth, scrollWidth: wrapper.scrollWidth, right: wrapper.getBoundingClientRect().right };
  })()`);
  assert(tableMetrics.scrollWidth > tableMetrics.clientWidth, "Product table should scroll inside its wrapper on mobile");
  assert(tableMetrics.right <= 391, `Product table wrapper escapes the viewport: ${JSON.stringify(tableMetrics)}`);
  await capture(cdp, screenshotDir, "22-mobile-product-table.png");

  await clickText(cdp, "button.primary", "Add product");
  await assertModal(cdp, "Add product idea", "Mobile product");
  await capture(cdp, screenshotDir, "23-mobile-product-modal.png");
  await closeModal(cdp);
  await clickSelector(cdp, ".data-table tbody tr:first-child .row-more");
  await clickText(cdp, ".row-menu button", "Edit row");
  await assertModal(cdp, "Edit row", "Mobile row edit");
  await closeModal(cdp);
  await clickSelector(cdp, ".add-table-tab");
  await assertModal(cdp, "Import a CSV", "Mobile import");
  await closeModal(cdp);

  await clickText(cdp, ".sheet-tabs button", "Listings");
  await clickText(cdp, "button.primary", "Add listing");
  await assertModal(cdp, "Add listing", "Mobile listing");
  await closeModal(cdp);
  await clickText(cdp, ".sheet-tabs button", "Orders");
  await clickText(cdp, "button.primary", "Add order");
  await assertModal(cdp, "Add order", "Mobile order");
  await capture(cdp, screenshotDir, "24-mobile-order-modal.png");
  await closeModal(cdp);
  await assertViewport(cdp, "Mobile orders table");
  await capture(cdp, screenshotDir, "25-mobile-orders.png");

  await clickSelector(cdp, ".settings-link");
  await assertViewport(cdp, "Mobile settings");
  await capture(cdp, screenshotDir, "26-mobile-settings.png");
  await clickText(cdp, ".settings-actions button", "Edit");
  await assertModal(cdp, "Client settings", "Mobile client settings");
  await closeModal(cdp);
  await clickText(cdp, ".settings-actions button", "Delete");
  await assertModal(cdp, "Delete Avery Stone", "Mobile delete");
  await clickText(cdp, ".modal button", "Keep client");
  await waitFor(cdp, "!document.querySelector('.modal')", "mobile delete cancellation");
  await clickSelector(cdp, ".invite-nav");
  await assertModal(cdp, "Invite a teammate", "Mobile invite");
  await closeModal(cdp);
  await clickText(cdp, ".guest-cta", "Create free account");
  await assertModal(cdp, "Create your Dropdesk account", "Mobile auth");
  await closeModal(cdp);

  await clickText(cdp, ".nav-link", "Overview");
  await clickText(cdp, "button.primary", "Add client");
  await assertModal(cdp, "Add a client", "Mobile add client");
  await closeModal(cdp);

  assert(!cdp.exceptions.length, `Browser exceptions: ${cdp.exceptions.join(" | ")}`);
  const significantWarnings = cdp.consoleProblems.filter((message) => !message.includes("favicon"));
  assert(!significantWarnings.length, `Browser warnings: ${significantWarnings.join(" | ")}`);
  console.log("PASS desktop: overview, product, custom import, listings, orders, settings");
  console.log("PASS desktop modals: client, product, edit, import, listing, order, settings, delete, invite, auth");
  console.log("PASS mobile: drawer, overview, tables, horizontal overflow containment, all 10 modals");
  console.log(`Screenshots: ${screenshotDir}`);
} finally {
  cdp?.close();
  browser.kill();
  await sleep(250);
  await rm(profileDir, { recursive: true, force: true });
}
