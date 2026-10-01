import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number | null | undefined, currency = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(typeof amount === 'number' && Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(num: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN').format(
    typeof num === 'number' && Number.isFinite(num) ? num : 0
  );
}

/** Normalises anything date-like into a valid Date, or null when unusable. */
function toValidDate(date: Date | string | null | undefined): Date | null {
  if (date === null || date === undefined || date === '') return null;
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
  date: Date | string | null | undefined,
  format = 'DD-MM-YYYY'
): string {
  const parsed = toValidDate(date);
  if (!parsed) return '-';
  const d = parsed;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return `${day}-${month}-${year}`;
  }
}

export function formatTime(date: Date | string | null | undefined): string {
  const d = toValidDate(date);
  if (!d) return '-';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  const d = toValidDate(date);
  if (!d) return '-';
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function calculateGST(amount: number, rate: number): { cgst: number; sgst: number; total: number } {
  const gst = (amount * rate) / 100;
  return {
    cgst: gst / 2,
    sgst: gst / 2,
    total: amount + gst,
  };
}

export function roundOff(amount: number, nearest = 1): number {
  return Math.round(amount / nearest) * nearest;
}

export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

export function getCurrentFinancialYear(): string {
  return getFinancialYear(new Date());
}

export function generateDocumentNumber(prefix: string, sequence: number, fy?: string): string {
  const financialYear = fy || getCurrentFinancialYear();
  return `${prefix}/${financialYear}/${String(sequence).padStart(4, '0')}`;
}

export function roundTo2(num: number): number {
  return Math.round(num * 100) / 100;
}

export function isSameState(companyState: string | null | undefined, partyState: string | null | undefined): boolean {
  if (!companyState || !partyState) return false;
  return companyState.toLowerCase().trim() === partyState.toLowerCase().trim();
}

export function getStateCode(state: string): string {
  const stateCodeMap: Record<string, string> = {
    'jammu & kashmir': '01', 'himachal pradesh': '02', 'punjab': '03',
    'chandigarh': '04', 'uttarakhand': '05', 'haryana': '06',
    'delhi': '07', 'rajasthan': '08', 'uttar pradesh': '09',
    'bihar': '10', 'sikkim': '11', 'arunachal pradesh': '12',
    'nagaland': '13', 'manipur': '14', 'mizoram': '15',
    'tripura': '16', 'meghalaya': '17', 'assam': '18',
    'west bengal': '19', 'jharkhand': '20', 'odisha': '21',
    'chhattisgarh': '22', 'madhya pradesh': '23', 'gujarat': '24',
    'daman & diu': '25', 'dadra & nagar haveli': '26', 'maharashtra': '27',
    'andhra pradesh (old)': '28', 'karnataka': '29', 'goa': '30',
    'lakshadweep': '31', 'kerala': '32', 'tamil nadu': '33',
    'puducherry': '34', 'andaman & nicobar islands': '35', 'telangana': '36',
    'andhra pradesh': '37', 'ladakh': '38',
  };
  return stateCodeMap[state.toLowerCase().trim()] || '97';
}

export function amountInWords(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertGroup(n % 100) : '');
  }

  const wholePart = Math.round(amount);
  const paise = Math.round((amount - wholePart) * 100);

  if (wholePart === 0 && paise === 0) return 'Rupees Zero Only';

  let result = 'Rupees ';

  if (wholePart >= 10000000) {
    result += convertGroup(Math.floor(wholePart / 10000000)) + ' Crore ';
  }
  if (wholePart >= 100000) {
    result += convertGroup(Math.floor((wholePart % 10000000) / 100000)) + ' Lakh ';
  }
  if (wholePart >= 1000) {
    result += convertGroup(Math.floor((wholePart % 100000) / 1000)) + ' Thousand ';
  }
  if (wholePart >= 100) {
    result += convertGroup(Math.floor((wholePart % 1000) / 100)) + ' Hundred ';
  }
  if (wholePart % 100 > 0) {
    result += convertGroup(wholePart % 100) + ' ';
  }

  if (wholePart === 0) {
    result += 'Zero ';
  }

  result = result.trim();

  if (paise > 0) {
    result += ' and ' + convertGroup(paise) + ' Paise';
  }

  result += ' Only';
  return result;
}
