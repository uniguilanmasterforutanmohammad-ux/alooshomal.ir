import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateClassDto,
  CreateEduExpenseDto,
  CreateEduPaymentDto,
  CreateEnrollmentDto,
  CreateProgressDto,
  CreateSessionDto,
  CreateSettlementDto,
  CreateStudentDto,
  RecordAttendanceDto,
  ReviewEduPaymentDto,
  UpdateClassDto,
  UpdateEnrollmentDto,
  UpdateProgressDto,
  UpdateSessionDto,
  UpdateSettlementDto,
  UpdateStudentDto,
} from './dto/education.dto';

const big = (value: number | null | undefined): bigint | null =>
  value == null ? null : BigInt(Math.trunc(value));
const num = (value: number | bigint | null | undefined): number =>
  value == null ? 0 : Number(value);

@Injectable()
export class EducationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
  ) {}

  private workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  private async klass(workspaceId: string, id: string) {
    const row = await this.prisma.eduClass.findFirst({ where: { id, workspaceId } });
    if (!row) throw new NotFoundException('کلاس پیدا نشد');
    return row;
  }

  private async student(workspaceId: string, id: string) {
    const row = await this.prisma.eduStudent.findFirst({ where: { id, workspaceId } });
    if (!row) throw new NotFoundException('هنرجو پیدا نشد');
    return row;
  }

  private async enrollment(workspaceId: string, id: string) {
    const row = await this.prisma.eduEnrollment.findFirst({ where: { id, workspaceId } });
    if (!row) throw new NotFoundException('ثبت‌نام پیدا نشد');
    return row;
  }

  /** Recompute used sessions + paid amount from attendance and approved payments. */
  private async recomputeEnrollment(enrollmentId: string) {
    const [attendance, payments, current] = await Promise.all([
      this.prisma.eduAttendance.count({
        where: { enrollmentId, consumesCredit: true },
      }),
      this.prisma.eduPayment.findMany({
        where: { enrollmentId, status: 'APPROVED' },
        select: { amount: true },
      }),
      this.prisma.eduEnrollment.findUnique({ where: { id: enrollmentId } }),
    ]);
    const paid = payments.reduce((sum, row) => sum + num(row.amount), 0);
    const completed =
      current != null && current.packageSessions > 0 && attendance >= current.packageSessions;
    return this.prisma.eduEnrollment.update({
      where: { id: enrollmentId },
      data: {
        usedSessions: attendance,
        paidAmount: BigInt(paid),
        ...(completed && current?.status === 'ACTIVE' ? { status: 'COMPLETED' } : {}),
      },
    });
  }

  // -------------------------------------------------------------------------
  //  Classes
  // -------------------------------------------------------------------------

  async listClasses(userId: string, filters: { status?: string; discipline?: string }) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.eduClass.findMany({
      where: {
        workspaceId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.discipline ? { discipline: filters.discipline } : {}),
      },
      include: {
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 300,
    });
  }

  async getClass(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const row = await this.prisma.eduClass.findFirst({
      where: { id, workspaceId },
      include: {
        enrollments: {
          orderBy: { createdAt: 'desc' },
          include: { student: { select: { id: true, fullName: true, phone: true } } },
        },
        sessions: { orderBy: { scheduledAt: 'desc' }, take: 20 },
      },
    });
    if (!row) throw new NotFoundException('کلاس پیدا نشد');
    return row;
  }

  async createClass(userId: string, dto: CreateClassDto) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.eduClass.create({
      data: {
        workspaceId,
        title: dto.title.trim(),
        discipline: dto.discipline ?? 'SPORT',
        mode: dto.mode ?? 'GROUP',
        delivery: dto.delivery ?? 'IN_PERSON',
        level: dto.level?.trim() || null,
        capacity: dto.capacity ?? 10,
        durationMin: dto.durationMin ?? 60,
        price: big(dto.price) ?? 0n,
        sessionsPerPackage: dto.sessionsPerPackage ?? 8,
        location: dto.location?.trim() || null,
        coachName: dto.coachName?.trim() || null,
        prerequisites: dto.prerequisites?.trim() || null,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async updateClass(userId: string, id: string, dto: UpdateClassDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.klass(workspaceId, id);
    return this.prisma.eduClass.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.discipline !== undefined ? { discipline: dto.discipline } : {}),
        ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
        ...(dto.delivery !== undefined ? { delivery: dto.delivery } : {}),
        ...(dto.level !== undefined ? { level: dto.level.trim() || null } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin } : {}),
        ...(dto.price !== undefined ? { price: big(dto.price) ?? 0n } : {}),
        ...(dto.sessionsPerPackage !== undefined
          ? { sessionsPerPackage: dto.sessionsPerPackage }
          : {}),
        ...(dto.location !== undefined ? { location: dto.location.trim() || null } : {}),
        ...(dto.coachName !== undefined ? { coachName: dto.coachName.trim() || null } : {}),
        ...(dto.prerequisites !== undefined
          ? { prerequisites: dto.prerequisites.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
    });
  }

  async removeClass(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    await this.klass(workspaceId, id);
    await this.prisma.eduClass.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Students + enrollments
  // -------------------------------------------------------------------------

  async listStudents(userId: string, filters: { status?: string; q?: string }) {
    const workspaceId = await this.workspaceId(userId);
    const q = filters.q?.trim();
    return this.prisma.eduStudent.findMany({
      where: {
        workspaceId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { guardianPhone: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: { select: { id: true, title: true } } },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 400,
    });
  }

  async getStudent(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const row = await this.prisma.eduStudent.findFirst({
      where: { id, workspaceId },
      include: {
        enrollments: {
          orderBy: { createdAt: 'desc' },
          include: {
            class: { select: { id: true, title: true, sessionsPerPackage: true } },
            payments: { orderBy: { createdAt: 'desc' }, take: 20 },
            progress: { orderBy: { date: 'desc' }, take: 20 },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('هنرجو پیدا نشد');
    return row;
  }

  async createStudent(userId: string, dto: CreateStudentDto) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.eduStudent.create({
      data: {
        workspaceId,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        guardianName: dto.guardianName?.trim() || null,
        guardianPhone: dto.guardianPhone?.trim() || null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        goal: dto.goal?.trim() || null,
        level: dto.level?.trim() || null,
        source: dto.source?.trim() || null,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes?.trim() || null,
        nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : null,
      },
    });
  }

  async updateStudent(userId: string, id: string, dto: UpdateStudentDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.student(workspaceId, id);
    return this.prisma.eduStudent.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.guardianName !== undefined
          ? { guardianName: dto.guardianName.trim() || null }
          : {}),
        ...(dto.guardianPhone !== undefined
          ? { guardianPhone: dto.guardianPhone.trim() || null }
          : {}),
        ...(dto.birthDate !== undefined
          ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }
          : {}),
        ...(dto.goal !== undefined ? { goal: dto.goal.trim() || null } : {}),
        ...(dto.level !== undefined ? { level: dto.level.trim() || null } : {}),
        ...(dto.source !== undefined ? { source: dto.source.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
        ...(dto.nextActionAt !== undefined
          ? { nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : null }
          : {}),
      },
    });
  }

  async removeStudent(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    await this.student(workspaceId, id);
    await this.prisma.eduStudent.delete({ where: { id } });
    return { id };
  }

  async listEnrollments(
    userId: string,
    filters: { classId?: string; studentId?: string; status?: string },
  ) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.eduEnrollment.findMany({
      where: {
        workspaceId,
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        student: { select: { id: true, fullName: true, guardianName: true } },
        class: { select: { id: true, title: true, capacity: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 400,
    });
  }

  async createEnrollment(userId: string, dto: CreateEnrollmentDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.student(workspaceId, dto.studentId);
    const klass = await this.klass(workspaceId, dto.classId);
    const activeCount = await this.prisma.eduEnrollment.count({
      where: { classId: dto.classId, status: 'ACTIVE' },
    });
    if (activeCount >= klass.capacity) {
      throw new ConflictException('ظرفیت این کلاس پر است؛ هنرجو را در فهرست انتظار ثبت کنید');
    }
    return this.prisma.eduEnrollment.create({
      data: {
        workspaceId,
        studentId: dto.studentId,
        classId: dto.classId,
        packageSessions: dto.packageSessions ?? klass.sessionsPerPackage,
        price: big(dto.price) ?? klass.price,
        discount: big(dto.discount) ?? 0n,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        note: dto.note?.trim() || null,
      },
    });
  }

  async updateEnrollment(userId: string, id: string, dto: UpdateEnrollmentDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.enrollment(workspaceId, id);
    return this.prisma.eduEnrollment.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.discount !== undefined ? { discount: big(dto.discount) ?? 0n } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      },
    });
  }

  async removeEnrollment(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    await this.enrollment(workspaceId, id);
    await this.prisma.eduEnrollment.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Sessions + attendance
  // -------------------------------------------------------------------------

  async listSessions(
    userId: string,
    filters: { classId?: string; status?: string; from?: string; to?: string },
  ) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.eduSession.findMany({
      where: {
        workspaceId,
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.from || filters.to
          ? {
              scheduledAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        class: { select: { id: true, title: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 300,
    });
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    const workspaceId = await this.workspaceId(userId);
    const klass = await this.klass(workspaceId, dto.classId);
    return this.prisma.eduSession.create({
      data: {
        workspaceId,
        classId: dto.classId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMin: dto.durationMin ?? klass.durationMin,
        topic: dto.topic?.trim() || null,
        coachName: dto.coachName?.trim() || klass.coachName,
        note: dto.note?.trim() || null,
      },
    });
  }

  async updateSession(userId: string, id: string, dto: UpdateSessionDto) {
    const workspaceId = await this.workspaceId(userId);
    const session = await this.prisma.eduSession.findFirst({
      where: { id, workspaceId },
    });
    if (!session) throw new NotFoundException('جلسه پیدا نشد');
    return this.prisma.eduSession.update({
      where: { id },
      data: {
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: new Date(dto.scheduledAt) }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.topic !== undefined ? { topic: dto.topic.trim() || null } : {}),
        ...(dto.coachName !== undefined ? { coachName: dto.coachName.trim() || null } : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      },
    });
  }

  async removeSession(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const session = await this.prisma.eduSession.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!session) throw new NotFoundException('جلسه پیدا نشد');
    await this.prisma.eduSession.delete({ where: { id } });
    return { id };
  }

  async listAttendance(userId: string, sessionId: string) {
    const workspaceId = await this.workspaceId(userId);
    const session = await this.prisma.eduSession.findFirst({
      where: { id: sessionId, workspaceId },
    });
    if (!session) throw new NotFoundException('جلسه پیدا نشد');
    const enrollments = await this.prisma.eduEnrollment.findMany({
      where: { classId: session.classId, status: 'ACTIVE' },
      include: {
        student: { select: { id: true, fullName: true } },
        attendances: { where: { sessionId } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { session, enrollments };
  }

  async recordAttendance(userId: string, sessionId: string, dto: RecordAttendanceDto) {
    const workspaceId = await this.workspaceId(userId);
    const session = await this.prisma.eduSession.findFirst({
      where: { id: sessionId, workspaceId },
    });
    if (!session) throw new NotFoundException('جلسه پیدا نشد');
    const enrollment = await this.enrollment(workspaceId, dto.enrollmentId);
    if (enrollment.classId !== session.classId) {
      throw new BadRequestException('این ثبت‌نام به کلاس جلسه تعلق ندارد');
    }
    const consumesCredit =
      dto.consumesCredit ?? !['ABSENT_EXCUSED', 'MAKEUP'].includes(dto.status);
    await this.prisma.eduAttendance.upsert({
      where: { sessionId_enrollmentId: { sessionId, enrollmentId: dto.enrollmentId } },
      update: { status: dto.status, consumesCredit, note: dto.note?.trim() || null },
      create: {
        workspaceId,
        sessionId,
        enrollmentId: dto.enrollmentId,
        status: dto.status,
        consumesCredit,
        note: dto.note?.trim() || null,
      },
    });
    return this.recomputeEnrollment(dto.enrollmentId);
  }

  // -------------------------------------------------------------------------
  //  Progress notes
  // -------------------------------------------------------------------------

  async listProgress(userId: string, enrollmentId: string) {
    const workspaceId = await this.workspaceId(userId);
    await this.enrollment(workspaceId, enrollmentId);
    return this.prisma.eduProgressNote.findMany({
      where: { enrollmentId },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  async createProgress(userId: string, dto: CreateProgressDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.enrollment(workspaceId, dto.enrollmentId);
    if (dto.sessionId) {
      const session = await this.prisma.eduSession.findFirst({
        where: { id: dto.sessionId, workspaceId },
        select: { id: true },
      });
      if (!session) throw new BadRequestException('جلسه پیدا نشد');
    }
    return this.prisma.eduProgressNote.create({
      data: {
        workspaceId,
        enrollmentId: dto.enrollmentId,
        sessionId: dto.sessionId ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
        topic: dto.topic?.trim() || null,
        homework: dto.homework?.trim() || null,
        feedback: dto.feedback?.trim() || null,
        privateNote: dto.privateNote?.trim() || null,
        mediaUrl: dto.mediaUrl?.trim() || null,
        nextGoal: dto.nextGoal?.trim() || null,
      },
    });
  }

  async updateProgress(userId: string, id: string, dto: UpdateProgressDto) {
    const workspaceId = await this.workspaceId(userId);
    const note = await this.prisma.eduProgressNote.findFirst({
      where: { id, workspaceId },
    });
    if (!note) throw new NotFoundException('یادداشت پیشرفت پیدا نشد');
    return this.prisma.eduProgressNote.update({
      where: { id },
      data: {
        ...(dto.topic !== undefined ? { topic: dto.topic.trim() || null } : {}),
        ...(dto.homework !== undefined ? { homework: dto.homework.trim() || null } : {}),
        ...(dto.feedback !== undefined ? { feedback: dto.feedback.trim() || null } : {}),
        ...(dto.privateNote !== undefined
          ? { privateNote: dto.privateNote.trim() || null }
          : {}),
        ...(dto.mediaUrl !== undefined ? { mediaUrl: dto.mediaUrl.trim() || null } : {}),
        ...(dto.nextGoal !== undefined ? { nextGoal: dto.nextGoal.trim() || null } : {}),
      },
    });
  }

  async removeProgress(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const note = await this.prisma.eduProgressNote.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!note) throw new NotFoundException('یادداشت پیشرفت پیدا نشد');
    await this.prisma.eduProgressNote.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Tuition payments
  // -------------------------------------------------------------------------

  async listPayments(userId: string, filters: { status?: string; enrollmentId?: string }) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.eduPayment.findMany({
      where: {
        workspaceId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.enrollmentId ? { enrollmentId: filters.enrollmentId } : {}),
      },
      include: {
        enrollment: {
          select: {
            id: true,
            student: { select: { id: true, fullName: true } },
            class: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  /** Active enrollments with their remaining balance for the tuition view. */
  async listBalances(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    const rows = await this.prisma.eduEnrollment.findMany({
      where: { workspaceId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: {
        student: { select: { id: true, fullName: true, guardianName: true } },
        class: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 400,
    });
    return rows.map((row) => {
      const total = num(row.price) - num(row.discount);
      const paid = num(row.paidAmount);
      return {
        ...row,
        total,
        paid,
        balance: Math.max(total - paid, 0),
      };
    });
  }

  async createPayment(userId: string, dto: CreateEduPaymentDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.enrollment(workspaceId, dto.enrollmentId);
    const trackingNumber = dto.trackingNumber?.trim() || null;
    if (trackingNumber) {
      const dup = await this.prisma.eduPayment.findFirst({
        where: { workspaceId, trackingNumber, status: { not: 'REJECTED' } },
        select: { id: true },
      });
      if (dup) throw new ConflictException('این شماره پیگیری قبلاً ثبت شده است');
    }
    return this.prisma.eduPayment.create({
      data: {
        workspaceId,
        enrollmentId: dto.enrollmentId,
        amount: big(dto.amount) ?? 0n,
        method: dto.method ?? 'CARD_TO_CARD',
        trackingNumber,
        receiptUrl: dto.receiptUrl?.trim() || null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      },
    });
  }

  async reviewPayment(userId: string, id: string, dto: ReviewEduPaymentDto) {
    const workspaceId = await this.workspaceId(userId);
    const payment = await this.prisma.eduPayment.findFirst({
      where: { id, workspaceId },
    });
    if (!payment) throw new NotFoundException('پرداخت پیدا نشد');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('این پرداخت قبلاً بررسی شده است');
    }
    const updated = await this.prisma.eduPayment.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.reviewNote?.trim() || null },
    });
    if (dto.status === 'APPROVED') {
      await this.recomputeEnrollment(payment.enrollmentId);
    }
    return updated;
  }

  // -------------------------------------------------------------------------
  //  Expenses + coach settlements
  // -------------------------------------------------------------------------

  async listExpenses(userId: string, classId?: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.eduExpense.findMany({
      where: { workspaceId, ...(classId ? { classId } : {}) },
      include: { class: { select: { id: true, title: true } } },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
  }

  async createExpense(userId: string, dto: CreateEduExpenseDto) {
    const workspaceId = await this.workspaceId(userId);
    if (dto.classId) await this.klass(workspaceId, dto.classId);
    return this.prisma.eduExpense.create({
      data: {
        workspaceId,
        classId: dto.classId ?? null,
        title: dto.title.trim(),
        category: dto.category?.trim() || null,
        amount: big(dto.amount) ?? 0n,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        vendor: dto.vendor?.trim() || null,
        note: dto.note?.trim() || null,
      },
    });
  }

  async removeExpense(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const row = await this.prisma.eduExpense.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('هزینه پیدا نشد');
    await this.prisma.eduExpense.delete({ where: { id } });
    return { id };
  }

  async listSettlements(userId: string, status?: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.eduCoachSettlement.findMany({
      where: { workspaceId, ...(status ? { status } : {}) },
      include: { class: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createSettlement(userId: string, dto: CreateSettlementDto) {
    const workspaceId = await this.workspaceId(userId);
    if (dto.classId) await this.klass(workspaceId, dto.classId);
    return this.prisma.eduCoachSettlement.create({
      data: {
        workspaceId,
        coachName: dto.coachName.trim(),
        classId: dto.classId ?? null,
        period: dto.period?.trim() || null,
        basis: dto.basis ?? 'PER_SESSION',
        amount: big(dto.amount) ?? 0n,
        note: dto.note?.trim() || null,
      },
    });
  }

  async updateSettlement(userId: string, id: string, dto: UpdateSettlementDto) {
    const workspaceId = await this.workspaceId(userId);
    const row = await this.prisma.eduCoachSettlement.findFirst({
      where: { id, workspaceId },
    });
    if (!row) throw new NotFoundException('تسویه پیدا نشد');
    return this.prisma.eduCoachSettlement.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.amount !== undefined ? { amount: big(dto.amount) ?? 0n } : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      },
    });
  }

  async removeSettlement(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const row = await this.prisma.eduCoachSettlement.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('تسویه پیدا نشد');
    await this.prisma.eduCoachSettlement.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Reports
  // -------------------------------------------------------------------------

  async reportsOverview(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    const [classes, students, enrollments, sessions, attendances, expenses, settlements] =
      await Promise.all([
        this.prisma.eduClass.findMany({
          where: { workspaceId },
          select: { id: true, title: true, discipline: true, capacity: true, status: true },
        }),
        this.prisma.eduStudent.count({ where: { workspaceId, status: 'ACTIVE' } }),
        this.prisma.eduEnrollment.findMany({
          where: { workspaceId },
          select: {
            id: true,
            classId: true,
            status: true,
            packageSessions: true,
            usedSessions: true,
            price: true,
            discount: true,
            paidAmount: true,
          },
        }),
        this.prisma.eduSession.findMany({
          where: { workspaceId },
          select: { status: true },
        }),
        this.prisma.eduAttendance.findMany({
          where: { workspaceId },
          select: { status: true },
        }),
        this.prisma.eduExpense.findMany({
          where: { workspaceId },
          select: { classId: true, amount: true },
        }),
        this.prisma.eduCoachSettlement.findMany({
          where: { workspaceId, status: 'PENDING' },
          select: { amount: true },
        }),
      ]);

    const activeEnrollments = enrollments.filter((row) => row.status === 'ACTIVE');
    const total = (rows: typeof enrollments) =>
      rows.reduce((sum, row) => sum + num(row.price) - num(row.discount), 0);
    const paid = (rows: typeof enrollments) =>
      rows.reduce((sum, row) => sum + num(row.paidAmount), 0);

    const present = attendances.filter((row) =>
      ['PRESENT', 'MAKEUP'].includes(row.status),
    ).length;
    const attendanceRate = attendances.length > 0 ? present / attendances.length : 0;

    const byDiscipline = new Map<string, number>();
    for (const klass of classes) {
      if (klass.status !== 'ACTIVE') continue;
      byDiscipline.set(klass.discipline, (byDiscipline.get(klass.discipline) ?? 0) + 1);
    }

    const capacityByClass = new Map(classes.map((row) => [row.id, row.capacity]));
    const classProfit = classes
      .filter((row) => row.status === 'ACTIVE')
      .map((klass) => {
        const rows = enrollments.filter((row) => row.classId === klass.id);
        const revenue = total(rows);
        const collected = paid(rows);
        const spent = expenses
          .filter((row) => row.classId === klass.id)
          .reduce((sum, row) => sum + num(row.amount), 0);
        const enrolled = rows.filter((row) => row.status === 'ACTIVE').length;
        const capacity = capacityByClass.get(klass.id) ?? 0;
        return {
          classId: klass.id,
          title: klass.title,
          enrolled,
          capacity,
          utilization: capacity > 0 ? enrolled / capacity : 0,
          revenue,
          collected,
          expenses: spent,
          profit: collected - spent,
        };
      });

    return {
      activeClasses: classes.filter((row) => row.status === 'ACTIVE').length,
      activeStudents: students,
      activeEnrollments: activeEnrollments.length,
      sessionsDone: sessions.filter((row) => row.status === 'DONE').length,
      attendanceRate,
      totalRevenue: total(enrollments),
      collected: paid(enrollments),
      receivables: Math.max(total(enrollments) - paid(enrollments), 0),
      expiringPackages: activeEnrollments.filter(
        (row) => row.usedSessions >= row.packageSessions - 1,
      ).length,
      pendingSettlements: settlements.reduce((sum, row) => sum + num(row.amount), 0),
      byDiscipline: [...byDiscipline.entries()].map(([label, count]) => ({ label, count })),
      classProfit,
    };
  }
}
