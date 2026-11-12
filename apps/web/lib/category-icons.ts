import {
  Banknote,
  BedDouble,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Calculator,
  Camera,
  Car,
  Coffee,
  Dumbbell,
  Factory,
  Gamepad2,
  Gavel,
  GraduationCap,
  HardHat,
  HeartPulse,
  Home,
  Laptop,
  LayoutGrid,
  Megaphone,
  Music,
  Palette,
  Pill,
  Plane,
  Scale,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Store,
  Truck,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

/**
 * Keyword → icon map for the public category tiles. The API only stores a
 * category name, so the icon is chosen from the words in that name; the
 * fallback keeps every category (including admin-created ones) presentable.
 */
const ICON_RULES: Array<{ words: string[]; Icon: LucideIcon }> = [
  { words: ['کافه', 'قهوه'], Icon: Coffee },
  { words: ['رستوران', 'غذا', 'فست'], Icon: UtensilsCrossed },
  { words: ['آرایش', 'پیرایش', 'سالن'], Icon: Scissors },
  { words: ['زیبایی', 'اسپا', 'پوست'], Icon: Sparkles },
  { words: ['دارو', 'درمان'], Icon: Pill },
  { words: ['پزشک', 'سلامت', 'کلینیک', 'دندان'], Icon: Stethoscope },
  { words: ['قلب', 'بیمارستان'], Icon: HeartPulse },
  { words: ['ورزش', 'باشگاه', 'تناسب'], Icon: Dumbbell },
  { words: ['اقامت', 'هتل', 'مسافرخانه'], Icon: BedDouble },
  { words: ['وکیل', 'حقوق', 'قانون'], Icon: Gavel },
  { words: ['قاضی', 'دادگستری'], Icon: Scale },
  { words: ['خودرو', 'ماشین', 'کارواش', 'تعمیرگاه'], Icon: Car },
  { words: ['فناوری', 'کامپیوتر', 'نرم‌افزار', 'دیجیتال', 'آی‌تی'], Icon: Laptop },
  { words: ['ساختمان', 'عمران', 'پیمان', 'معمار'], Icon: HardHat },
  { words: ['بازاریابی', 'تبلیغ', 'فروش'], Icon: Megaphone },
  { words: ['حساب', 'مالی', 'بیمه'], Icon: Calculator },
  { words: ['بانک'], Icon: Banknote },
  { words: ['خانه', 'املاک'], Icon: Home },
  { words: ['صنعتی', 'کارخانه'], Icon: Factory },
  { words: ['سرگرمی', 'تفریح'], Icon: Gamepad2 },
  { words: ['طراحی', 'گرافیک', 'عکاسی'], Icon: Palette },
  { words: ['آموزش', 'مدرسه', 'کلاس'], Icon: GraduationCap },
  { words: ['کتاب', 'نشر'], Icon: BookOpen },
  { words: ['موسیقی', 'آهنگ'], Icon: Music },
  { words: ['عکس', 'دوربین'], Icon: Camera },
  { words: ['فروشگاه', 'خرید', 'پوشاک'], Icon: ShoppingBag },
  { words: ['حمل', 'بار', 'انتقال'], Icon: Truck },
  { words: ['مسافر', 'سفر', 'تور', 'آژانس', 'گردش'], Icon: Plane },
  { words: ['تعمیر', 'خدمات فنی', 'خدمات'], Icon: Wrench },
  { words: ['مغازه', 'کسب‌وکار'], Icon: Store },
  { words: ['اداری', 'شرکت'], Icon: Building2 },
  { words: ['سایر'], Icon: LayoutGrid },
];

export function categoryIcon(name: string): LucideIcon {
  const normalized = name.replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
  for (const rule of ICON_RULES) {
    if (rule.words.some((word) => normalized.includes(word))) return rule.Icon;
  }
  return BriefcaseBusiness;
}
