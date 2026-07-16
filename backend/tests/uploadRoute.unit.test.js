import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { UploadController } from "../controllers/uploadController.js";
import { createUploadsRoutes } from "../routes/uploads.routes.js";

function createTestApp(photoStorageService) {
  const app = express();
  app.use((req, _res, next) => {
    req.currentUser = { id: "user-1", name: "Test User", role: "admin", tenantId: "tenant-1" };
    next();
  });
  app.use(createUploadsRoutes(new UploadController(null, photoStorageService)));
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message });
  });
  return app;
}

test("photo endpoint passes the authenticated tenant and image buffer to storage", async () => {
  let received;
  const app = createTestApp({
    async storePhoto(file, context) {
      received = { file, context };
      return {
        key: "photos/tenant-1/photo-example.png",
        storedName: "photo-example.png",
        url: "https://media.example.com/photos/tenant-1/photo-example.png",
      };
    },
  });

  const response = await request(app)
    .post("/photo")
    .attach("photo", Buffer.from("fake-png"), { filename: "avatar.png", contentType: "image/png" });

  assert.equal(response.status, 201);
  assert.equal(response.body.url, "https://media.example.com/photos/tenant-1/photo-example.png");
  assert.equal(received.context.tenantId, "tenant-1");
  assert.equal(received.file.mimetype, "image/png");
  assert.equal(received.file.buffer.toString(), "fake-png");
});

test("photo endpoint rejects unsupported file types before storage", async () => {
  let called = false;
  const app = createTestApp({
    async storePhoto() {
      called = true;
    },
  });

  const response = await request(app)
    .post("/photo")
    .attach("photo", Buffer.from("plain text"), { filename: "notes.txt", contentType: "text/plain" });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /JPEG, PNG, WEBP, or GIF/);
  assert.equal(called, false);
});
