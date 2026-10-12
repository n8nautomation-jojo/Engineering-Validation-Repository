// PharmaTech Desktop POS Interactive Controller
// Adheres strictly to Clinical Enterprise UI/UX Specification v1.0, FEFO, Offline Allocation Safety, and Multi-Payment invariants

const CATALOG_DATA = [
  {
    id: "prod-001",
    sku: "MED-AMX-500",
    barcode: "6291100123456",
    name: "Amoxicillin 500mg Capsules",
    nameAr: "أموكسيسيلين",
    strength: "500 مجم",
    dosageForm: "كبسولات فموية",
    category: "Antibiotics",
    categoryAr: "مضاد حيوي",
    unit: "علبة (20 كبسولة)",
    price: 3200.00,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BAT-2027-A", expiryDate: "2027-08-01", availableQuantity: 50 },
      { batchNumber: "BAT-2026-B", expiryDate: "2026-11-15", availableQuantity: 25 }, // FEFO first
      { batchNumber: "BAT-2025-OLD", expiryDate: "2025-01-01", availableQuantity: 10 } // Expired
    ]
  },
  {
    id: "prod-002",
    sku: "MED-PAN-EXT",
    barcode: "6291100987654",
    name: "Panadol Extra Tablets",
    nameAr: "بنادول إكسترا",
    strength: "500 مجم + 65 كافيين",
    dosageForm: "أقراص مغلفة",
    category: "Analgesics",
    categoryAr: "مسكن وخافض حرارة",
    unit: "شريط (24 قرص)",
    price: 1800.00,
    prescriptionRequired: false,
    batches: [
      { batchNumber: "BAT-PAN-2027", expiryDate: "2027-04-10", availableQuantity: 120 }
    ]
  },
  {
    id: "prod-003",
    sku: "MED-MET-500",
    barcode: "6291100456789",
    name: "Metformin 500mg Tablets",
    nameAr: "ميتفورمين (منظم سكر)",
    strength: "500 مجم",
    dosageForm: "أقراص صيدلانية",
    category: "Chronic",
    categoryAr: "أمراض مزمنة",
    unit: "علبة (50 قرص)",
    price: 4500.00,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BAT-MET-2026", expiryDate: "2026-12-30", availableQuantity: 40 }
    ]
  },
  {
    id: "prod-004",
    sku: "MED-OME-020",
    barcode: "6291100554433",
    name: "Omeprazole 20mg Capsules",
    nameAr: "أوميبرازول للمعدة",
    strength: "20 مجم",
    dosageForm: "كبسولات مقاومة للحموضة",
    category: "Chronic",
    categoryAr: "أمراض مزمنة",
    unit: "علبة (14 كبسولة)",
    price: 2900.00,
    prescriptionRequired: false,
    batches: [
      { batchNumber: "BAT-OME-2027", expiryDate: "2027-06-20", availableQuantity: 30 }
    ]
  },
  {
    id: "prod-005",
    sku: "MED-VEN-INH",
    barcode: "6291100778899",
    name: "Ventolin Evohaler 100mcg",
    nameAr: "بخاخ فنتولين",
    strength: "100 ميكروجرام / بخة",
    dosageForm: "مستنشق موسع للشعب",
    category: "Chronic",
    categoryAr: "أمراض مزمنة",
    unit: "بخاخ (200 جرعة)",
    price: 6800.00,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BAT-VEN-2027", expiryDate: "2027-09-01", availableQuantity: 18 }
    ]
  },
  {
    id: "prod-006",
    sku: "MED-VIT-C1K",
    barcode: "6291100112233",
    name: "Vitamin C 1000mg Effervescent",
    nameAr: "فيتامين سي فوار",
    strength: "1000 مجم",
    dosageForm: "أقراص فوارة سريعة الامتصاص",
    category: "Vitamins",
    categoryAr: "فيتامينات ومكملات",
    unit: "أنبوبة (20 قرص)",
    price: 2100.00,
    prescriptionRequired: false,
    batches: [
      { batchNumber: "BAT-VIT-2027", expiryDate: "2027-10-15", availableQuantity: 65 }
    ]
  }
];

// POS State
const state = {
  cart: [],
  isOffline: false,
  offlineAllocation: {
    total: 100,
    consumed: 15,
    remaining: 85
  },
  currentCategory: "ALL",
  activePaymentMethod: "CASH",
  lastCompletedSale: null
};

// Barcode scanner deduplication guard (300ms window)
let lastScannedBarcode = null;
let lastScannedTimestamp = 0;
const SCANNER_DEDUPLICATION_WINDOW_MS = 300;

// Search debounce timer
let searchDebounceTimer = null;

// DOM Elements
const productsGrid = document.getElementById("products-grid");
const cartList = document.getElementById("cart-list");
const emptyCartMsg = document.getElementById("empty-cart-msg");
const cartItemsCount = document.getElementById("cart-items-count");
const subtotalDisplay = document.getElementById("subtotal-display");
const taxDisplay = document.getElementById("tax-display");
const grandTotalDisplay = document.getElementById("grand-total-display");
const openPaymentModalBtn = document.getElementById("open-payment-modal-btn");
const btnPayAmount = document.getElementById("btn-pay-amount");
const clearCartBtn = document.getElementById("clear-cart-btn");
const searchInput = document.getElementById("product-search-input");
const simulateScanBtn = document.getElementById("simulate-scan-btn");
const categoryChips = document.getElementById("category-chips");

const networkStatusBadge = document.getElementById("network-status-badge");
const networkDot = document.getElementById("network-dot");
const networkText = document.getElementById("network-text");
const toggleOfflineBtn = document.getElementById("toggle-offline-btn");
const allocationCount = document.getElementById("allocation-count");
const meterBarFill = document.getElementById("meter-bar-fill");

// Payment Modal Elements
const paymentModal = document.getElementById("payment-modal");
const closePaymentModalBtn = document.getElementById("close-payment-modal-btn");
const cancelPaymentBtn = document.getElementById("cancel-payment-btn");
const confirmSaleBtn = document.getElementById("confirm-sale-btn");
const modalDueTotal = document.getElementById("modal-due-total");
const modalRemainingTotal = document.getElementById("modal-remaining-total");

const tabCashBtn = document.getElementById("tab-cash-btn");
const tabBankakBtn = document.getElementById("tab-bankak-btn");
const tabSplitBtn = document.getElementById("tab-split-btn");

const cashPanel = document.getElementById("cash-panel");
const bankakPanel = document.getElementById("bankak-panel");
const splitPanel = document.getElementById("split-panel");

const cashReceivedInput = document.getElementById("cash-received-input");
const cashChangeAmount = document.getElementById("cash-change-amount");

const transferAmountInput = document.getElementById("transfer-amount-input");
const transferRefInput = document.getElementById("transfer-ref-input");

const splitCashInput = document.getElementById("split-cash-input");
const splitTransferInput = document.getElementById("split-transfer-input");
const splitRefInput = document.getElementById("split-ref-input");

// Receipt Modal Elements
const receiptModal = document.getElementById("receipt-modal");
const closeReceiptModalBtn = document.getElementById("close-receipt-modal-btn");
const newSaleBtn = document.getElementById("new-sale-btn");
const printReceiptBtn = document.getElementById("print-receipt-btn");
const receiptInvoiceNum = document.getElementById("receipt-invoice-num");
const receiptDatetime = document.getElementById("receipt-datetime");
const receiptItemsBody = document.getElementById("receipt-items-body");
const receiptTotalVal = document.getElementById("receipt-total-val");
const receiptPaymentMethod = document.getElementById("receipt-payment-method");

// --- Helper Functions ---
function formatCurrency(val) {
  return `${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SDG`;
}

function getFefoBatch(product) {
  const now = new Date().toISOString().split("T")[0];
  const validBatches = product.batches
    .filter(b => b.availableQuantity > 0 && b.expiryDate >= now)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  return validBatches[0] || null;
}

function getFilteredProducts() {
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  return CATALOG_DATA.filter(prod => {
    const matchesCategory = state.currentCategory === "ALL" || prod.category === state.currentCategory;
    const matchesQuery = !query || 
      prod.name.toLowerCase().includes(query) ||
      prod.nameAr.includes(query) ||
      prod.barcode.includes(query) ||
      prod.sku.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
}

// --- Render Products (Strict 4-Level Clinical Hierarchy) ---
function renderProducts() {
  if (!productsGrid) return;
  productsGrid.innerHTML = "";

  const filtered = getFilteredProducts();

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 3rem 1rem; background: var(--surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-default);">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 38px; height: 38px; margin: 0 auto 10px; color: var(--text-muted); display: block;" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <strong style="display:block; font-size: 1rem; color: var(--text-primary); margin-bottom: 4px;">لم يتم العثور على أدوية مطابقة للبحث</strong>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">تحقق من اسم الدواء أو الباركود المدخل أو جرب اختيار "كافة الأدوية".</p>
      </div>
    `;
    return;
  }

  filtered.forEach(prod => {
    const fefoBatch = getFefoBatch(prod);
    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("id", `card-${prod.id}`);
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${prod.nameAr} - ${prod.strength || ""} - السعر ${prod.price} جنيه`);

    // Level 4: Category & SKU
    const catLabel = prod.categoryAr || prod.category;
    const fefoHtml = fefoBatch ? 
      `<span class="fefo-pill" title="صلاحية التشغيلة حتى ${fefoBatch.expiryDate}"><span aria-hidden="true">●</span> FEFO: ${fefoBatch.batchNumber}</span>` :
      `<span class="fefo-pill expired">غير متوفر</span>`;

    const availableQty = fefoBatch ? fefoBatch.availableQuantity : 0;

    card.innerHTML = `
      <div class="card-header-row">
        <span class="card-cat-tag">${catLabel}</span>
        <span class="card-sku-code" dir="ltr">${prod.sku}</span>
      </div>

      <div class="card-body-content">
        <div class="prod-name-ar">${prod.nameAr}</div>
        <div class="prod-strength-form">${prod.strength || ""} — ${prod.dosageForm || prod.unit}</div>
        <div class="prod-name-en" dir="ltr">${prod.name}</div>
      </div>

      <div class="card-footer-section">
        <div class="card-meta-indicators">
          ${fefoHtml}
          <span class="stock-indicator">المتوفر: <strong>${availableQty}</strong></span>
        </div>
        <div class="card-price-action-row">
          <div class="prod-final-price" dir="ltr">
            ${Number(prod.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            <small>SDG</small>
          </div>
          <button class="btn-card-add" type="button" aria-label="إضافة ${prod.nameAr} إلى السلة">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor" style="width:14px;height:14px;" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>إضافة</span>
          </button>
        </div>
      </div>
    `;

    // Interactive Selection
    card.addEventListener("click", () => addProductToCart(prod));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        addProductToCart(prod);
      }
    });

    productsGrid.appendChild(card);
  });
}

// --- Cart Operations ---
function addProductToCart(product) {
  const fefoBatch = getFefoBatch(product);
  if (!fefoBatch) {
    alert(`عذراً: لا توجد تشغيلة صالحة وغير منتهية الصلاحية من الدواء (${product.nameAr})`);
    return;
  }

  // Check offline quota (ADR-011)
  if (state.isOffline) {
    const currentUnits = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (currentUnits + 1 > state.offlineAllocation.remaining) {
      alert("تنبيه أمان: تم استنفاد حصة البيع دون اتصال المعتمدة لهذا الجهاز! يُرجى إعادة المزامنة مع الخادم.");
      return;
    }
  }

  const existing = state.cart.find(item => item.productId === product.id && item.batchNumber === fefoBatch.batchNumber);
  if (existing) {
    if (existing.quantity + 1 > fefoBatch.availableQuantity) {
      alert(`الكمية المطلوبة تتجاوز الرصيد المتوفر للتشغيلة (${fefoBatch.availableQuantity})`);
      return;
    }
    existing.quantity += 1;
    existing.lineTotal = existing.quantity * product.price;
  } else {
    state.cart.push({
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      sku: product.sku,
      batchNumber: fefoBatch.batchNumber,
      expiryDate: fefoBatch.expiryDate,
      unitPrice: product.price,
      quantity: 1,
      lineTotal: product.price
    });
  }

  updateCartView();
}

function updateCartView() {
  if (!cartList) return;
  cartList.innerHTML = "";

  const totalQuantity = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartItemsCount) {
    cartItemsCount.textContent = totalQuantity;
  }

  if (state.cart.length === 0) {
    if (emptyCartMsg) emptyCartMsg.style.display = "flex";
    if (openPaymentModalBtn) openPaymentModalBtn.disabled = true;
    if (subtotalDisplay) subtotalDisplay.textContent = "0.00 SDG";
    if (grandTotalDisplay) grandTotalDisplay.textContent = "0.00 SDG";
    if (btnPayAmount) btnPayAmount.textContent = "0.00 SDG";
    return;
  }

  if (emptyCartMsg) emptyCartMsg.style.display = "none";
  if (openPaymentModalBtn) openPaymentModalBtn.disabled = false;

  let grandTotal = 0;
  state.cart.forEach((item, index) => {
    grandTotal += item.lineTotal;
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item-header">
        <span class="cart-item-title">${item.nameAr}</span>
        <button class="btn-remove-item" data-index="${index}" title="حذف الصنف من السلة" aria-label="حذف الصنف من السلة">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 15px; height: 15px;" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="cart-item-batch-info" dir="ltr">Batch: ${item.batchNumber} | Exp: ${item.expiryDate}</div>
      <div class="cart-item-actions">
        <div class="qty-stepper">
          <button class="stepper-btn" data-action="dec" data-index="${index}" aria-label="تقليل الكمية">-</button>
          <span class="qty-val" dir="ltr">${item.quantity}</span>
          <button class="stepper-btn" data-action="inc" data-index="${index}" aria-label="زيادة الكمية">+</button>
        </div>
        <span class="cart-item-price" dir="ltr">${formatCurrency(item.lineTotal)}</span>
      </div>
    `;

    // Increment
    li.querySelector(`button[data-action="inc"]`).addEventListener("click", (e) => {
      e.stopPropagation();
      const prod = CATALOG_DATA.find(p => p.id === item.productId);
      if (prod) addProductToCart(prod);
    });

    // Decrement
    li.querySelector(`button[data-action="dec"]`).addEventListener("click", (e) => {
      e.stopPropagation();
      if (item.quantity > 1) {
        item.quantity -= 1;
        item.lineTotal = item.quantity * item.unitPrice;
      } else {
        state.cart.splice(index, 1);
      }
      updateCartView();
    });

    // Remove
    li.querySelector(".btn-remove-item").addEventListener("click", (e) => {
      e.stopPropagation();
      state.cart.splice(index, 1);
      updateCartView();
    });

    cartList.appendChild(li);
  });

  const formattedTotal = formatCurrency(grandTotal);
  if (subtotalDisplay) subtotalDisplay.textContent = formattedTotal;
  if (grandTotalDisplay) grandTotalDisplay.textContent = formattedTotal;
  if (btnPayAmount) btnPayAmount.textContent = formattedTotal;
}

// --- Barcode Scanner Handling with Deduplication Guard ---
function processBarcodeScan(barcode) {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return;

  const now = Date.now();
  if (lastScannedBarcode === cleanBarcode && (now - lastScannedTimestamp) < SCANNER_DEDUPLICATION_WINDOW_MS) {
    // Deduplicate bounce
    return;
  }
  lastScannedBarcode = cleanBarcode;
  lastScannedTimestamp = now;

  const matched = CATALOG_DATA.find(p => 
    p.barcode === cleanBarcode || 
    p.sku.toLowerCase() === cleanBarcode.toLowerCase()
  );

  if (matched) {
    addProductToCart(matched);
    if (searchInput) {
      searchInput.value = "";
      renderProducts();
      searchInput.focus();
    }
  } else {
    // If not direct barcode, trigger filtered search
    renderProducts();
  }
}

// --- Payment Handlers ---
function openPaymentModal() {
  const total = state.cart.reduce((sum, item) => sum + item.lineTotal, 0);
  modalDueTotal.textContent = formatCurrency(total);
  modalRemainingTotal.textContent = formatCurrency(total);

  cashReceivedInput.value = total;
  transferAmountInput.value = total;
  splitCashInput.value = Math.floor(total / 2);
  splitTransferInput.value = total - Math.floor(total / 2);

  updateCashChange();
  paymentModal.classList.remove("hidden");
}

function closePaymentModal() {
  paymentModal.classList.add("hidden");
}

function updateCashChange() {
  const total = state.cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const received = parseFloat(cashReceivedInput.value) || 0;
  const change = Math.max(0, received - total);
  cashChangeAmount.textContent = formatCurrency(change);
  
  if (received < total) {
    modalRemainingTotal.textContent = formatCurrency(total - received);
    modalRemainingTotal.className = "color-warning";
  } else {
    modalRemainingTotal.textContent = "0.00 SDG (مكتمل)";
    modalRemainingTotal.className = "";
  }
}

function confirmSale() {
  const total = state.cart.reduce((sum, item) => sum + item.lineTotal, 0);
  let paymentMethodDesc = "نقد (Cash)";

  if (state.activePaymentMethod === "CASH") {
    const received = parseFloat(cashReceivedInput.value) || 0;
    if (received < total) {
      alert(`المبلغ المستلم (${received} SDG) أقل من إجمالي الفاتورة (${total} SDG)`);
      return;
    }
  } else if (state.activePaymentMethod === "BANK_TRANSFER") {
    const ref = transferRefInput.value.trim();
    if (!ref) {
      alert("يُرجى إدخال رقم إشعار التحويل البنكي للمطابقة المرجعية");
      return;
    }
    paymentMethodDesc = `تحويل بنكي / بنكك (مرجع: ${ref})`;
  } else if (state.activePaymentMethod === "SPLIT") {
    const c = parseFloat(splitCashInput.value) || 0;
    const t = parseFloat(splitTransferInput.value) || 0;
    if (Math.abs((c + t) - total) > 0.1) {
      alert(`مجموع الدفع المجزأ (${c + t} SDG) يجب أن يطابق تماماً إجمالي الفاتورة (${total} SDG)`);
      return;
    }
    paymentMethodDesc = `دفع مجزأ (${c} SDG نقد + ${t} SDG بنكك)`;
  }

  // Deduct from offline quota if offline (ADR-011)
  if (state.isOffline) {
    const units = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    state.offlineAllocation.consumed += units;
    state.offlineAllocation.remaining -= units;
    allocationCount.textContent = `${state.offlineAllocation.remaining} / ${state.offlineAllocation.total}`;
    meterBarFill.style.width = `${(state.offlineAllocation.remaining / state.offlineAllocation.total) * 100}%`;
  }

  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  state.lastCompletedSale = {
    invoiceNumber,
    datetime: new Date().toLocaleString("ar-SD"),
    items: [...state.cart],
    total,
    paymentMethod: paymentMethodDesc
  };

  closePaymentModal();
  showReceipt(state.lastCompletedSale);
  state.cart = [];
  updateCartView();
}

function showReceipt(sale) {
  receiptInvoiceNum.textContent = `فاتورة: ${sale.invoiceNumber}`;
  receiptDatetime.textContent = sale.datetime;
  receiptPaymentMethod.textContent = sale.paymentMethod;
  receiptTotalVal.textContent = formatCurrency(sale.total);

  receiptItemsBody.innerHTML = "";
  sale.items.forEach(i => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i.nameAr}<br><small style="color:var(--text-muted); font-family:var(--font-en);">(${i.batchNumber})</small></td>
      <td dir="ltr">${i.quantity}</td>
      <td dir="ltr">${formatCurrency(i.unitPrice)}</td>
      <td dir="ltr">${formatCurrency(i.lineTotal)}</td>
    `;
    receiptItemsBody.appendChild(tr);
  });

  receiptModal.classList.remove("hidden");
}

// --- Event Listeners with Debounce and Shortcut Support ---
if (searchInput) {
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(renderProducts, 120);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = searchInput.value.trim();
      if (!val) return;

      const exactMatch = CATALOG_DATA.find(p => 
        p.barcode === val || 
        p.sku.toLowerCase() === val.toLowerCase()
      );

      if (exactMatch) {
        processBarcodeScan(exactMatch.barcode);
      } else {
        const filtered = getFilteredProducts();
        if (filtered.length === 1) {
          addProductToCart(filtered[0]);
          searchInput.value = "";
          renderProducts();
          searchInput.focus();
        }
      }
    }
  });
}

if (simulateScanBtn) {
  simulateScanBtn.addEventListener("click", () => {
    processBarcodeScan("6291100123456");
  });
}

if (clearCartBtn) {
  clearCartBtn.addEventListener("click", () => {
    if (state.cart.length === 0) return;
    if (confirm("هل تريد بالتأكيد إفراغ كافة الأصناف من السلة الحالية؟")) {
      state.cart = [];
      updateCartView();
    }
  });
}

if (categoryChips) {
  categoryChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      categoryChips.querySelectorAll(".chip").forEach(c => {
        c.classList.remove("active");
        c.setAttribute("aria-selected", "false");
      });
      chip.classList.add("active");
      chip.setAttribute("aria-selected", "true");
      state.currentCategory = chip.dataset.category;
      renderProducts();
    }
  });
}

if (toggleOfflineBtn) {
  toggleOfflineBtn.addEventListener("click", () => {
    state.isOffline = !state.isOffline;
    if (state.isOffline) {
      networkDot.className = "status-dot offline";
      networkText.textContent = "غير متصل (Offline Mode)";
      toggleOfflineBtn.textContent = "استعادة الاتصال";
    } else {
      networkDot.className = "status-dot online";
      networkText.textContent = "متصل (Online)";
      toggleOfflineBtn.textContent = "محاكاة أوفلاين";
    }
  });
}

if (openPaymentModalBtn) openPaymentModalBtn.addEventListener("click", openPaymentModal);
if (closePaymentModalBtn) closePaymentModalBtn.addEventListener("click", closePaymentModal);
if (cancelPaymentBtn) cancelPaymentBtn.addEventListener("click", closePaymentModal);
if (confirmSaleBtn) confirmSaleBtn.addEventListener("click", confirmSale);

if (cashReceivedInput) cashReceivedInput.addEventListener("input", updateCashChange);

if (tabCashBtn) {
  tabCashBtn.addEventListener("click", () => {
    state.activePaymentMethod = "CASH";
    [tabCashBtn, tabBankakBtn, tabSplitBtn].forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    tabCashBtn.classList.add("active");
    tabCashBtn.setAttribute("aria-selected", "true");
    cashPanel.classList.remove("hidden");
    bankakPanel.classList.add("hidden");
    splitPanel.classList.add("hidden");
    updateCashChange();
  });
}

if (tabBankakBtn) {
  tabBankakBtn.addEventListener("click", () => {
    state.activePaymentMethod = "BANK_TRANSFER";
    [tabCashBtn, tabBankakBtn, tabSplitBtn].forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    tabBankakBtn.classList.add("active");
    tabBankakBtn.setAttribute("aria-selected", "true");
    cashPanel.classList.add("hidden");
    bankakPanel.classList.remove("hidden");
    splitPanel.classList.add("hidden");
    modalRemainingTotal.textContent = "0.00 SDG (مطابق)";
    modalRemainingTotal.className = "";
  });
}

if (tabSplitBtn) {
  tabSplitBtn.addEventListener("click", () => {
    state.activePaymentMethod = "SPLIT";
    [tabCashBtn, tabBankakBtn, tabSplitBtn].forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    tabSplitBtn.classList.add("active");
    tabSplitBtn.setAttribute("aria-selected", "true");
    cashPanel.classList.add("hidden");
    bankakPanel.classList.add("hidden");
    splitPanel.classList.remove("hidden");
  });
}

if (closeReceiptModalBtn) closeReceiptModalBtn.addEventListener("click", () => receiptModal.classList.add("hidden"));
if (newSaleBtn) newSaleBtn.addEventListener("click", () => receiptModal.classList.add("hidden"));
if (printReceiptBtn) {
  printReceiptBtn.addEventListener("click", () => {
    window.print();
  });
}

// Global Keyboard Shortcut: Escape to close modals
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (paymentModal && !paymentModal.classList.contains("hidden")) {
      closePaymentModal();
    }
    if (receiptModal && !receiptModal.classList.contains("hidden")) {
      receiptModal.classList.add("hidden");
    }
  }
});

// Theme Toggle Logic (Clinical Light Default vs Dark Mode)
const posThemeToggleBtn = document.getElementById("pos-theme-toggle-btn");
const themeTextLabel = document.getElementById("theme-text-label");

function setPosTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pharmatech-theme", theme);
  if (themeTextLabel) {
    themeTextLabel.textContent = theme === "dark" ? "الوضع الليلي" : "النهاري المريح";
  }
}

function initPosTheme() {
  const savedTheme = localStorage.getItem("pharmatech-theme") || "light";
  setPosTheme(savedTheme);
}

if (posThemeToggleBtn) {
  posThemeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    setPosTheme(next);
  });
}

// Initial Setup
initPosTheme();
renderProducts();
updateCartView();
