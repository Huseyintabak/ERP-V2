import * as XLSX from 'xlsx';

/**
 * Excel Export Utility Functions
 * Raporları formatlanmış Excel dosyalarına export eder
 */

// Excel dosya formatı türleri
export type ExcelFormat = 'xlsx' | 'csv';

// Export konfigürasyonu
interface ExportConfig {
  filename: string;
  format?: ExcelFormat;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Üretim Raporu Excel Export
 */
export const exportProductionReport = (
  productionData: any[],
  config: ExportConfig
) => {
  const workbook = XLSX.utils.book_new();

  // Özet sayfası
  const summary = {
    'Toplam Üretim Planı': productionData.length,
    'Tamamlanan': productionData.filter(p => p.status === 'tamamlandi').length,
    'Devam Eden': productionData.filter(p => p.status === 'devam_ediyor').length,
    'Bekleyen': productionData.filter(p => p.status === 'beklemede').length,
    'İptal': productionData.filter(p => p.status === 'iptal').length,
    'Rapor Tarihi': new Date().toLocaleString('tr-TR')
  };

  const summarySheet = XLSX.utils.json_to_sheet([summary], { header: ['Metrik', 'Değer'] });
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

  // Detaylı üretim verileri
  const detailData = productionData.map(p => ({
    'Plan Kodu': p.plan_code,
    'Sipariş No': p.order?.order_number || '-',
    'Ürün': p.finished_product?.name || '-',
    'Ürün Kodu': p.finished_product?.code || '-',
    'Hedef Miktar': p.target_quantity,
    'Üretilen': p.produced_quantity,
    'İlerleme %': ((p.produced_quantity / p.target_quantity) * 100).toFixed(2),
    'Başlangıç': new Date(p.start_date).toLocaleDateString('tr-TR'),
    'Bitiş': new Date(p.end_date).toLocaleDateString('tr-TR'),
    'Durum': p.status,
    'Operatör': p.operator?.user?.name || '-',
    'Oluşturma': new Date(p.created_at).toLocaleDateString('tr-TR')
  }));

  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  
  // Kolon genişlikleri
  detailSheet['!cols'] = [
    { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Üretim Detay');

  // Dosya adı ve tarih
  const filename = `${config.filename}_${new Date().toISOString().split('T')[0]}.${config.format || 'xlsx'}`;
  
  XLSX.writeFile(workbook, filename);
};

/**
 * Stok Raporu Excel Export
 */
export const exportStockReport = (
  rawMaterials: any[],
  semiFinished: any[],
  finishedProducts: any[],
  config: ExportConfig
) => {
  const workbook = XLSX.utils.book_new();

  // Özet sayfası
  const totalValue = 
    rawMaterials.reduce((sum, m) => sum + (m.quantity * m.unit_price), 0) +
    semiFinished.reduce((sum, m) => sum + (m.quantity * m.unit_cost), 0) +
    finishedProducts.reduce((sum, m) => sum + (m.quantity * m.sale_price), 0);

  const summary = {
    'Hammadde Sayısı': rawMaterials.length,
    'Yarı Mamul Sayısı': semiFinished.length,
    'Nihai Ürün Sayısı': finishedProducts.length,
    'Toplam Ürün': rawMaterials.length + semiFinished.length + finishedProducts.length,
    'Kritik Stok (Hammadde)': rawMaterials.filter(m => m.quantity <= m.critical_level).length,
    'Kritik Stok (Yarı Mamul)': semiFinished.filter(m => m.quantity <= m.critical_level).length,
    'Kritik Stok (Nihai)': finishedProducts.filter(m => m.quantity <= m.critical_level).length,
    'Toplam Stok Değeri': `₺${totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
    'Rapor Tarihi': new Date().toLocaleString('tr-TR')
  };

  const summarySheet = XLSX.utils.json_to_sheet([summary], { header: ['Metrik', 'Değer'] });
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

  // Hammadde sayfası
  if (rawMaterials.length > 0) {
    const rawData = rawMaterials.map(m => ({
      'Kod': m.code,
      'İsim': m.name,
      'Barkod': m.barcode || '-',
      'Miktar': m.quantity,
      'Rezerve': m.reserved_quantity || 0,
      'Kritik Seviye': m.critical_level,
      'Birim': m.unit,
      'Birim Fiyat': m.unit_price,
      'Toplam Değer': m.quantity * m.unit_price,
      'Durum': m.quantity <= m.critical_level ? 'Kritik' : 'Normal',
      'Tedarikçi': m.supplier || '-'
    }));

    const rawSheet = XLSX.utils.json_to_sheet(rawData);
    rawSheet['!cols'] = Array(11).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(workbook, rawSheet, 'Hammaddeler');
  }

  // Yarı mamul sayfası
  if (semiFinished.length > 0) {
    const semiData = semiFinished.map(m => ({
      'Kod': m.code,
      'İsim': m.name,
      'Barkod': m.barcode || '-',
      'Miktar': m.quantity,
      'Rezerve': m.reserved_quantity || 0,
      'Kritik Seviye': m.critical_level,
      'Birim': m.unit,
      'Birim Maliyet': m.unit_cost,
      'Toplam Değer': m.quantity * m.unit_cost,
      'Durum': m.quantity <= m.critical_level ? 'Kritik' : 'Normal'
    }));

    const semiSheet = XLSX.utils.json_to_sheet(semiData);
    semiSheet['!cols'] = Array(10).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(workbook, semiSheet, 'Yarı Mamüller');
  }

  // Nihai ürün sayfası
  if (finishedProducts.length > 0) {
    const finishedData = finishedProducts.map(m => ({
      'Kod': m.code,
      'İsim': m.name,
      'Barkod': m.barcode || '-',
      'Miktar': m.quantity,
      'Rezerve': m.reserved_quantity || 0,
      'Kritik Seviye': m.critical_level,
      'Birim': m.unit,
      'Satış Fiyatı': m.sale_price,
      'Maliyet': m.cost_price || 0,
      'Kar Marjı %': m.profit_margin || 0,
      'Toplam Değer': m.quantity * m.sale_price,
      'Durum': m.quantity <= m.critical_level ? 'Kritik' : 'Normal'
    }));

    const finishedSheet = XLSX.utils.json_to_sheet(finishedData);
    finishedSheet['!cols'] = Array(12).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(workbook, finishedSheet, 'Nihai Ürünler');
  }

  const filename = `${config.filename}_${new Date().toISOString().split('T')[0]}.${config.format || 'xlsx'}`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Operatör Raporu Excel Export
 */
export const exportOperatorReport = (
  operators: any[],
  config: ExportConfig
) => {
  const workbook = XLSX.utils.book_new();

  // Özet
  const totalCapacity = operators.reduce((sum, o) => sum + o.daily_capacity, 0);
  const activeOperators = operators.filter(o => o.current_status === 'working').length;

  const summary = {
    'Toplam Operatör': operators.length,
    'Aktif Operatör': activeOperators,
    'Boşta': operators.filter(o => o.current_status === 'idle').length,
    'Toplam Kapasite (saat/gün)': totalCapacity,
    'Ortalama Deneyim (yıl)': (operators.reduce((sum, o) => sum + o.experience_years, 0) / operators.length).toFixed(1),
    'Rapor Tarihi': new Date().toLocaleString('tr-TR')
  };

  const summarySheet = XLSX.utils.json_to_sheet([summary]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

  // Detay
  const detailData = operators.map(o => ({
    'Seri': o.series,
    'Ad Soyad': o.user?.name || '-',
    'Email': o.user?.email || '-',
    'Deneyim (yıl)': o.experience_years,
    'Günlük Kapasite (saat)': o.daily_capacity,
    'Saat Ücreti': o.hourly_rate,
    'Lokasyon': o.location,
    'Aktif Üretim': o.active_productions_count,
    'Durum': o.current_status === 'working' ? 'Çalışıyor' : o.current_status === 'idle' ? 'Boşta' : 'Mola',
    'Kullanım %': o.active_productions_count > 0 ? 100 : 0
  }));

  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  detailSheet['!cols'] = Array(10).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Operatörler');

  const filename = `${config.filename}_${new Date().toISOString().split('T')[0]}.${config.format || 'xlsx'}`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Sipariş Raporu Excel Export
 */
export const exportOrderReport = (
  orders: any[],
  config: ExportConfig
) => {
  const workbook = XLSX.utils.book_new();

  // Özet
  const totalValue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);

  const summary = {
    'Toplam Sipariş': orders.length,
    'Onay Bekleyen': orders.filter(o => o.status === 'pending').length,
    'Onaylandı': orders.filter(o => o.status === 'approved').length,
    'Üretimde': orders.filter(o => o.status === 'in_production').length,
    'Tamamlandı': orders.filter(o => o.status === 'completed').length,
    'İptal': orders.filter(o => o.status === 'cancelled').length,
    'Toplam Değer': `₺${totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
    'Rapor Tarihi': new Date().toLocaleString('tr-TR')
  };

  const summarySheet = XLSX.utils.json_to_sheet([summary]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

  // Detay
  const detailData = orders.map(o => ({
    'Sipariş No': o.order_number,
    'Müşteri': o.customer?.name || '-',
    'Ürün': o.finished_product?.name || '-',
    'Ürün Kodu': o.finished_product?.code || '-',
    'Miktar': o.quantity,
    'Birim': o.unit,
    'Birim Fiyat': o.unit_price,
    'Toplam Fiyat': o.total_price,
    'Teslim Tarihi': new Date(o.delivery_date).toLocaleDateString('tr-TR'),
    'Durum': o.status,
    'Öncelik': o.priority,
    'Oluşturma': new Date(o.created_at).toLocaleDateString('tr-TR'),
    'Notlar': o.notes || '-'
  }));

  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  detailSheet['!cols'] = Array(13).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Sipariş Detay');

  const filename = `${config.filename}_${new Date().toISOString().split('T')[0]}.${config.format || 'xlsx'}`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Genel Excel Export (Generic)
 */
export const exportToExcel = (
  data: any[],
  config: ExportConfig & {
    sheetName?: string;
    columns?: { header: string; key: string; width?: number }[];
  }
) => {
  const workbook = XLSX.utils.book_new();

  // Eğer özel kolonlar belirtilmişse kullan
  let exportData = data;
  if (config.columns) {
    exportData = data.map(item => {
      const row: any = {};
      config.columns!.forEach(col => {
        row[col.header] = item[col.key];
      });
      return row;
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Kolon genişlikleri
  if (config.columns) {
    worksheet['!cols'] = config.columns.map(col => ({ wch: col.width || 15 }));
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName || 'Veri');

  const filename = `${config.filename}_${new Date().toISOString().split('T')[0]}.${config.format || 'xlsx'}`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Çoklu Worksheet Export
 */
export const exportMultiSheet = (
  sheets: {
    name: string;
    data: any[];
    columns?: { header: string; key: string }[];
  }[],
  config: ExportConfig
) => {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    let sheetData = sheet.data;
    
    if (sheet.columns) {
      sheetData = sheet.data.map(item => {
        const row: any = {};
        sheet.columns!.forEach(col => {
          row[col.header] = item[col.key];
        });
        return row;
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    worksheet['!cols'] = Array(Object.keys(sheetData[0] || {}).length).fill({ wch: 15 });
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  const filename = `${config.filename}_${new Date().toISOString().split('T')[0]}.${config.format || 'xlsx'}`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Stok Hareketi Raporu Excel Export
 */
export const exportStockMovementReport = (
  movements: any[],
  config: ExportConfig
) => {
  const workbook = XLSX.utils.book_new();

  // Özet
  const summary = {
    'Toplam Hareket': movements.length,
    'Giriş': movements.filter(m => m.movement_type === 'in').length,
    'Çıkış': movements.filter(m => m.movement_type === 'out').length,
    'Transfer': movements.filter(m => m.movement_type === 'transfer').length,
    'Düzeltme': movements.filter(m => m.movement_type === 'adjustment').length,
    'Rapor Tarihi': new Date().toLocaleString('tr-TR')
  };

  const summarySheet = XLSX.utils.json_to_sheet([summary]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

  // Detay
  const detailData = movements.map(m => ({
    'Tarih': new Date(m.created_at).toLocaleString('tr-TR'),
    'Hareket Tipi': m.movement_type === 'in' ? 'Giriş' : m.movement_type === 'out' ? 'Çıkış' : 'Transfer',
    'Malzeme Tipi': m.material_type === 'raw' ? 'Hammadde' : m.material_type === 'semi' ? 'Yarı Mamul' : 'Nihai Ürün',
    'Malzeme Kodu': m.material_code || '-',
    'Malzeme': m.material_name || '-',
    'Miktar': m.quantity,
    'Birim': m.unit,
    'Referans': m.reference_type || '-',
    'Notlar': m.notes || '-',
    'Kullanıcı': m.created_by_user?.name || '-'
  }));

  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  detailSheet['!cols'] = Array(10).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Stok Hareketleri');

  const filename = `${config.filename}_${new Date().toISOString().split('T')[0]}.${config.format || 'xlsx'}`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Kritik Stok Raporu Excel Export
 */
export const exportCriticalStockReport = (
  criticalItems: any[],
  config: ExportConfig
) => {
  const workbook = XLSX.utils.book_new();

  const detailData = criticalItems.map(item => ({
    'Malzeme Tipi': item.material_type === 'raw' ? 'Hammadde' : item.material_type === 'semi' ? 'Yarı Mamul' : 'Nihai Ürün',
    'Kod': item.code,
    'İsim': item.name,
    'Mevcut Stok': item.quantity,
    'Kritik Seviye': item.critical_level,
    'Fark': item.quantity - item.critical_level,
    'Sapma %': (((item.quantity - item.critical_level) / item.critical_level) * 100).toFixed(2),
    'Birim': item.unit,
    'Son Hareket': item.last_movement ? new Date(item.last_movement).toLocaleString('tr-TR') : '-',
    'Öneri': item.quantity === 0 ? 'ACİL SİPARİŞ' : 'Sipariş Ver'
  }));

  const worksheet = XLSX.utils.json_to_sheet(detailData);
  worksheet['!cols'] = Array(10).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kritik Stoklar');

  const filename = `${config.filename}_${new Date().toISOString().split('T')[0]}.${config.format || 'xlsx'}`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Tarih aralığı formatı
 */
export const formatDateRange = (from?: Date, to?: Date): string => {
  if (!from && !to) return 'tum-zamanlar';
  if (from && to) {
    return `${from.toISOString().split('T')[0]}_${to.toISOString().split('T')[0]}`;
  }
  return new Date().toISOString().split('T')[0];
};

