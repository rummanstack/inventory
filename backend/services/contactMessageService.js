import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { CONTACT_MESSAGE_ACTIONS } from "../lib/auditActions.js";
import { insertContactMessage, listContactMessages, mapContactMessage } from "../repositories/contactMessageRepository.js";

export class ContactMessageService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async submitContactMessage(input = {}, actor = null, requestMeta = {}) {
    const name = String(input.name || "").trim();
    const phone = String(input.phone || "").trim();
    const message = String(input.message || "").trim();

    assert(name, "Name is required.");
    assert(phone, "Phone number is required.");
    assert(message, "Message is required.");

    const contactMessage = {
      id: createId("contact"),
      name,
      phone,
      message,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      const result = await insertContactMessage(client, contactMessage);
      const saved = mapContactMessage(result.rows[0]);
      if (this.auditService) {
        await this.auditService.record(client, {
          tenantId: actor?.tenantId || null,
          userId: actor?.id || null,
          actionType: CONTACT_MESSAGE_ACTIONS.SUBMIT,
          entityType: "contact_message",
          entityId: saved.id,
          description: actor
            ? `${actor.name} submitted a contact message`
            : `Public visitor submitted a contact message`,
          metadata: {
            actorName: actor?.name || "Public visitor",
            actorRole: actor?.role || "public",
            name,
            phone,
            ip: requestMeta.ip || "",
            userAgent: requestMeta.userAgent || "",
          },
          after: {
            name,
            phone,
            status: saved.status,
          },
        });
      }
      return saved;
    } finally {
      client.release();
    }
  }

  async listContactMessages() {
    return this.databaseManager.withClient(async (client) => {
      const result = await listContactMessages(client);
      return result.rows.map(mapContactMessage);
    });
  }
}
