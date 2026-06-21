import { createId } from "../lib/ids.js";
import { assert } from "../lib/errors.js";
import { VISITOR_CHAT_ACTIONS } from "../lib/auditActions.js";
import { logActivity } from "./shared/inventoryHelpers.js";
import {
  countUnreadVisitorChats,
  findVisitorChatById,
  findVisitorChatByToken,
  findVisitorChatForUpdateById,
  insertVisitorChatIfMissing,
  insertVisitorChatMessage,
  listVisitorChatMessagesAfter,
  listVisitorChats,
  mapVisitorChat,
  updateVisitorChatState,
} from "../repositories/visitorChatRepository.js";

const MAX_MESSAGE_LENGTH = 4000;

function trim(value) {
  return String(value || "").trim();
}

function parseAfterId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export class VisitorChatService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, { ...payload, module: "visitor_chat" });
  }

  // --- Visitor-facing (public, token-authenticated) ---

  async postVisitorMessage(visitorToken, body) {
    const token = trim(visitorToken);
    const message = trim(body);
    assert(token, "Visitor token is required.");
    assert(message, "Message is required.");
    assert(message.length <= MAX_MESSAGE_LENGTH, "Message is too long.");

    return this.databaseManager.withTransaction(async (client) => {
      const chat = await insertVisitorChatIfMissing(client, { id: createId("visitor-chat"), visitorToken: token });

      const insertResult = await insertVisitorChatMessage(client, {
        visitorChatId: chat.id,
        senderRole: "VISITOR",
        body: message,
      });

      await updateVisitorChatState(client, chat.id, {
        status: "OPEN",
        lastMessageAt: new Date().toISOString(),
        unreadForAdmin: true,
      });

      return { message: insertResult.rows[0] && { id: insertResult.rows[0].id, body: message } };
    });
  }

  async listVisitorMessages(visitorToken, afterId) {
    const token = trim(visitorToken);
    assert(token, "Visitor token is required.");

    return this.databaseManager.withClient(async (client) => {
      const chatResult = await findVisitorChatByToken(client, token);
      if (chatResult.rowCount === 0) {
        return { messages: [] };
      }

      const messages = await listVisitorChatMessagesAfter(client, chatResult.rows[0].id, parseAfterId(afterId));
      return { messages };
    });
  }

  // --- Admin-facing (requirePlatformAdmin) ---

  async listChats(query = {}) {
    const status = trim(query.status).toUpperCase();
    return this.databaseManager.withClient(async (client) => ({
      items: await listVisitorChats(client, { status: status || undefined }),
    }));
  }

  async getChat(chatId) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findVisitorChatById(client, chatId);
      assert(result.rowCount > 0, "Conversation not found.", 404);
      return { chat: mapVisitorChat(result.rows[0]) };
    });
  }

  async listAdminMessages(chatId, afterId) {
    return this.databaseManager.withClient(async (client) => {
      const messages = await listVisitorChatMessagesAfter(client, chatId, parseAfterId(afterId));
      return { messages };
    });
  }

  async postAdminReply(chatId, body, actor) {
    const message = trim(body);
    assert(message, "Reply is required.");
    assert(message.length <= MAX_MESSAGE_LENGTH, "Reply is too long.");

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findVisitorChatForUpdateById(client, chatId);
      assert(existingResult.rowCount > 0, "Conversation not found.", 404);
      const chat = existingResult.rows[0];

      const insertResult = await insertVisitorChatMessage(client, {
        visitorChatId: chat.id,
        senderRole: "ADMIN",
        senderUserId: actor.id,
        body: message,
      });

      await updateVisitorChatState(client, chat.id, {
        lastMessageAt: new Date().toISOString(),
        unreadForAdmin: false,
      });

      await this.recordActivity(client, actor, {
        actionType: VISITOR_CHAT_ACTIONS.REPLY,
        entityType: "visitor_chat",
        entityId: chat.id,
        description: `${actor.name} replied to a visitor chat`,
      });

      return { message: { id: insertResult.rows[0].id, body: message } };
    });
  }

  async markChatRead(chatId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findVisitorChatForUpdateById(client, chatId);
      assert(existingResult.rowCount > 0, "Conversation not found.", 404);

      const result = await updateVisitorChatState(client, chatId, { unreadForAdmin: false });
      return { chat: mapVisitorChat(result.rows[0]) };
    });
  }

  async closeChat(chatId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findVisitorChatForUpdateById(client, chatId);
      assert(existingResult.rowCount > 0, "Conversation not found.", 404);

      const result = await updateVisitorChatState(client, chatId, { status: "CLOSED" });

      await this.recordActivity(client, actor, {
        actionType: VISITOR_CHAT_ACTIONS.CLOSE,
        entityType: "visitor_chat",
        entityId: chatId,
        description: `${actor.name} closed a visitor chat`,
      });

      return { chat: mapVisitorChat(result.rows[0]) };
    });
  }

  async countUnread() {
    return this.databaseManager.withClient(async (client) => ({
      count: await countUnreadVisitorChats(client),
    }));
  }
}
