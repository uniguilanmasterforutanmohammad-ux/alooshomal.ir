import { Injectable, OnModuleInit } from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  APP_ROLES,
  AppRoleName,
  DEFAULT_PERMISSIONS,
  PERMISSION_KEY_PREFIX,
  PERMISSION_SUBJECTS,
  PermissionSubject,
  permissionKey,
} from './permissions';

export type PermissionMatrix = Record<AppRoleName, Record<PermissionSubject, boolean>>;

function roleToName(role: Role): AppRoleName {
  return role as AppRoleName;
}

function buildDefaults(): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const role of APP_ROLES) {
    const granted = new Set(DEFAULT_PERMISSIONS[role]);
    matrix[role] = {} as Record<PermissionSubject, boolean>;
    for (const subject of PERMISSION_SUBJECTS) {
      matrix[role][subject] = granted.has(subject);
    }
  }
  return matrix;
}

/**
 * Reads/writes the role→permission matrix. ADMIN always resolves to `true`,
 * so admins are never locked out even if a row is missing.
 */
@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaults();
    } catch {
      // table may not exist on a first boot; seeded on the next one
    }
  }

  /** Persist any default cell that has no explicit row yet. */
  async ensureDefaults(): Promise<void> {
    const defaults = buildDefaults();
    const rows = APP_ROLES.flatMap((role) =>
      PERMISSION_SUBJECTS.map((subject) => ({
        role,
        subject,
        value: defaults[role][subject],
      })),
    );
    await Promise.all(
      rows.map(({ role, subject, value }) =>
        this.prisma.setting.upsert({
          where: { key: permissionKey(subject, role) },
          update: {},
          create: { key: permissionKey(subject, role), value: value ? 'true' : 'false' },
        }),
      ),
    );
  }

  async getMatrix(): Promise<PermissionMatrix> {
    const defaults = buildDefaults();
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: PERMISSION_KEY_PREFIX } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const matrix = {} as PermissionMatrix;
    for (const role of APP_ROLES) {
      matrix[role] = {} as Record<PermissionSubject, boolean>;
      for (const subject of PERMISSION_SUBJECTS) {
        const stored = byKey.get(permissionKey(subject, role));
        matrix[role][subject] =
          stored === undefined ? defaults[role][subject] : stored === 'true';
      }
    }
    return matrix;
  }

  async can(role: Role, subject: PermissionSubject): Promise<boolean> {
    if (role === 'ADMIN') return true;
    const matrix = await this.getMatrix();
    return Boolean(matrix[roleToName(role)]?.[subject]);
  }

  /** Apply a partial update and return the full matrix. */
  async setMatrix(
    changes: Partial<Record<AppRoleName, Partial<Record<PermissionSubject, boolean>>>>,
  ): Promise<PermissionMatrix> {
    const writes: Array<{ key: string; value: string }> = [];
    for (const role of APP_ROLES) {
      const roleChanges = changes[role];
      if (!roleChanges) continue;
      for (const subject of PERMISSION_SUBJECTS) {
        const value = roleChanges[subject];
        if (typeof value !== 'boolean') continue;
        writes.push({
          key: permissionKey(subject, role),
          value: value ? 'true' : 'false',
        });
      }
    }
    await Promise.all(
      writes.map(({ key, value }) =>
        this.prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );
    return this.getMatrix();
  }
}
