/**
 * PharmaTech — Mock Data Store
 * Authentic Sudanese Pharmacy Catalog, FEFO Batches & Financial Metrics
 */

export const INITIAL_MEDICINES = [
  {
    id: 'MED-001',
    name: 'بنادول إكسترا',
    generic: 'Panadol Extra 500mg/65mg',
    category: 'مسكنات',
    stock: 248,
    maxStock: 300,
    price: 4500,
    expiry: '2027-08-15',
    batch: 'BATCH-2026-A2',
    status: 'available',
    fefoPriority: 1
  },
  {
    id: 'MED-002',
    name: 'أوجمنتين 1 جم',
    generic: 'Augmentin 1g Tablets',
    category: 'مضادات حيوية',
    stock: 12,
    maxStock: 80,
    price: 18500,
    expiry: '2026-11-10', // < 30 days
    batch: 'BATCH-AUG-99',
    status: 'low',
    fefoPriority: 1
  },
  {
    id: 'MED-003',
    name: 'فيتامين سي 1000 مجم',
    generic: 'Vitamin C 1000mg Effervescent',
    category: 'مكملات',
    stock: 156,
    maxStock: 200,
    price: 6800,
    expiry: '2027-11-10',
    batch: 'BATCH-VTC-44',
    status: 'available',
    fefoPriority: 2
  },
  {
    id: 'MED-004',
    name: 'جلوكوفاج 500 مجم',
    generic: 'Glucophage 500mg Metformin',
    category: 'السكري',
    stock: 84,
    maxStock: 150,
    price: 8400,
    expiry: '2026-11-05', // < 30 days!
    batch: 'BATCH-GLU-12',
    status: 'expiring',
    fefoPriority: 1
  },
  {
    id: 'MED-005',
    name: 'زيرتك 10 مجم',
    generic: 'Zyrtec 10mg Cetirizine',
    category: 'الحساسية',
    stock: 120,
    maxStock: 150,
    price: 3800,
    expiry: '2028-01-22',
    batch: 'BATCH-ZYR-08',
    status: 'available',
    fefoPriority: 3
  },
  {
    id: 'MED-006',
    name: 'بروفين 400 مجم',
    generic: 'Brufen 400mg Ibuprofen',
    category: 'مسكنات',
    stock: 18,
    maxStock: 100,
    price: 5200,
    expiry: '2027-06-12',
    batch: 'BATCH-BRU-19',
    status: 'low',
    fefoPriority: 1
  },
  {
    id: 'MED-007',
    name: 'أوميبرازول 20 مجم',
    generic: 'Omeprazole 20mg Capsules',
    category: 'المعدة',
    stock: 92,
    maxStock: 120,
    price: 7100,
    expiry: '2027-09-01',
    batch: 'BATCH-OME-31',
    status: 'available',
    fefoPriority: 2
  },
  {
    id: 'MED-008',
    name: 'فنتولين بخاخ',
    generic: 'Ventolin Evohaler 100mcg',
    category: 'المعدة',
    stock: 8,
    maxStock: 40,
    price: 14000,
    expiry: '2027-05-15',
    batch: 'BATCH-VEN-10',
    status: 'low',
    fefoPriority: 1
  },
  {
    id: 'MED-009',
    name: 'أنسولين لانتوس قلم',
    generic: 'Lantus SoloStar 100 U/ml',
    category: 'السكري',
    stock: 45,
    maxStock: 60,
    price: 32000,
    expiry: '2027-04-30',
    batch: 'BATCH-LAN-04',
    status: 'available',
    fefoPriority: 1
  },
  {
    id: 'MED-010',
    name: 'كونكور 5 مجم',
    generic: 'Concor 5mg Bisoprolol',
    category: 'الضغط والقلب',
    stock: 67,
    maxStock: 90,
    price: 11500,
    expiry: '2027-10-18',
    batch: 'BATCH-CON-55',
    status: 'available',
    fefoPriority: 2
  },
  {
    id: 'MED-011',
    name: 'سولبادين فوار',
    generic: 'Solpadeine Soluble Tablets',
    category: 'مسكنات',
    stock: 110,
    maxStock: 150,
    price: 5800,
    expiry: '2027-06-20',
    batch: 'BATCH-SDI-88',
    status: 'available',
    fefoPriority: 1
  },
  {
    id: 'MED-012',
    name: 'كابوتين 25 مجم',
    generic: 'Capoten 25mg Captopril',
    category: 'الضغط والقلب',
    stock: 5,
    maxStock: 50,
    price: 4900,
    expiry: '2026-08-31', // Expired
    batch: 'BATCH-CAP-01',
    status: 'expired',
    fefoPriority: 0
  }
];

export const INITIAL_CHART_DATA = {
  week: {
    total: 35780,
    previous: 30100,
    growth: '+18.6%',
    points: [
      { label: 'السبت', val: 2400 },
      { label: 'الأحد', val: 3600 },
      { label: 'الإثنين', val: 3000 },
      { label: 'الثلاثاء', val: 4900 },
      { label: 'الأربعاء', val: 3900 },
      { label: 'الخميس', val: 5800 },
      { label: 'الجمعة', val: 5100 }
    ]
  },
  month: {
    total: 142650,
    previous: 118200,
    growth: '+20.7%',
    points: [
      { label: 'أسبوع 1', val: 28000 },
      { label: 'أسبوع 2', val: 34500 },
      { label: 'أسبوع 3', val: 39100 },
      { label: 'أسبوع 4', val: 41050 }
    ]
  }
};

export const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'warning', title: 'أوجمنتين 1 جم منخفض', desc: '12 عبوة متبقية في الرف الرئيسي', time: 'منذ 5 د' },
  { id: 2, type: 'danger', title: 'جلوكوفاج ينتهي قريباً (FEFO)', desc: 'التشغيلة تنتهي في 5 نوفمبر 2026', time: 'منذ ساعة' },
  { id: 3, type: 'info', title: 'شحنة توريد في الطريق', desc: 'طلب توريد من شركة حكمة للأدوية', time: 'منذ 3 س' }
];
