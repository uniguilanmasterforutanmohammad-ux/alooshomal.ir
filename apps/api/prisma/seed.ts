import {
  PrismaClient,
  Role,
  NewsStatus,
  BiolinkStatus,
  TicketStatus,
  TicketPriority,
  ReportStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@alooshomal.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'مدیر سامانه',
      role: Role.ADMIN,
    },
  });

  const demoEmail = 'demo@alooshomal.local';
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      passwordHash: await bcrypt.hash('Demo@12345', 12),
      fullName: 'کاربر نمونه',
      role: Role.USER,
    },
  });

  const cityNames = ['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج'];
  const businessNames = [
    'فناوری اطلاعات',
    'طراحی و گرافیک',
    'بازاریابی و فروش',
    'مالی و حسابداری',
    'آموزش',
    'پزشکی و سلامت',
    'ساختمان و عمران',
    'رستوران و کافه',
  ];

  const cities: Record<string, string> = {};
  for (const name of cityNames) {
    const city = await prisma.city.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    cities[name] = city.id;
  }

  const businesses: Record<string, string> = {};
  for (const name of businessNames) {
    const business = await prisma.businessCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    businesses[name] = business.id;
  }

  await prisma.biolink.upsert({
    where: { slug: 'demo-biolink' },
    update: {},
    create: {
      userId: demoUser.id,
      slug: 'demo-biolink',
      cityId: cities['تهران'],
      businessId: businesses['فناوری اطلاعات'],
      fullName: 'سارا محمدی',
      jobTitle: 'مدیر محصول',
      company: 'آلوشمال',
      bio: 'بیولینک دیجیتال نمونه برای آزمایش سامانه.',
      phone: '09120000000',
      email: demoEmail,
      website: 'https://example.com',
      status: BiolinkStatus.APPROVED,
      isPublished: true,
      approvedAt: new Date(),
      publishedAt: new Date(),
    },
  });

  await prisma.businessCard.upsert({
    where: { slug: 'demo-business-card' },
    update: {},
    create: {
      userId: demoUser.id,
      slug: 'demo-business-card',
      cityId: cities['تهران'],
      businessId: businesses['فناوری اطلاعات'],
      fullName: 'سارا محمدی',
      jobTitle: 'مدیر محصول',
      company: 'آلوشمال',
      bio: 'کارت ویزیت دیجیتال نمونه برای آزمایش سامانه.',
      phone: '09120000000',
      email: demoEmail,
      website: 'https://example.com',
      template: 'glassmorphism',
      status: BiolinkStatus.APPROVED,
      isPublished: true,
      approvedAt: new Date(),
      publishedAt: new Date(),
    },
  });

  console.log('✓ Seed complete');
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Demo:  ${demoUser.email}`);
  console.log(`  Cities: ${cityNames.length}`);
  console.log(`  Businesses: ${businessNames.length}`);

  const ticketSeed: Array<{
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    userId: string | null;
  }> = [
    { subject: 'مشکل در ویرایش بیولینک', status: TicketStatus.OPEN, priority: TicketPriority.HIGH, userId: demoUser.id },
    { subject: 'درخواست بررسی سریع‌تر', status: TicketStatus.IN_PROGRESS, priority: TicketPriority.NORMAL, userId: demoUser.id },
    { subject: 'سوال درباره QR کد', status: TicketStatus.OPEN, priority: TicketPriority.LOW, userId: demoUser.id },
    { subject: 'خطا در ورود به حساب', status: TicketStatus.CLOSED, priority: TicketPriority.HIGH, userId: null },
    { subject: 'درخواست افزودن شهر جدید', status: TicketStatus.IN_PROGRESS, priority: TicketPriority.NORMAL, userId: null },
  ];

  // Seeded tickets use fixed ids and are created with `upsert` (never deleted),
  // so re-running the seed on a live database never removes real support
  // tickets. Only the sample rows with `seed-ticket-*` ids are touched.
  for (const [index, ticket] of ticketSeed.entries()) {
    const firstMessage =
      'این تیکت نمونه برای نمایش در داشبورد مدیریت ایجاد شده است.';
    const id = `seed-ticket-${index + 1}`;
    await prisma.ticket.upsert({
      where: { id },
      update: {},
      create: {
        id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        userId: ticket.userId,
        message: firstMessage,
        messages: {
          create: [
            { body: firstMessage, authorId: ticket.userId, isStaff: false },
            ...(ticket.status === 'IN_PROGRESS' || ticket.status === 'CLOSED'
              ? [
                  {
                    body: 'کارشناس پشتیبانی در حال بررسی این تیکت است.',
                    authorId: admin.id,
                    isStaff: true,
                  },
                ]
              : []),
          ],
        },
      },
    });
  }

  const reportSeed: Array<{
    title: string;
    type: string;
    status: ReportStatus;
  }> = [
    { title: 'گزارش کاربران جدید', type: 'users', status: ReportStatus.READY },
    { title: 'گزارش بیولینک‌های منتشرشده', type: 'biolinks', status: ReportStatus.READY },
    { title: 'گزارش تیکت‌های پشتیبانی', type: 'tickets', status: ReportStatus.PROCESSING },
    { title: 'گزارش بازدید بیولینک‌ها', type: 'scans', status: ReportStatus.READY },
  ];

  // Reports also use fixed ids and are upserted, so live reports are preserved.
  for (const [index, report] of reportSeed.entries()) {
    const id = `seed-report-${index + 1}`;
    await prisma.report.upsert({
      where: { id },
      update: {},
      create: {
        id,
        title: report.title,
        type: report.type,
        status: report.status,
        sizeBytes: 12_400 + index * 7_300 + 5_100,
      },
    });
  }

  console.log(`  Tickets: ${ticketSeed.length}`);
  console.log(`  Reports: ${reportSeed.length}`);

  // ---- «نبض شهر»: default categories + a couple of sample headlines ----
  const newsCategories = ['شهری', 'فرهنگی', 'ورزشی', 'اقتصادی', 'اجتماعی'];
  // Categories are keyed by their unique `name` and upserted (never deleted), so
  // admin-created categories and live news are untouched by a re-seed.
  const createdCategories = await Promise.all(
    newsCategories.map((name) =>
      prisma.newsCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const sampleNews: Array<{ title: string; summary: string; publisher: string; categoryIndex: number }> = [
    {
      title: 'افتتاح پارک محله پس از بازسازی',
      summary: 'پارک مرکزی محله با امکانات تازه در اختیار شهروندان قرار گرفت.',
      publisher: 'روابط عمومی شهرداری',
      categoryIndex: 0,
    },
    {
      title: 'برگزاری جشنواره فرهنگی شهر',
      summary: 'جشنواره فرهنگی با حضور هنرمندان محلی این هفته برگزار می‌شود.',
      publisher: 'خبرنگار محله',
      categoryIndex: 1,
    },
  ];
  for (const item of sampleNews) {
    // The sample headlines have no natural unique key; only create them when an
    // identical headline does not already exist, so re-seeding is idempotent
    // and never wipes real «نبض شهر» content.
    const existing = await prisma.newsItem.findFirst({
      where: { title: item.title, publisherName: item.publisher },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.newsItem.create({
      data: {
        title: item.title,
        summary: item.summary,
        publisherName: item.publisher,
        categoryId: createdCategories[item.categoryIndex]?.id ?? null,
        status: NewsStatus.APPROVED,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  console.log(`  News categories: ${newsCategories.length}`);
  console.log(`  Sample news: ${sampleNews.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
