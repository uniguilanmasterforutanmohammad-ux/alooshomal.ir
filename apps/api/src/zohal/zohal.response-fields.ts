/**
 * GENERATED FILE — do not edit by hand.
 *
 * Response `data` fields of every Zohal service keyed by its `path`,
 * taken from the official OpenAPI contract (`api-1.json`). Run
 * `python3 scripts/sync_zohal_response_fields.py --spec api-1.json` to
 * regenerate it. The panel uses these fields to offer the comparable
 * response values of a module.
 */
import type { ZohalResponseField } from './zohal.types';

export const ZOHAL_RESPONSE_FIELDS: Record<string, ZohalResponseField[]> = {
  '/api/v0/services/inquiry/account_to_iban': [
    { name: 'iban', label: 'شبا', example: 'IR000000000000000000000000' },
  ],
  '/api/v0/services/inquiry/bill/electricity': [
    { name: 'address', label: 'آدرس', example: 'تهران، خیابان ولیعصر' },
    { name: 'amount', label: 'مبلغ', example: '250000' },
    { name: 'full_name', label: 'نام و نام خانوادگی', example: 'نام و نام خانوادگی' },
    { name: 'bill_id', label: 'شناسه قبض', example: '123456789' },
    { name: 'current_date', label: 'تاریخ جاری', example: '1403/01/01' },
    { name: 'previous_date', label: 'تاریخ قبلی', example: '1402/12/01' },
    { name: 'payment_id', label: 'شناسه پرداخت', example: '987654321' },
    { name: 'payment_date', label: 'تاریخ پرداخت', example: '1403/01/15' },
    { name: 'account_type', label: 'نوع حساب', example: 'خانگی' },
  ],
  '/api/v0/services/inquiry/bill/fixed_line': [
    { name: 'final_term', label: 'بدهی نهایی' },
    { name: 'mid_term', label: 'بدهی میان‌مدت' },
  ],
  '/api/v0/services/inquiry/bill/gas': [
    { name: 'address', label: 'آدرس', example: 'تهران، خیابان ولیعصر' },
    { name: 'amount', label: 'مبلغ', example: '180000' },
    { name: 'full_name', label: 'نام و نام خانوادگی', example: 'نام و نام خانوادگی' },
    { name: 'bill_id', label: 'شناسه قبض', example: '123456789' },
    { name: 'current_reading_date', label: 'تاریخ قرائت فعلی', example: '1403/01/01' },
    { name: 'previous_reading_date', label: 'تاریخ قرائت قبلی', example: '1402/12/01' },
    { name: 'payment_date', label: 'تاریخ پرداخت', example: '1403/01/15' },
    { name: 'consumption_type', label: 'نوع مصرف', example: 'خانگی' },
    { name: 'payment_id', label: 'شناسه پرداخت', example: '987654321' },
    { name: 'previous_counter_value', label: 'رقم کنتور قبلی', example: '100' },
    { name: 'current_counter_value', label: 'رقم کنتور فعلی', example: '120' },
    { name: 'subscription', label: 'اشتراک', example: '10000' },
    { name: 'taxes', label: 'مالیات', example: '5000' },
    { name: 'insurance', label: 'بیمه', example: '0' },
  ],
  '/api/v0/services/inquiry/bill/irancell': [
    { name: 'final_term', label: 'بدهی نهایی' },
    { name: 'mid_term', label: 'بدهی میان‌مدت' },
  ],
  '/api/v0/services/inquiry/bill/mci': [
    { name: 'final_term', label: 'بدهی نهایی' },
    { name: 'mid_term', label: 'بدهی میان‌مدت' },
  ],
  '/api/v0/services/inquiry/bill/rightel': [
    { name: 'final_term', label: 'بدهی نهایی' },
    { name: 'mid_term', label: 'بدهی میان‌مدت' },
  ],
  '/api/v0/services/inquiry/bill/water': [
    { name: 'address', label: 'آدرس', example: 'تهران، خیابان ولیعصر' },
    { name: 'amount', label: 'مبلغ', example: '90000' },
    { name: 'bill_id', label: 'شناسه قبض', example: '123456789' },
    { name: 'current_date', label: 'تاریخ جاری', example: '1403/01/01' },
    { name: 'previous_date', label: 'تاریخ قبلی', example: '1402/12/01' },
    { name: 'payment_id', label: 'شناسه پرداخت', example: '987654321' },
    { name: 'payment_date', label: 'تاریخ پرداخت', example: '1403/01/15' },
    { name: 'full_name', label: 'نام و نام خانوادگی', example: 'نام و نام خانوادگی' },
    { name: 'account_type', label: 'نوع حساب', example: 'خانگی' },
  ],
  '/api/v0/services/inquiry/bounced_cheque': [
    { name: 'count', label: 'تعداد', example: '0' },
  ],
  '/api/v0/services/inquiry/card_inquiry': [
    { name: 'name', label: 'نام', example: 'نام و نام خانوادگی' },
  ],
  '/api/v0/services/inquiry/card_to_account': [
    { name: 'name', label: 'نام', example: 'نام و نام خانوادگی' },
    { name: 'bank_account', label: 'شماره حساب', example: '1234567890' },
    { name: 'bank_name', label: 'نام بانک', example: 'بانک ملت' },
  ],
  '/api/v0/services/inquiry/card_to_iban': [
    { name: 'name', label: 'نام', example: 'نام و نام خانوادگی' },
    { name: 'IBAN', label: 'شبا', example: 'IR000000000000000000000000' },
    { name: 'bank_name', label: 'نام بانک', example: 'بانک ملت' },
  ],
  '/api/v0/services/inquiry/check_card_with_name': [
    { name: 'matched', label: 'نتیجه‌ی تطبیق', example: 'true' },
  ],
  '/api/v0/services/inquiry/check_card_with_national_code': [
    { name: 'matched', label: 'نتیجه‌ی تطبیق', example: 'true' },
  ],
  '/api/v0/services/inquiry/check_iban_with_name': [
    { name: 'matched', label: 'نتیجه‌ی تطبیق', example: 'true' },
  ],
  '/api/v0/services/inquiry/check_iban_with_national_code': [
    { name: 'matched', label: 'نتیجه‌ی تطبیق', example: 'true' },
  ],
  '/api/v0/services/inquiry/check_sayad_inquiry': [
    { name: 'sayad_id', label: 'شناسه صیاد', example: '1234567890123456' },
    { name: 'iban', label: 'شبا', example: 'IR000000000000000000000000' },
    { name: 'issue_date', label: 'تاریخ صدور', example: '1402/01/01' },
    { name: 'expiration_date', label: 'تاریخ انقضا', example: '1402/06/01' },
    { name: 'serial_no', label: 'شماره سری', example: '123' },
    { name: 'series_no', label: 'شماره سری', example: '1' },
    { name: 'check_type', label: 'نوع چک', example: '1' },
    { name: 'branch_code', label: 'کد شعبه', example: '1234' },
    { name: 'name', label: 'نام', example: 'نام و نام خانوادگی' },
    { name: 'returned_cheques', label: 'چک‌های برگشتی', example: '0' },
  ],
  '/api/v0/services/inquiry/check_sayad_inquiry/chain': [
    { name: 'chain', label: 'زنجیره' },
  ],
  '/api/v0/services/inquiry/check_sayad_inquiry/submitted': [
    { name: 'status', label: 'وضعیت', example: 'true' },
  ],
  '/api/v0/services/inquiry/company_inquiry': [
    { name: 'activity_end_date', label: 'تاریخ پایان فعالیت' },
    { name: 'address', label: 'آدرس', example: 'تهران، خیابان ولیعصر' },
    { name: 'company_type', label: 'نوع شرکت', example: 'سهامی خاص' },
    { name: 'created_at', label: 'تاریخ ایجاد' },
    { name: 'email_address', label: 'ایمیل' },
    { name: 'fax_number', label: 'شماره نمابر' },
    { name: 'phone_number', label: 'شماره تلفن', example: '02112345678' },
    { name: 'issuance_date', label: 'تاریخ صدور' },
    { name: 'name', label: 'نام', example: 'شرکت نمونه' },
    { name: 'national_id', label: 'شناسه ملی', example: '10123456789' },
    { name: 'postal_code', label: 'کد پستی', example: '1234567890' },
    { name: 'register_date', label: 'تاریخ ثبت', example: '1390/01/01' },
    { name: 'register_number', label: 'شماره ثبت', example: '12345' },
  ],
  '/api/v0/services/inquiry/company_inquiry/board_members': [
    { name: 'company_title', label: 'نام شرکت', example: 'شرکت نمونه' },
    { name: 'board_members', label: 'اعضای هیئت‌مدیره' },
  ],
  '/api/v0/services/inquiry/company_inquiry/board_members/history': [
    { name: 'company_title', label: 'نام شرکت', example: 'شرکت نمونه' },
    { name: 'board_members', label: 'اعضای هیئت‌مدیره' },
  ],
  '/api/v0/services/inquiry/enamad_inquiry': [
    { name: 'message', label: 'پیام', example: 'نماد دارد.' },
    { name: 'expired', label: 'منقضی‌شده', example: 'false' },
    { name: 'srv_text', label: 'متن سرویس', example: 'فروش کالا' },
    { name: 'state_name', label: 'نام استان', example: 'تهران' },
    { name: 'city_name', label: 'نام شهر', example: 'تهران' },
    { name: 'approve_date', label: 'تاریخ تأیید', example: '1400/01/01' },
    { name: 'expiry_date', label: 'تاریخ انقضا', example: '1405/01/01' },
  ],
  '/api/v0/services/inquiry/iban': [
    { name: 'name', label: 'نام', example: 'نام شخص' },
    { name: 'bank_name', label: 'نام بانک', example: 'نام بانک' },
    { name: 'is_transferable', label: 'قابل انتقال', example: 'true' },
  ],
  '/api/v0/services/inquiry/national_card_ocr': [
    { name: 'front', label: 'روی' },
    { name: 'back', label: 'پشت' },
  ],
  '/api/v0/services/inquiry/national_identity_inquiry': [
    { name: 'matched', label: 'نتیجه‌ی تطبیق', example: 'true' },
    { name: 'first_name', label: 'نام', example: 'نام' },
    { name: 'national_code', label: 'کد ملی', example: '0012345678' },
    { name: 'last_name', label: 'نام خانوادگی', example: 'نام خانوادگی' },
    { name: 'father_name', label: 'نام پدر', example: 'نام' },
    { name: 'alive', label: 'زنده بودن', example: 'true' },
    { name: 'is_dead', label: 'فوت‌شده', example: 'false' },
  ],
  '/api/v0/services/inquiry/persian_to_finglish': [
    { name: 'finglish_text', label: 'متن فینگلیش', example: 'Ali' },
  ],
  '/api/v0/services/inquiry/postal_code_inquiry': [
    { name: 'address', label: 'آدرس' },
  ],
  '/api/v0/services/inquiry/shahkar': [
    { name: 'matched', label: 'نتیجه‌ی تطبیق', example: 'true' },
  ],
  '/api/v0/services/inquiry/vehicle_inquiry/total_violations': [
    { name: 'plate', label: 'پلاک', example: '12ب345ایران67' },
    { name: 'price_status', label: 'وضعیت قیمت', example: 'قابل پرداخت' },
    { name: 'page_count', label: 'تعداد صفحه', example: '1' },
    { name: 'paper_id', label: 'شناسه برگه', example: '123456' },
    { name: 'payment_id', label: 'شناسه پرداخت', example: '654321' },
    { name: 'warning_price', label: 'مبلغ اخطار', example: '1000000' },
    { name: 'inquire_price', label: 'هزینه‌ی استعلام', example: '0' },
    { name: 'ejr_inquire_no', label: 'شماره استعلام اجرا', example: '789' },
  ],
  '/api/v0/services/inquiry/vehicle_inquiry/violations_details': [
    { name: 'warnings', label: 'اخطارها' },
  ],
  '/api/v0/services/inquiry/voice_otp': [
    { name: 'message', label: 'پیام', example: 'درخواست با موفقیت ثبت شد.' },
  ],
};
