import { ATTENDANCE_ACTIONS } from "../lib/auditActions.js";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { findEmployeeById } from "../repositories/employeeRepository.js";
import {
  findAttendanceById,
  findAttendanceByEmployeeDate,
  getMonthlyAttendanceSummary,
  insertAttendance,
  listDailyAttendance,
  updateAttendance,
} from "../repositories/attendanceRepository.js";

const VALID_STATUSES = ["PRESENT", "ABSENT", "LEAVE", "HOLIDAY"];

function normalizeDate(value, fallback = null) {
  const text = value ? String(value).slice(0, 10) : fallback;
  assert(/^\d{4}-\d{2}-\d{2}$/.test(text || ""), "A valid attendance date is required.", 400);
  return text;
}

function normalizeMonth(value) {
  const text = String(value || "").slice(0, 7);
  assert(/^\d{4}-\d{2}$/.test(text), "A valid report month is required.", 400);
  return text;
}

function normalizeTime(value, fieldName) {
  if (!value) return "";
  const text = String(value).trim().slice(0, 5);
  assert(/^\d{2}:\d{2}$/.test(text), `${fieldName} must be in HH:MM format.`, 400);
  const [hour, minute] = text.split(":").map(Number);
  assert(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59, `${fieldName} must be a valid time.`, 400);
  return text;
}

function normalizeMinutes(value, fieldName) {
  const number = Number(value || 0);
  assert(Number.isFinite(number) && number >= 0, `${fieldName} must be zero or greater.`, 400);
  return Math.round(number);
}

function normalizeAttendance(input = {}) {
  const status = String(input.status || "PRESENT").trim().toUpperCase();
  assert(VALID_STATUSES.includes(status), "Attendance status is invalid.", 400);
  return {
    employeeId: String(input.employeeId || "").trim(),
    attendanceDate: normalizeDate(input.attendanceDate || input.date),
    status,
    checkInTime: normalizeTime(input.checkInTime || input.checkIn, "Check-in time"),
    checkOutTime: normalizeTime(input.checkOutTime || input.checkOut, "Check-out time"),
    lateMinutes: normalizeMinutes(input.lateMinutes, "Late minutes"),
    overtimeMinutes: normalizeMinutes(input.overtimeMinutes, "Overtime minutes"),
    note: String(input.note || "").trim(),
  };
}

function normalizeStatusFilter(value) {
  const status = String(value || "").trim().toUpperCase();
  return VALID_STATUSES.includes(status) ? status : null;
}

export class AttendanceService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listDaily(params = {}, actor) {
    const date = normalizeDate(params.date || params.attendanceDate, new Date().toISOString().slice(0, 10));
    return this.databaseManager.withClient((client) =>
      listDailyAttendance(client, {
        tenantId: actor.tenantId,
        date,
        employeeId: String(params.employeeId || "").trim() || null,
        departmentId: String(params.departmentId || "").trim() || null,
        status: normalizeStatusFilter(params.status),
      }),
    );
  }

  async monthlyReport(params = {}, actor) {
    const month = normalizeMonth(params.month);
    return this.databaseManager.withClient(async (client) => {
      const items = await getMonthlyAttendanceSummary(client, {
        tenantId: actor.tenantId,
        month,
        employeeId: String(params.employeeId || "").trim() || null,
        departmentId: String(params.departmentId || "").trim() || null,
      });
      return {
        month,
        items,
        totals: items.reduce((acc, item) => ({
          totalDays: acc.totalDays + item.totalDays,
          presentDays: acc.presentDays + item.presentDays,
          absentDays: acc.absentDays + item.absentDays,
          leaveDays: acc.leaveDays + item.leaveDays,
          holidayDays: acc.holidayDays + item.holidayDays,
          lateMinutes: acc.lateMinutes + item.lateMinutes,
          overtimeMinutes: acc.overtimeMinutes + item.overtimeMinutes,
        }), { totalDays: 0, presentDays: 0, absentDays: 0, leaveDays: 0, holidayDays: 0, lateMinutes: 0, overtimeMinutes: 0 }),
      };
    });
  }

  async createAttendance(input, actor) {
    const data = normalizeAttendance(input);
    assert(data.employeeId, "Employee is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const employee = await findEmployeeById(client, data.employeeId, actor.tenantId);
      assert(employee && !employee.deletedAt, "Employee not found.", 404);

      const duplicate = await findAttendanceByEmployeeDate(client, actor.tenantId, data.employeeId, data.attendanceDate);
      assert(!duplicate, "Attendance already exists for this employee and date.", 409);

      const inserted = await insertAttendance(client, {
        id: createId("att"),
        tenantId: actor.tenantId,
        ...data,
        actorId: actor.id,
      });
      const attendance = await findAttendanceById(client, actor.tenantId, inserted.id);
      await this.auditService?.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ATTENDANCE_ACTIONS.CREATE,
        entityType: "attendance",
        entityId: attendance.id,
        module: "hr",
        description: `${actor.name} recorded attendance for ${attendance.employeeName}`,
        after: attendance,
      });
      return attendance;
    });
  }

  async updateAttendance(id, input, actor) {
    const data = normalizeAttendance(input);
    assert(data.employeeId, "Employee is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findAttendanceById(client, actor.tenantId, id);
      assert(existing, "Attendance record not found.", 404);

      const employee = await findEmployeeById(client, data.employeeId, actor.tenantId);
      assert(employee && !employee.deletedAt, "Employee not found.", 404);

      const duplicate = await findAttendanceByEmployeeDate(client, actor.tenantId, data.employeeId, data.attendanceDate, id);
      assert(!duplicate, "Attendance already exists for this employee and date.", 409);

      const updated = await updateAttendance(client, {
        id,
        tenantId: actor.tenantId,
        ...data,
        actorId: actor.id,
      });
      assert(updated, "Attendance record not found.", 404);
      const attendance = await findAttendanceById(client, actor.tenantId, id);
      await this.auditService?.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ATTENDANCE_ACTIONS.UPDATE,
        entityType: "attendance",
        entityId: id,
        module: "hr",
        description: `${actor.name} updated attendance for ${attendance.employeeName}`,
        before: existing,
        after: attendance,
      });
      return attendance;
    });
  }
}

