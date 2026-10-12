// PharmaTech Desktop POS Interactive Controller
// Adheres strictly to FEFO, Offline Allocation Safety, and Multi-Payment invariants

const CATALOG_DATA = [
  {
    id: "prod-001",
    sku: "MED-AMX-500",
    barcode: "6291100123456",
    name: "Amoxicillin 500mg Capsules",
    nameAr: "أموكسيسيلين 500 مجم كبسولات",
    category: "Antibiotics",
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
    nameAr: "بنادول إكسترا أقراص",
    category: "Analgesics",
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
    nameAr: "ميتفورمين 500 مجم (منظم سكر)",
    category: "Chronic",
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
    nameAr: "أوميبرازول 20 مجم للمعدة",
    category: "Chronic",
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
    nameAr: "بخاخ فنتولين موسع للشعب",
    category: "Chronic",
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
    nameAr: "فيتامين سي فوار 1000 مجم",
    category: "Vitamins",
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

// DOM Elements
const productsGrid = document.getElementById("products-grid");
const cartList = document.getElementById("cart-list");
const emptyCartMsg = document.getElementById("empty-cart-msg");
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

// --- Render Products ---
function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  productsGrid.innerHTML = "";

  const filtered = CATALOG_DATA.filter(prod => {
    const matchesCategory = state.currentCategory === "ALL" || prod.category === state.currentCategory;
    const matchesQuery = !query || 
      prod.name.toLowerCase().includes(query) ||
      prod.nameAr.includes(query) ||
      prod.barcode.includes(query) ||
      prod.sku.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  if (filtered.length === 0) {
    productsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 2rem;">لم يتم العثور على أدوية مطابقة لبحثك</div>`;
    return;
  }

  filtered.forEach(prod => {
    const fefoBatch = getFefoBatch(prod);
    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("id", `card-${prod.id}`);

    const badgeHtml = fefoBatch ? 
      `<span class="fefo-badge" title="صالح حتى ${fefoBatch.expiryDate}">FEFO: ${fefoBatch.batchNumber}</span>` :
      `<span class="fefo-badge expiring-soon">غير متوفر</span>`;

    card.innerHTML = `
      ${badgeHtml}
      <div>
        <span class="product-sku">${prod.sku} | ${prod.barcode}</span>
        <h3>${prod.nameAr}</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${prod.name}</p>
      </div>
      <div class="product-meta-row">
        <span class="stock-tag">المتوفر: ${fefoBatch ? fefoBatch.availableQuantity : 0} ${prod.unit}</span>
        <span class="product-price">${formatCurrency(prod.price)}</span>
      </div>
    `;

    card.addEventListener("click", () => addProductToCart(prod));
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

  // Check offline quota
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
  cartList.innerHTML = "";
  if (state.cart.length === 0) {
    emptyCartMsg.style.display = "flex";
    openPaymentModalBtn.disabled = true;
    subtotalDisplay.textContent = "0.00 SDG";
    grandTotalDisplay.textContent = "0.00 SDG";
    btnPayAmount.textContent = "0.00 SDG";
    return;
  }

  emptyCartMsg.style.display = "none";
  openPaymentModalBtn.disabled = false;

  let grandTotal = 0;
  state.cart.forEach((item, index) => {
    grandTotal += item.lineTotal;
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item-header">
        <span class="cart-item-title">${item.nameAr}</span>
        <button class="btn-text-danger" style="font-size:0.75rem;" data-index="${index}">حذف</button>
      </div>
      <div class="cart-item-batch">تشغيلة: ${item.batchNumber} (تنتهي: ${item.expiryDate})</div>
      <div class="cart-item-controls">
        <div class="qty-controls">
          <button class="qty-btn" data-action="dec" data-index="${index}">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" data-action="inc" data-index="${index}">+</button>
        </div>
        <span class="item-line-total">${formatCurrency(item.lineTotal)}</span>
      </div>
    `;

    li.querySelector(`button[data-action="inc"]`).addEventListener("click", () => {
      const prod = CATALOG_DATA.find(p => p.id === item.productId);
      addProductToCart(prod);
    });

    li.querySelector(`button[data-action="dec"]`).addEventListener("click", () => {
      if (item.quantity > 1) {
        item.quantity -= 1;
        item.lineTotal = item.quantity * item.unitPrice;
      } else {
        state.cart.splice(index, 1);
      }
      updateCartView();
    });

    li.querySelector(".btn-text-danger").addEventListener("click", () => {
      state.cart.splice(index, 1);
      updateCartView();
    });

    cartList.appendChild(li);
  });

  const formattedTotal = formatCurrency(grandTotal);
  subtotalDisplay.textContent = formattedTotal;
  grandTotalDisplay.textContent = formattedTotal;
  btnPayAmount.textContent = formattedTotal;
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
  } else {
    modalRemainingTotal.textContent = "0.00 SDG (مكتمل)";
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

  // Deduct from offline quota if offline
  if (state.isOffline) {
    const units = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    state.offlineAllocation.consumed += units;
    state.offlineAllocation.remaining -= units;
    allocationCount.textContent = `${state.offlineAllocation.remaining} / ${state.offlineAllocation.total} وحدة`;
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
      <td>${i.nameAr}<br><small>(${i.batchNumber})</small></td>
      <td>${i.quantity}</td>
      <td>${formatCurrency(i.unitPrice)}</td>
      <td>${formatCurrency(i.lineTotal)}</td>
    `;
    receiptItemsBody.appendChild(tr);
  });

  receiptModal.classList.remove("hidden");
}

// --- Event Listeners ---
searchInput.addEventListener("input", renderProducts);

simulateScanBtn.addEventListener("click", () => {
  // Simulate scanning Amoxicillin barcode
  searchInput.value = "6291100123456";
  renderProducts();
  const amox = CATALOG_DATA[0];
  addProductToCart(amox);
});

clearCartBtn.addEventListener("click", () => {
  if (confirm("هل تريد بالتأكيد إفراغ السلة الحالية؟")) {
    state.cart = [];
    updateCartView();
  }
});

categoryChips.addEventListener("click", (e) => {
  if (e.target.classList.contains("chip")) {
    categoryChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    e.target.classList.add("active");
    state.currentCategory = e.target.dataset.category;
    renderProducts();
  }
});

toggleOfflineBtn.addEventListener("click", () => {
  state.isOffline = !state.isOffline;
  if (state.isOffline) {
    networkDot.className = "status-dot offline";
    networkText.textContent = "غير متصل (Offline Mode)";
    toggleOfflineBtn.textContent = "استعادة الاتصال";
  } else {
    networkDot.className = "status-dot online";
    networkText.textContent = "متصل (Online)";
    toggleOfflineBtn.textContent = "محاكاة غير متصل";
  }
});

openPaymentModalBtn.addEventListener("click", openPaymentModal);
closePaymentModalBtn.addEventListener("click", closePaymentModal);
cancelPaymentBtn.addEventListener("click", closePaymentModal);
confirmSaleBtn.addEventListener("click", confirmSale);

cashReceivedInput.addEventListener("input", updateCashChange);

tabCashBtn.addEventListener("click", () => {
  state.activePaymentMethod = "CASH";
  [tabCashBtn, tabBankakBtn, tabSplitBtn].forEach(b => b.classList.remove("active"));
  tabCashBtn.classList.add("active");
  cashPanel.classList.remove("hidden");
  bankakPanel.classList.add("hidden");
  splitPanel.classList.add("hidden");
  updateCashChange();
});

tabBankakBtn.addEventListener("click", () => {
  state.activePaymentMethod = "BANK_TRANSFER";
  [tabCashBtn, tabBankakBtn, tabSplitBtn].forEach(b => b.classList.remove("active"));
  tabBankakBtn.classList.add("active");
  cashPanel.classList.add("hidden");
  bankakPanel.classList.remove("hidden");
  splitPanel.classList.add("hidden");
  modalRemainingTotal.textContent = "0.00 SDG (مطابق)";
});

tabSplitBtn.addEventListener("click", () => {
  state.activePaymentMethod = "SPLIT";
  [tabCashBtn, tabBankakBtn, tabSplitBtn].forEach(b => b.classList.remove("active"));
  tabSplitBtn.classList.add("active");
  cashPanel.classList.add("hidden");
  bankakPanel.classList.add("hidden");
  splitPanel.classList.remove("hidden");
});

closeReceiptModalBtn.addEventListener("click", () => receiptModal.classList.add("hidden"));
newSaleBtn.addEventListener("click", () => receiptModal.classList.add("hidden"));
printReceiptBtn.addEventListener("click", () => {
  window.print();
});

// Initial Setup
renderProducts();
updateCartView();
