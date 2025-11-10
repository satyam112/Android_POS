/**
 * ZaykaBill POS - Reports & Analytics Screen
 * Comprehensive dashboard for analyzing performance, tracking revenue trends, and exporting financial insights
 * 
 * ⚙️ OFFLINE-FIRST DATA SOURCES:
 * 
 * All reports data is fetched from SQLite for offline accessibility:
 * 
 * - Orders: SQLite (orders table) - Filtered by date range
 * - Expenses: SQLite (expenses table) - Filtered by date range
 * - Taxes: SQLite (taxes table) - From Settings → Taxes & Charges
 * - Customers: SQLite (customers table) - For customer reports
 * 
 * This ensures smooth offline operation without server dependency.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import RNFS from 'react-native-fs';
import { authService } from '../services/auth';
import {
  ordersService,
  expensesService,
  taxesService,
  additionalChargesService,
  customersService,
  orderItemsService,
  restaurantInfoService,
  Order,
  Expense,
  Tax,
  OrderItem,
} from '../services/database-methods';

type ReportType = 'pnl' | 'sales' | 'tax' | 'expenses';
type GstReportType = 'GSTR-1' | 'GSTR-2' | 'GSTR-3B';
type OutputFormat = 'JSON' | 'CSV';

interface DateRange {
  startDate: string;
  endDate: string;
}

const ReportsScreen: React.FC = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [showReportTypeDropdown, setShowReportTypeDropdown] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return {
      startDate: lastWeek.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    };
  });

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [orderItems, setOrderItems] = useState<Map<string, OrderItem[]>>(new Map());
  const [restaurantInfo, setRestaurantInfo] = useState<{ gstNumber?: string } | null>(null);
  const [showGstReportTypeDropdown, setShowGstReportTypeDropdown] = useState(false);
  const [showGstStateCodeDropdown, setShowGstStateCodeDropdown] = useState(false);

  // GST Report state (matching webPOS)
  const [gstReportType, setGstReportType] = useState<GstReportType>('GSTR-1');
  const [gstOutputFormat, setGstOutputFormat] = useState<OutputFormat>('CSV');
  const [gstStateCode, setGstStateCode] = useState('29'); // Default to Karnataka
  const [loadingGstReport, setLoadingGstReport] = useState(false);

  // Indian states with their GST state codes (matching webPOS)
  const indianStates = [
    { code: '01', name: 'Jammu and Kashmir' },
    { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' },
    { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' },
    { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' },
    { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh (UP)' },
    { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' },
    { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' },
    { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' },
    { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' },
    { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' },
    { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' },
    { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' },
    { code: '24', name: 'Gujarat' },
    { code: '25', name: 'Daman and Diu (Pre-merger)' },
    { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu (Merged UT)' },
    { code: '27', name: 'Maharashtra' },
    { code: '28', name: 'Andhra Pradesh (Before Division)' },
    { code: '29', name: 'Karnataka (KA)' },
    { code: '30', name: 'Goa' },
    { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' },
    { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' },
    { code: '35', name: 'Andaman and Nicobar Islands' },
    { code: '36', name: 'Telangana' },
    { code: '37', name: 'Andhra Pradesh (After Division)' },
    { code: '38', name: 'Ladakh' },
    { code: '97', name: 'Other Territory' },
    { code: '99', name: 'Centre Jurisdiction' },
  ];

  // Report types
  const reportTypes: { id: ReportType; name: string; icon: string }[] = [
    { id: 'pnl', name: 'Profit & Loss Report', icon: '📊' },
    { id: 'sales', name: 'Sales Report', icon: '💰' },
    { id: 'tax', name: 'Tax Report (GST)', icon: '🧾' },
    { id: 'expenses', name: 'Expense Report', icon: '💸' },
  ];

  useEffect(() => {
    loadReportsData();
  }, [dateRange, reportType]);

  /**
   * Load reports data from SQLite
   * Data Sources: SQLite (orders, expenses, taxes tables)
   * Offline: Yes - All operations are local SQLite queries
   */
  const loadReportsData = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const rid = auth.restaurant.id;
      setRestaurantId(rid);

      // Load data from SQLite (offline)
      const [ordersData, expensesData, taxesData, restaurantInfoData] = await Promise.all([
        ordersService.getOrdersByDateRange(rid, dateRange.startDate, dateRange.endDate),
        expensesService.getExpensesByDateRange(rid, dateRange.startDate, dateRange.endDate),
        taxesService.getAll(rid),
        restaurantInfoService.get(rid),
      ]);

      setOrders(ordersData);
      setExpenses(expensesData);
      setTaxes(taxesData);
      setRestaurantInfo(restaurantInfoData);

      // Load order items for all orders (for GST reports)
      const itemsMap = new Map<string, OrderItem[]>();
      for (const order of ordersData) {
        const items = await orderItemsService.getByOrderId(order.id);
        itemsMap.set(order.id, items);
      }
      setOrderItems(itemsMap);
    } catch (error) {
      console.error('Error loading reports data:', error);
      Alert.alert('Error', 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate analytics summary from SQLite data
   * All calculations happen offline, matching Web POS formulas
   */
  const analyticsSummary = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalExpenses,
      netProfit,
    };
  }, [orders, expenses]);

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Format date-time for display
   */
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Save file and share using React Native File System and Share API
   * Downloads file to phone storage (Downloads folder)
   */
  const saveAndShareFile = async (content: string, fileName: string, mimeType: string = 'text/csv') => {
    try {
      // Create file path in Downloads directory
      const downloadsPath = Platform.OS === 'android' 
        ? `${RNFS.DownloadDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;
      
      // Write file
      await RNFS.writeFile(downloadsPath, content, 'utf8');

      // Share the file (opens share dialog - user can save to Downloads, share via WhatsApp, Email, etc.)
      await Share.share({
        url: Platform.OS === 'android' ? `file://${downloadsPath}` : downloadsPath,
        title: fileName,
        message: `Report: ${fileName}`,
      }, {
        mimeType,
        dialogTitle: `Share ${fileName}`,
      });

      Alert.alert('Success', `Report saved successfully!\n\nFile: ${fileName}\n\nSaved to Downloads folder. You can share it via the share dialog.`);
    } catch (error) {
      console.error('Error saving file:', error);
      // Fallback: Use Share API with content
      try {
        await Share.share({
          message: content,
          title: fileName,
        });
      } catch (shareError) {
        console.error('Error sharing:', shareError);
        Alert.alert('Error', 'Failed to save and share report. Please try again.');
      }
    }
  };

  /**
   * Generate GST Report (GSTR-1, GSTR-2, GSTR-3B)
   * Matches Web POS pattern exactly
   */
  const generateGstReport = async (): Promise<any> => {
    // Get tax configurations
    const cgstTax = taxes.find(t => t.name.toUpperCase().includes('CGST'));
    const sgstTax = taxes.find(t => t.name.toUpperCase().includes('SGST'));
    const igstTax = taxes.find(t => t.name.toUpperCase().includes('IGST'));
    
    const cgstRate = cgstTax ? cgstTax.percentage : 9; // Default 9% CGST
    const sgstRate = sgstTax ? sgstTax.percentage : 9; // Default 9% SGST
    const igstRate = igstTax ? igstTax.percentage : 18; // Default 18% IGST

    // Calculate report period
    const startDate = new Date(dateRange.startDate);
    const reportPeriod = {
      month: String(startDate.getMonth() + 1).padStart(2, '0'),
      year: String(startDate.getFullYear()),
    };

    // Filter orders by date range and status SERVED
    const servedOrders = orders.filter(order => order.paymentStatus === 'SERVED' || order.status === 'SERVED');

    if (gstReportType === 'GSTR-1') {
      // Calculate totals for B2CS and HSN sections
      const totalTaxableValue = servedOrders.reduce((sum, order) => {
        const orderItemsList = orderItems.get(order.id) || [];
        return sum + orderItemsList.reduce((itemSum, item) => itemSum + item.totalPrice, 0);
      }, 0);

      // Calculate tax amounts
      const calculatedCgst = Math.round(totalTaxableValue * (cgstRate / 100) * 100) / 100;
      const calculatedSgst = Math.round(totalTaxableValue * (sgstRate / 100) * 100) / 100;
      const totalGstRate = cgstRate + sgstRate;

      // Use actual tax amounts from orders
      const actualTaxAmount = servedOrders.reduce((sum, order) => sum + (order.taxAmount || 0), 0);
      const actualCgst = Math.round(actualTaxAmount / 2); // Split equally between CGST and SGST
      const actualSgst = actualTaxAmount - actualCgst;

      return {
        gstin: restaurantInfo?.gstNumber || '<TAXPAYER_GSTIN>',
        fp: `${reportPeriod.month}${reportPeriod.year}`,
        gt: '<ANNUAL_GROSS_TURNOVER_YTD>',
        cur_gt: '<CURRENT_PERIOD_GROSS_TURNOVER>',
        b2cs: [
          {
            sply_ty: 'OS', // Outward Supply (Intra-State)
            pos: gstStateCode, // Place of Supply
            rt: totalGstRate, // GST Rate
            txval: totalTaxableValue,
            camt: actualCgst,
            samt: actualSgst,
            csamt: 0.00,
            typ: 'E', // Export type
            etin: null,
          },
        ],
        hsn: [
          {
            num: 1,
            hsn_sc: '996331', // SAC code for restaurant services
            desc: 'Restaurant, café, takeaway, room service, and food delivery services',
            uqc: 'NA', // Unit of Quantity Code
            qty: 0,
            rt: totalGstRate,
            txval_b2c: totalTaxableValue,
            txval_b2b: 0.00,
            tot_txval: totalTaxableValue,
            camt: actualCgst,
            samt: actualSgst,
            iamt: 0.00, // IGST amount
            csamt: 0.00,
          },
        ],
        nil: [],
        b2b: [],
        b2cl: [],
        cdnr: [],
        cdnur: [],
        exp: [],
        at: [],
        at_adj: [],
        docs: [],
      };
    } else if (gstReportType === 'GSTR-2') {
      // For GSTR-2, create sample purchase data (since we don't have purchase orders)
      const samplePurchases = [
        {
          supplier_gstin: '27AAAAA1111A1Z2',
          invoice_number: 'PUR001',
          invoice_date: dateRange.startDate,
          taxable_value: 5000,
          cgst: Math.round(5000 * (cgstRate / 100)),
          sgst: Math.round(5000 * (sgstRate / 100)),
          igst: 0,
          total_value: 5000 + Math.round(5000 * (cgstRate / 100)) + Math.round(5000 * (sgstRate / 100)),
        },
      ];

      const totalTaxableValue = samplePurchases.reduce((sum, tx) => sum + tx.taxable_value, 0);
      const totalCgst = samplePurchases.reduce((sum, tx) => sum + tx.cgst, 0);
      const totalSgst = samplePurchases.reduce((sum, tx) => sum + tx.sgst, 0);
      const grandTotal = samplePurchases.reduce((sum, tx) => sum + tx.total_value, 0);

      return {
        report_type: 'GSTR-2',
        report_period: reportPeriod,
        transactions: samplePurchases,
        totals: {
          total_taxable_value: totalTaxableValue,
          total_cgst: totalCgst,
          total_sgst: totalSgst,
          grand_total: grandTotal,
        },
      };
    } else if (gstReportType === 'GSTR-3B') {
      // Calculate taxable sales
      const taxableSales = servedOrders.reduce((sum, order) => {
        const orderItemsList = orderItems.get(order.id) || [];
        return sum + orderItemsList.reduce((itemSum, item) => itemSum + item.totalPrice, 0);
      }, 0);

      const cgst = Math.round(taxableSales * (cgstRate / 100));
      const sgst = Math.round(taxableSales * (sgstRate / 100));
      const grandTotal = taxableSales + cgst + sgst;

      // Sample input tax credit and tax paid data
      const inputTaxCredit = {
        cgst: Math.round(cgst * 0.4), // 40% of output tax as input credit
        sgst: Math.round(sgst * 0.4),
        igst: 0,
      };

      const taxPaid = {
        cgst: cgst - inputTaxCredit.cgst,
        sgst: sgst - inputTaxCredit.sgst,
        igst: 0,
      };

      return {
        report_type: 'GSTR-3B',
        report_period: reportPeriod,
        totals: {
          taxable_sales: taxableSales,
          cgst,
          sgst,
          grand_total: grandTotal,
          input_tax_credit: inputTaxCredit,
          tax_paid: taxPaid,
        },
      };
    }

    return {};
  };

  /**
   * Convert GST data to CSV format (matching webPOS)
   */
  const convertGstToCSV = (data: any, reportType: GstReportType): string => {
    if (reportType === 'GSTR-1') {
      const csvRows: string[][] = [];
      
      // Add header information
      csvRows.push(['GSTR-1 Report']);
      csvRows.push(['GSTIN', data.gstin || '']);
      csvRows.push(['Filing Period', data.fp || '']);
      csvRows.push([]);
      
      // B2CS Section
      csvRows.push(['B2CS (Business to Consumer Small)']);
      csvRows.push(['Supply Type', 'Place of Supply', 'Rate', 'Taxable Value', 'CGST', 'SGST', 'Cess', 'Type', 'ETIN']);
      if (data.b2cs) {
        data.b2cs.forEach((b2c: any) => {
          csvRows.push([
            String(b2c.sply_ty || ''),
            String(b2c.pos || ''),
            String(b2c.rt || ''),
            String(b2c.txval || ''),
            String(b2c.camt || ''),
            String(b2c.samt || ''),
            String(b2c.csamt || ''),
            String(b2c.typ || ''),
            String(b2c.etin || ''),
          ]);
        });
      }
      
      csvRows.push([]);
      
      // HSN Section
      csvRows.push(['HSN/SAC Summary']);
      csvRows.push(['Number', 'HSN/SAC Code', 'Description', 'UQC', 'Quantity', 'Rate', 'B2C Value', 'B2B Value', 'Total Value', 'CGST', 'SGST', 'IGST', 'Cess']);
      if (data.hsn) {
        data.hsn.forEach((hsn: any) => {
          csvRows.push([
            String(hsn.num || ''),
            String(hsn.hsn_sc || ''),
            String(hsn.desc || ''),
            String(hsn.uqc || ''),
            String(hsn.qty || ''),
            String(hsn.rt || ''),
            String(hsn.txval_b2c || ''),
            String(hsn.txval_b2b || ''),
            String(hsn.tot_txval || ''),
            String(hsn.camt || ''),
            String(hsn.samt || ''),
            String(hsn.iamt || ''),
            String(hsn.csamt || ''),
          ]);
        });
      }
      
      return csvRows.map(row => row.join(',')).join('\n');
    } else if (reportType === 'GSTR-2') {
      const headers = ['Supplier GSTIN', 'Invoice Number', 'Invoice Date', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Value'];
      const rows = data.transactions ? data.transactions.map((tx: any) => [
        String(tx.supplier_gstin || ''),
        String(tx.invoice_number || ''),
        String(tx.invoice_date || ''),
        String(tx.taxable_value || ''),
        String(tx.cgst || ''),
        String(tx.sgst || ''),
        String(tx.igst || ''),
        String(tx.total_value || ''),
      ]) : [];
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else if (reportType === 'GSTR-3B') {
      const headers = ['Description', 'Amount'];
      const rows = [
        ['Taxable Sales', String(data.totals?.taxable_sales || '')],
        ['CGST', String(data.totals?.cgst || '')],
        ['SGST', String(data.totals?.sgst || '')],
        ['Grand Total', String(data.totals?.grand_total || '')],
        ['Input Tax Credit - CGST', String(data.totals?.input_tax_credit?.cgst || '')],
        ['Input Tax Credit - SGST', String(data.totals?.input_tax_credit?.sgst || '')],
        ['Tax Paid - CGST', String(data.totals?.tax_paid?.cgst || '')],
        ['Tax Paid - SGST', String(data.totals?.tax_paid?.sgst || '')],
      ];
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    return '';
  };

  /**
   * Export report to CSV/Excel format
   * Matches Web POS format exactly
   * Downloads file to phone storage
   */
  const handleExportReport = async () => {
    try {
      // Generate CSV content based on report type
      let csvContent = '';
      let fileName = '';

      if (reportType === 'pnl') {
        fileName = `Profit-Loss-Report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        csvContent = generatePnLReportCSV();
      } else if (reportType === 'sales') {
        fileName = `Sales-Report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        csvContent = generateSalesReportCSV();
      } else if (reportType === 'tax') {
        // Generate GST report
        const gstData = await generateGstReport();
        if (gstOutputFormat === 'CSV') {
          fileName = `${gstReportType}_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
          csvContent = convertGstToCSV(gstData, gstReportType);
        } else {
          fileName = `${gstReportType}_${dateRange.startDate}_to_${dateRange.endDate}.json`;
          csvContent = JSON.stringify(gstData, null, 2);
        }
      } else if (reportType === 'expenses') {
        fileName = `Expenses-Report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        csvContent = generateExpensesReportCSV();
      }

      // Add UTF-8 BOM for proper character encoding (matching webPOS) - only for CSV
      const BOM = '\uFEFF';
      const finalContent = reportType === 'tax' && gstOutputFormat === 'JSON' 
        ? csvContent 
        : BOM + csvContent;

      // Save and share file
      const mimeType = reportType === 'tax' && gstOutputFormat === 'JSON' 
        ? 'application/json' 
        : 'text/csv;charset=utf-8';
      await saveAndShareFile(finalContent, fileName, mimeType);
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Error', 'Failed to export report');
    }
  };

  /**
   * Generate Profit & Loss Report CSV
   * Matches Web POS format exactly
   */
  const generatePnLReportCSV = (): string => {
    const lines: string[] = [];
    lines.push('PROFIT & LOSS STATEMENT');
    lines.push(`Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    lines.push('');
    lines.push('REVENUE');
    lines.push(`Total Sales Revenue,${analyticsSummary.totalRevenue.toFixed(2)}`);
    lines.push(`Total Orders,${analyticsSummary.totalOrders}`);
    lines.push(`Average Order Value,${analyticsSummary.avgOrderValue.toFixed(2)}`);
    lines.push('');
    lines.push('EXPENSES');
    lines.push(`Total Expenses,${analyticsSummary.totalExpenses.toFixed(2)}`);
    lines.push('');
    lines.push('PROFIT CALCULATION');
    lines.push(`Total Revenue,${analyticsSummary.totalRevenue.toFixed(2)}`);
    lines.push(`Less: Total Expenses,${analyticsSummary.totalExpenses.toFixed(2)}`);
    lines.push(`NET PROFIT,${analyticsSummary.netProfit.toFixed(2)}`);
    lines.push(`Profit Margin,${analyticsSummary.totalRevenue > 0 ? ((analyticsSummary.netProfit / analyticsSummary.totalRevenue) * 100).toFixed(2) : '0.00'}%`);
    return lines.join('\n');
  };

  /**
   * Generate Sales Report CSV
   * Matches Web POS format exactly
   */
  const generateSalesReportCSV = (): string => {
    const lines: string[] = [];
    lines.push('SALES REPORT');
    lines.push(`Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    lines.push('');
    lines.push('Date,Order ID,Customer,Amount,Payment Method,Status');
    orders.forEach((order) => {
      const customerName = order.customerId ? 'Customer' : 'Walk-in Customer';
      lines.push(
        `${formatDate(order.createdAt)},${order.orderNumber},${customerName},${order.totalAmount.toFixed(2)},${order.paymentMethod || 'N/A'},${order.paymentStatus}`
      );
    });
    lines.push('');
    lines.push('Summary');
    lines.push(`Total Orders,${analyticsSummary.totalOrders}`);
    lines.push(`Total Revenue,${analyticsSummary.totalRevenue.toFixed(2)}`);
    lines.push(`Average Order Value,${analyticsSummary.avgOrderValue.toFixed(2)}`);
    return lines.join('\n');
  };

  /**
   * Generate Tax Report CSV
   * Matches Web POS format exactly - Uses actual taxAmount from orders
   */
  const generateTaxReportCSV = (): string => {
    const lines: string[] = [];
    lines.push('TAX REPORT (GST)');
    lines.push(`Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    lines.push('');
    lines.push('TAX BREAKDOWN BY TYPE');
    
    // Calculate tax breakdown by tax type using actual taxAmount from orders
    const taxBreakdown: Record<string, number> = {};
    let totalTaxCollected = 0;

    // Use actual taxAmount from orders (matching webPOS pattern)
    orders.forEach((order) => {
      totalTaxCollected += order.taxAmount || 0;
      
      // Distribute tax by tax type based on tax percentages
      taxes.forEach((tax) => {
        if (!taxBreakdown[tax.name]) {
          taxBreakdown[tax.name] = 0;
        }
        // Calculate proportional tax amount based on tax percentage
        const totalTaxPercentage = taxes.reduce((sum, t) => sum + t.percentage, 0);
        if (totalTaxPercentage > 0) {
          taxBreakdown[tax.name] += (order.taxAmount || 0) * (tax.percentage / totalTaxPercentage);
        }
      });
    });

    Object.entries(taxBreakdown).forEach(([taxName, amount]) => {
      const tax = taxes.find(t => t.name === taxName);
      lines.push(`${taxName} (${tax?.percentage || 0}%),${amount.toFixed(2)}`);
    });

    lines.push('');
    lines.push(`Total Tax Collected,${totalTaxCollected.toFixed(2)}`);
    return lines.join('\n');
  };

  /**
   * Generate Expenses Report CSV
   * Matches Web POS format exactly
   */
  const generateExpensesReportCSV = (): string => {
    const lines: string[] = [];
    lines.push('EXPENSES REPORT');
    lines.push(`Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    lines.push('');
    lines.push('Date,Category,Amount,Description,Vendor');
    expenses.forEach((expense) => {
      lines.push(
        `${formatDate(expense.date)},${expense.category},${expense.amount.toFixed(2)},${expense.description || 'N/A'},${expense.vendorName || 'N/A'}`
      );
    });
    lines.push('');
    lines.push('EXPENSE SUMMARY BY CATEGORY');
    const expenseByCategory = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(expenseByCategory).forEach(([category, amount]) => {
      const percentage = analyticsSummary.totalExpenses > 0 ? ((amount / analyticsSummary.totalExpenses) * 100).toFixed(2) : '0.00';
      lines.push(`${category},${amount.toFixed(2)},${percentage}%`);
    });
    lines.push('');
    lines.push(`Total Expenses,${analyticsSummary.totalExpenses.toFixed(2)}`);
    return lines.join('\n');
  };

  /**
   * Render Profit & Loss Report
   */
  const renderPnLReport = () => {
    return (
      <View style={styles.reportContainer}>
        <Text style={styles.reportSectionTitle}>Revenue Summary</Text>
        <View style={styles.reportRow}>
          <Text style={styles.reportLabel}>Total Sales Revenue:</Text>
          <Text style={styles.reportValue}>{formatCurrency(analyticsSummary.totalRevenue)}</Text>
        </View>
        <View style={styles.reportRow}>
          <Text style={styles.reportLabel}>Total Orders:</Text>
          <Text style={styles.reportValue}>{analyticsSummary.totalOrders}</Text>
        </View>
        <View style={styles.reportRow}>
          <Text style={styles.reportLabel}>Average Order Value:</Text>
          <Text style={styles.reportValue}>{formatCurrency(analyticsSummary.avgOrderValue)}</Text>
        </View>

        <View style={styles.reportDivider} />

        <Text style={styles.reportSectionTitle}>Expenses Summary</Text>
        <View style={styles.reportRow}>
          <Text style={styles.reportLabel}>Total Expenses:</Text>
          <Text style={styles.reportValue}>{formatCurrency(analyticsSummary.totalExpenses)}</Text>
        </View>

        <View style={styles.reportDivider} />

        <Text style={styles.reportSectionTitle}>Profit Calculation</Text>
        <View style={styles.reportRow}>
          <Text style={styles.reportLabel}>Net Profit:</Text>
          <Text
            style={[
              styles.reportValue,
              { color: analyticsSummary.netProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' },
            ]}
          >
            {formatCurrency(analyticsSummary.netProfit)}
          </Text>
        </View>
        <View style={styles.reportRow}>
          <Text style={styles.reportLabel}>Profit Margin:</Text>
          <Text style={styles.reportValue}>
            {analyticsSummary.totalRevenue > 0
              ? `${((analyticsSummary.netProfit / analyticsSummary.totalRevenue) * 100).toFixed(2)}%`
              : '0.00%'}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render Sales Report
   */
  const renderSalesReport = () => {
    return (
      <View style={styles.reportContainer}>
        <View style={styles.reportTableHeader}>
          <Text style={[styles.reportTableHeaderText, { flex: 1 }]}>Date</Text>
          <Text style={[styles.reportTableHeaderText, { flex: 1.5 }]}>Order ID</Text>
          <Text style={[styles.reportTableHeaderText, { flex: 1 }]}>Amount</Text>
          <Text style={[styles.reportTableHeaderText, { flex: 1 }]}>Payment</Text>
        </View>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No orders found in the selected date range</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.reportTableRow}>
              <Text style={[styles.reportTableRowText, { flex: 1 }]}>{formatDate(order.createdAt)}</Text>
              <Text style={[styles.reportTableRowText, { flex: 1.5 }]}>{order.orderNumber}</Text>
              <Text style={[styles.reportTableRowText, { flex: 1 }]}>{formatCurrency(order.totalAmount)}</Text>
              <Text style={[styles.reportTableRowText, { flex: 1 }]}>{order.paymentMethod || 'N/A'}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  /**
   * Render Tax Report with GST Report Options
   * Uses actual taxAmount from orders (matching webPOS pattern)
   */
  const renderTaxReport = () => {
    // Calculate tax breakdown using actual taxAmount from orders
    const taxBreakdown: Record<string, number> = {};
    let totalTaxCollected = 0;

    // Use actual taxAmount from orders (matching webPOS pattern)
    orders.forEach((order) => {
      totalTaxCollected += order.taxAmount || 0;
      
      // Distribute tax by tax type based on tax percentages
      taxes.forEach((tax) => {
        if (!taxBreakdown[tax.name]) {
          taxBreakdown[tax.name] = 0;
        }
        // Calculate proportional tax amount based on tax percentage
        const totalTaxPercentage = taxes.reduce((sum, t) => sum + t.percentage, 0);
        if (totalTaxPercentage > 0) {
          taxBreakdown[tax.name] += (order.taxAmount || 0) * (tax.percentage / totalTaxPercentage);
        }
      });
    });

    return (
      <View style={styles.reportContainer}>
        {/* GST Report Options Section */}
        <View style={styles.gstOptionsSection}>
          <Text style={styles.reportSectionTitle}>GST Report Options</Text>
          
          {/* GST Report Type */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>GST Report Type</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowGstReportTypeDropdown(!showGstReportTypeDropdown);
                setShowGstStateCodeDropdown(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>{gstReportType}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {showGstReportTypeDropdown && (
              <View style={styles.dropdownList}>
                {(['GSTR-1', 'GSTR-2', 'GSTR-3B'] as GstReportType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.dropdownItem, gstReportType === type && styles.dropdownItemActive]}
                    onPress={() => {
                      setGstReportType(type);
                      setShowGstReportTypeDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, gstReportType === type && styles.dropdownItemTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Output Format */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Output Format</Text>
            <View style={styles.formatButtonsContainer}>
              <TouchableOpacity
                style={[styles.formatButton, gstOutputFormat === 'CSV' && styles.formatButtonActive]}
                onPress={() => setGstOutputFormat('CSV')}
                activeOpacity={0.7}
              >
                <Text style={[styles.formatButtonText, gstOutputFormat === 'CSV' && styles.formatButtonTextActive]}>
                  CSV
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formatButton, gstOutputFormat === 'JSON' && styles.formatButtonActive]}
                onPress={() => setGstOutputFormat('JSON')}
                activeOpacity={0.7}
              >
                <Text style={[styles.formatButtonText, gstOutputFormat === 'JSON' && styles.formatButtonTextActive]}>
                  JSON
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* State Code */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>State Code (Place of Supply)</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowGstStateCodeDropdown(!showGstStateCodeDropdown);
                setShowGstReportTypeDropdown(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>
                {indianStates.find(s => s.code === gstStateCode)?.name || `Code: ${gstStateCode}`}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {showGstStateCodeDropdown && (
              <ScrollView style={[styles.dropdownList, { maxHeight: 200 }]} nestedScrollEnabled={true}>
                {indianStates.map((state) => (
                  <TouchableOpacity
                    key={state.code}
                    style={[styles.dropdownItem, gstStateCode === state.code && styles.dropdownItemActive]}
                    onPress={() => {
                      setGstStateCode(state.code);
                      setShowGstStateCodeDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, gstStateCode === state.code && styles.dropdownItemTextActive]}>
                      {state.code} - {state.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.reportDivider} />

        <Text style={styles.reportSectionTitle}>Tax Breakdown by Type</Text>
        {taxes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No taxes configured. Configure taxes in Settings → Taxes & Charges</Text>
          </View>
        ) : (
          Object.entries(taxBreakdown).map(([taxName, amount]) => {
            const tax = taxes.find(t => t.name === taxName);
            return (
              <View key={tax?.id || taxName} style={styles.reportRow}>
                <Text style={styles.reportLabel}>
                  {taxName} ({tax?.percentage || 0}%):
                </Text>
                <Text style={styles.reportValue}>{formatCurrency(amount)}</Text>
              </View>
            );
          })
        )}
        <View style={styles.reportDivider} />
        <View style={styles.reportRow}>
          <Text style={[styles.reportLabel, { fontWeight: '700' }]}>Total Tax Collected:</Text>
          <Text style={[styles.reportValue, { fontWeight: '700' }]}>
            {formatCurrency(totalTaxCollected)}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render Expenses Report
   */
  const renderExpensesReport = () => {
    const expenseByCategory = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return (
      <View style={styles.reportContainer}>
        <Text style={styles.reportSectionTitle}>Expense Breakdown</Text>
        {Object.entries(expenseByCategory).map(([category, amount]) => (
          <View key={category} style={styles.reportRow}>
            <Text style={styles.reportLabel}>{category}:</Text>
            <Text style={styles.reportValue}>{formatCurrency(amount)}</Text>
          </View>
        ))}

        <View style={styles.reportDivider} />

        <Text style={styles.reportSectionTitle}>Detailed Expenses</Text>
        <View style={styles.reportTableHeader}>
          <Text style={[styles.reportTableHeaderText, { flex: 1 }]}>Date</Text>
          <Text style={[styles.reportTableHeaderText, { flex: 1.5 }]}>Category</Text>
          <Text style={[styles.reportTableHeaderText, { flex: 1 }]}>Amount</Text>
        </View>
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No expenses found in the selected date range</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.reportTableRow}>
              <Text style={[styles.reportTableRowText, { flex: 1 }]}>{formatDate(expense.date)}</Text>
              <Text style={[styles.reportTableRowText, { flex: 1.5 }]}>{expense.category}</Text>
              <Text style={[styles.reportTableRowText, { flex: 1 }]}>{formatCurrency(expense.amount)}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  /**
   * Render dynamic report based on selected type
   */
  const renderReport = () => {
    switch (reportType) {
      case 'pnl':
        return renderPnLReport();
      case 'sales':
        return renderSalesReport();
      case 'tax':
        return renderTaxReport();
      case 'expenses':
        return renderExpensesReport();
      default:
        return renderSalesReport();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading Reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reports & Analytics</Text>
          <Text style={styles.subtitle}>Track performance with date-wise filters and comprehensive insights.</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonIcon}>🔍</Text>
            <Text style={styles.actionButtonText}>Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleExportReport} activeOpacity={0.7}>
            <Text style={styles.actionButtonIcon}>📤</Text>
            <Text style={styles.actionButtonText}>Export</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={loadReportsData} activeOpacity={0.7}>
            <Text style={styles.actionButtonIcon}>🔄</Text>
            <Text style={styles.actionButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Filter & Date Range Selection */}
        <View style={styles.filterRow}>
          {/* Report Type Dropdown */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Report Type</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowReportTypeDropdown(!showReportTypeDropdown)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>
                {reportTypes.find((rt) => rt.id === reportType)?.icon} {reportTypes.find((rt) => rt.id === reportType)?.name}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {showReportTypeDropdown && (
              <View style={styles.dropdownList}>
                {reportTypes.map((rt) => (
                  <TouchableOpacity
                    key={rt.id}
                    style={[styles.dropdownItem, reportType === rt.id && styles.dropdownItemActive]}
                    onPress={() => {
                      setReportType(rt.id);
                      setShowReportTypeDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, reportType === rt.id && styles.dropdownItemTextActive]}>
                      {rt.icon} {rt.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Start Date */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Start Date</Text>
            <TextInput
              style={styles.dateInput}
              value={dateRange.startDate}
              placeholder="YYYY-MM-DD"
              editable={true}
              onChangeText={(text) => setDateRange({ ...dateRange, startDate: text })}
            />
          </View>

          {/* End Date */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>End Date</Text>
            <TextInput
              style={styles.dateInput}
              value={dateRange.endDate}
              placeholder="YYYY-MM-DD"
              editable={true}
              onChangeText={(text) => setDateRange({ ...dateRange, endDate: text })}
            />
          </View>
        </View>

        {/* Analytics Summary Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryCardsContainer} contentContainerStyle={styles.summaryCardsContent}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardIcon}>💰</Text>
            <Text style={styles.summaryCardLabel}>Total Revenue</Text>
            <Text style={styles.summaryCardValue}>{formatCurrency(analyticsSummary.totalRevenue)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardIcon}>🧾</Text>
            <Text style={styles.summaryCardLabel}>Total Orders</Text>
            <Text style={styles.summaryCardValue}>{analyticsSummary.totalOrders}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardIcon}>📦</Text>
            <Text style={styles.summaryCardLabel}>Average Order Value</Text>
            <Text style={styles.summaryCardValue}>{formatCurrency(analyticsSummary.avgOrderValue)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardIcon}>💸</Text>
            <Text style={styles.summaryCardLabel}>Total Expenses</Text>
            <Text style={styles.summaryCardValue}>{formatCurrency(analyticsSummary.totalExpenses)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardIcon}>📈</Text>
            <Text style={styles.summaryCardLabel}>Net Profit</Text>
            <Text
              style={[
                styles.summaryCardValue,
                { color: analyticsSummary.netProfit >= 0 ? '#10b981' : '#ef4444' },
              ]}
            >
              {formatCurrency(analyticsSummary.netProfit)}
            </Text>
          </View>
        </ScrollView>

        {/* Report Data Table (Dynamic Section) */}
        {renderReport()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#667eea',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  filterRow: {
    marginBottom: 20,
  },
  filterItem: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#64748b',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#f0f4ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1e293b',
  },
  dropdownItemTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: '#1e293b',
  },
  summaryCardsContainer: {
    marginBottom: 20,
  },
  summaryCardsContent: {
    paddingRight: 20,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  reportContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    marginTop: 8,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reportLabel: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  reportValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  reportTableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    marginBottom: 8,
  },
  reportTableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  reportTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reportTableRowText: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  gstOptionsSection: {
    marginBottom: 20,
  },
  formatButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  formatButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  formatButtonTextActive: {
    color: '#ffffff',
  },
});

export default ReportsScreen;
