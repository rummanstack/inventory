import { createId } from "../lib/ids.js";
import { assert } from "../lib/errors.js";
import { HELP_DESK_ACTIONS } from "../lib/auditActions.js";
import { logActivity } from "./shared/inventoryHelpers.js";
import {
  countHelpDeskTicketNumberCounter,
  findHelpDeskTicketDetailsById,
  findHelpDeskTicketForUpdate,
  insertHelpDeskTicket,
  insertHelpDeskTicketNote,
  listHelpDeskTickets,
  mapHelpDeskTicket,
  updateHelpDeskTicket,
  updateHelpDeskTicketState,
} from "../repositories/helpDeskRepository.js";

const STATUS_KEYS = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];
const PRIORITY_KEYS = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const CATEGORY_KEYS = [
  "INVOICE_ISSUE",
  "PAYMENT_MISMATCH",
  "STOCK_CORRECTION",
  "RETURN_REFUND",
  "LOYALTY_ISSUE",
  "PRINTER_ISSUE",
  "LOGIN_ISSUE",
  "APP_DEVICE_ISSUE",
  "DATA_CORRECTION",
  "OTHER",
];
const CHANNEL_KEYS = ["IN_APP", "PHONE", "WHATSAPP", "EMAIL"];

function trim(value) {
  return String(value || "").trim();
}

function normalizeEnum(value, allowed, fallback) {
  const next = trim(value).toUpperCase();
  return allowed.includes(next) ? next : fallback;
}

function normalizeHelpDeskTicket(input = {}, existing = {}) {
  return {
    id: input.id || existing.id || createId("help-ticket"),
    subject: trim(input.subject || existing.subject),
    category: normalizeEnum(input.category ?? existing.category, CATEGORY_KEYS, existing.category || "OTHER"),
    priority: normalizeEnum(input.priority ?? existing.priority, PRIORITY_KEYS, existing.priority || "MEDIUM"),
    status: normalizeEnum(input.status ?? existing.status, STATUS_KEYS, existing.status || "OPEN"),
    channel: normalizeEnum(input.channel ?? existing.channel, CHANNEL_KEYS, existing.channel || "IN_APP"),
    customerName: trim(input.customerName ?? existing.customerName),
    customerPhone: trim(input.customerPhone ?? existing.customerPhone),
    referenceNumber: trim(input.referenceNumber ?? existing.referenceNumber),
    description: trim(input.description ?? existing.description),
    assigneeId: trim(input.assigneeId ?? existing.assigneeId),
    assigneeName: trim(input.assigneeName ?? existing.assigneeName),
  };
}

function buildTicketPatch(ticket, input, actor, previous = {}) {
  const updated = normalizeHelpDeskTicket(input, {
    ...previous,
    subject: previous.subject || ticket.subject,
    category: previous.category || ticket.category,
    priority: previous.priority || ticket.priority,
    status: previous.status || ticket.status,
    channel: previous.channel || ticket.channel,
    customerName: previous.customerName || ticket.customer_name,
    customerPhone: previous.customerPhone || ticket.customer_phone,
    referenceNumber: previous.referenceNumber || ticket.reference_number,
    description: previous.description || ticket.description,
    assigneeId: previous.assigneeId || ticket.assignee_id || "",
    assigneeName: previous.assigneeName || ticket.assignee_name || "",
  });

  const now = new Date().toISOString();
  const escalatedAt = input.escalatedAt === null
    ? null
    : input.escalatedAt
      ? String(input.escalatedAt)
      : updated.priority === "URGENT" && !ticket.escalated_at
        ? now
        : ticket.escalated_at || null;
  const closedAt = updated.status === "CLOSED" ? ticket.closed_at || now : updated.status === "OPEN" ? null : ticket.closed_at || null;

  return {
    id: ticket.id,
    tenantId: ticket.tenant_id,
    subject: updated.subject,
    category: updated.category,
    priority: updated.priority,
    status: updated.status,
    channel: updated.channel,
    customerName: updated.customerName,
    customerPhone: updated.customerPhone,
    referenceNumber: updated.referenceNumber,
    description: updated.description,
    assigneeId: updated.assigneeId || null,
    assigneeName: updated.assigneeName || "",
    updatedById: actor.id,
    updatedByName: actor.name,
    escalatedAt,
    closedAt,
    lastNoteAt: ticket.last_note_at || null,
  };
}

function noteBodyFromInput(input) {
  return trim(input?.body ?? input?.note ?? "");
}

export class HelpDeskService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) {
      return;
    }

    await logActivity(this.auditService, client, actor, {
      ...payload,
      module: "support",
    });
  }

  async listTickets(query = {}, actor) {
    const filters = {
      tenantId: actor.tenantId,
      search: trim(query.search),
      status: trim(query.status).toUpperCase(),
      priority: trim(query.priority).toUpperCase(),
      category: trim(query.category).toUpperCase(),
      tab: trim(query.tab).toLowerCase(),
    };

    return this.databaseManager.withClient(async (client) => {
      const items = await listHelpDeskTickets(client, filters);
      return { items };
    });
  }

  async getTicket(ticketId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const row = await findHelpDeskTicketDetailsById(client, ticketId, actor.tenantId);
      assert(row, "Help desk ticket not found.", 404);
      return mapHelpDeskTicket(row);
    });
  }

  async saveTicket(input, actor) {
    const ticketInput = normalizeHelpDeskTicket(input);
    assert(ticketInput.subject, "Ticket subject is required.");

    return this.databaseManager.withTransaction(async (client) => {
      if (input.id) {
        const existingResult = await findHelpDeskTicketForUpdate(client, input.id, actor.tenantId);
        assert(existingResult.rowCount > 0, "Help desk ticket not found.", 404);
        const previous = existingResult.rows[0];
        const patch = buildTicketPatch(previous, ticketInput, actor, previous);
        const result = await updateHelpDeskTicket(client, patch);
        const ticket = await findHelpDeskTicketDetailsById(client, result.rows[0].id, actor.tenantId);

        await this.recordActivity(client, actor, {
          actionType: HELP_DESK_ACTIONS.UPDATE,
          entityType: "help_desk_ticket",
          entityId: patch.id,
          description: `${actor.name} updated help desk ticket ${previous.ticket_number}`,
          metadata: { ticketNumber: previous.ticket_number, status: patch.status, priority: patch.priority },
        });

        return { ticket: mapHelpDeskTicket(ticket) };
      }

      const year = new Date().getFullYear();
      const ticketNumberValue = await countHelpDeskTicketNumberCounter(client, actor.tenantId, year);
      const ticketNumber = `HD-${year}-${String(ticketNumberValue).padStart(4, "0")}`;
      const now = new Date().toISOString();
      const assigneeId = ticketInput.assigneeId || actor.id;
      const assigneeName = ticketInput.assigneeName || actor.name;
      const escalatedAt = ticketInput.priority === "URGENT" ? now : null;
      const closedAt = ticketInput.status === "CLOSED" ? now : null;
      const lastNoteAt = ticketInput.description ? now : null;

      const ticket = {
        id: ticketInput.id,
        tenantId: actor.tenantId,
        ticketNumber,
        subject: ticketInput.subject,
        category: ticketInput.category,
        priority: ticketInput.priority,
        status: ticketInput.status,
        channel: ticketInput.channel,
        customerName: ticketInput.customerName,
        customerPhone: ticketInput.customerPhone,
        referenceNumber: ticketInput.referenceNumber,
        description: ticketInput.description,
        assigneeId,
        assigneeName,
        createdById: actor.id,
        createdByName: actor.name,
        updatedById: actor.id,
        updatedByName: actor.name,
        escalatedAt,
        closedAt,
        lastNoteAt,
      };

      const result = await insertHelpDeskTicket(client, ticket);

      if (ticket.description) {
        await insertHelpDeskTicketNote(client, {
          id: createId("help-note"),
          tenantId: actor.tenantId,
          ticketId: result.rows[0].id,
          body: ticket.description,
          createdById: actor.id,
          authorName: actor.name,
        });
      }

      const created = await findHelpDeskTicketDetailsById(client, result.rows[0].id, actor.tenantId);

      await this.recordActivity(client, actor, {
        actionType: HELP_DESK_ACTIONS.CREATE,
        entityType: "help_desk_ticket",
        entityId: result.rows[0].id,
        description: `${actor.name} created help desk ticket ${ticketNumber}`,
        metadata: { ticketNumber, category: ticket.category, priority: ticket.priority, status: ticket.status },
      });

      return { ticket: mapHelpDeskTicket(created) };
    });
  }

  async addNote(ticketId, input, actor) {
    const body = noteBodyFromInput(input);
    assert(body, "Note is required.");

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findHelpDeskTicketForUpdate(client, ticketId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Help desk ticket not found.", 404);

      await insertHelpDeskTicketNote(client, {
        id: createId("help-note"),
        tenantId: actor.tenantId,
        ticketId,
        body,
        createdById: actor.id,
        authorName: actor.name,
      });

      await updateHelpDeskTicketState(client, ticketId, actor.tenantId, {
        lastNoteAt: new Date().toISOString(),
        updatedById: actor.id,
        updatedByName: actor.name,
      });

      const ticket = await findHelpDeskTicketDetailsById(client, ticketId, actor.tenantId);

      await this.recordActivity(client, actor, {
        actionType: HELP_DESK_ACTIONS.NOTE,
        entityType: "help_desk_ticket",
        entityId: ticketId,
        description: `${actor.name} added a note to help desk ticket ${existingResult.rows[0].ticket_number}`,
        metadata: { ticketNumber: existingResult.rows[0].ticket_number },
      });

      return { ticket: mapHelpDeskTicket(ticket) };
    });
  }

  async transitionTicket(ticketId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findHelpDeskTicketForUpdate(client, ticketId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Help desk ticket not found.", 404);

      const existing = existingResult.rows[0];
      const nextStatus = normalizeEnum(input.status ?? existing.status, STATUS_KEYS, existing.status || "OPEN");
      const nextPriority = normalizeEnum(input.priority ?? existing.priority, PRIORITY_KEYS, existing.priority || "MEDIUM");
      const nextAssigneeId = trim(input.assigneeId);
      const nextAssigneeName = trim(input.assigneeName);
      const noteBody = noteBodyFromInput(input);
      const now = new Date().toISOString();
      const escalatedAt = input.escalated ? now : existing.escalated_at || (nextPriority === "URGENT" ? now : null);
      const closedAt = nextStatus === "CLOSED" ? existing.closed_at || now : nextStatus === "OPEN" ? null : existing.closed_at || null;

      if (noteBody) {
        await insertHelpDeskTicketNote(client, {
          id: createId("help-note"),
          tenantId: actor.tenantId,
          ticketId,
          body: noteBody,
          createdById: actor.id,
          authorName: actor.name,
        });
      }

      await updateHelpDeskTicketState(client, ticketId, actor.tenantId, {
        status: nextStatus,
        priority: nextPriority,
        assigneeId: nextAssigneeId || null,
        assigneeName: nextAssigneeName || null,
        escalatedAt,
        closedAt,
        lastNoteAt: noteBody ? now : existing.last_note_at || null,
        updatedById: actor.id,
        updatedByName: actor.name,
      });

      const ticket = await findHelpDeskTicketDetailsById(client, ticketId, actor.tenantId);

      await this.recordActivity(client, actor, {
        actionType: HELP_DESK_ACTIONS.TRANSITION,
        entityType: "help_desk_ticket",
        entityId: ticketId,
        description: `${actor.name} updated help desk ticket ${existing.ticket_number}`,
        metadata: {
          ticketNumber: existing.ticket_number,
          status: nextStatus,
          priority: nextPriority,
          escalated: Boolean(input.escalated),
          noteAdded: Boolean(noteBody),
        },
      });

      return { ticket: mapHelpDeskTicket(ticket) };
    });
  }
}
