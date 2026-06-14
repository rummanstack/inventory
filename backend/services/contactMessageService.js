import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { insertContactMessage, mapContactMessage } from "../repositories/contactMessageRepository.js";

export class ContactMessageService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async submitContactMessage(input = {}) {
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
      return mapContactMessage(result.rows[0]);
    } finally {
      client.release();
    }
  }
}
