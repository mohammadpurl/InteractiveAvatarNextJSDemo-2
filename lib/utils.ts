import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// تابع تبدیل رشته‌های تاریخ فارسی به DateObject
// این تابع انواع مختلف فرمت‌های تاریخ فارسی را پشتیبانی می‌کند:
// - "28 مرداد 1404"
// - "28/05/1404" یا "28-05-1404"
// - "1404/05/28" یا "1404-05-28"
// - "28 مرداد" (بدون سال - سال جاری استفاده می‌شود)

// نگاشت نام ماه‌های فارسی به شماره ماه
const persianMonths: { [key: string]: number } = {
  'فروردین': 1,
  'اردیبهشت': 2,
  'خرداد': 3,
  'تیر': 4,
  'مرداد': 5,
  'شهریور': 6,
  'مهر': 7,
  'آبان': 8,
  'آذر': 9,
  'دی': 10,
  'بهمن': 11,
  'اسفند': 12,
};

export function parsePersianDate(dateString: string): DateObject | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const normalizedDate = dateString.trim();
  
  try {
    // فرمت "28 مرداد 1404"
    if (/^\d+\s+[آ-ی]+\s+\d{4}$/.test(normalizedDate)) {
      // تجزیه رشته تاریخ
      const parts = normalizedDate.split(' ');
      const day = parseInt(parts[0]);
      const monthName = parts[1];
      const year = parseInt(parts[2]);
      
      const month = persianMonths[monthName];
      if (!month) {
        console.warn('نام ماه نامعتبر:', monthName);
        return null;
      }
      
      return new DateObject({
        year,
        month,
        day,
        calendar: persian,
        locale: persian_fa,
      });
    }
    
    // فرمت "28/05/1404" یا "28-05-1404"
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(normalizedDate)) {
      const separator = normalizedDate.includes('/') ? '/' : '-';
      
      // تبدیل به فرمت استاندارد
      const parts = normalizedDate.split(separator);
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      return new DateObject({
        year,
        month,
        day,
        calendar: persian,
        locale: persian_fa,
      });
    }
    
    // فرمت "1404/05/28" یا "1404-05-28"
    if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(normalizedDate)) {
      const separator = normalizedDate.includes('/') ? '/' : '-';
      
      // تبدیل به فرمت استاندارد
      const parts = normalizedDate.split(separator);
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      
      return new DateObject({
        year,
        month,
        day,
        calendar: persian,
        locale: persian_fa,
      });
    }
    
    // فرمت "28 مرداد" (بدون سال)
    if (/^\d+\s+[آ-ی]+$/.test(normalizedDate)) {
      const currentYear = new DateObject({ calendar: persian }).year;
      
      // تجزیه رشته تاریخ
      const parts = normalizedDate.split(' ');
      const day = parseInt(parts[0]);
      const monthName = parts[1];
      
      const month = persianMonths[monthName];
      if (!month) {
        console.warn('نام ماه نامعتبر:', monthName);
        return null;
      }
      
      return new DateObject({
        year: currentYear,
        month,
        day,
        calendar: persian,
        locale: persian_fa,
      });
    }
    
    // تلاش برای تشخیص خودکار فرمت
    return new DateObject({
      date: normalizedDate,
      calendar: persian,
      locale: persian_fa,
    });
    
  } catch (error) {
    console.warn('خطا در تبدیل تاریخ:', normalizedDate, error);
    return null;
  }
}
