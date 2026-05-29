// api/index.js – Vercel Serverless Function adapter for TanStack Start
// TanStack Start builds a Web Fetch API handler (Cloudflare-style export default { fetch }).
// Vercel expects a Node.js handler (req, res). This file bridges both worlds.

import { createServer } from "node:http";
import { Readable } from "node:stream";

let handlerPromise;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = import("../dist/server/server.js").then(
      (m) => m.default ?? m
    );
  }
  return handlerPromise;
}

/**
 * Convert a Node.js IncomingMessage to a Web API Request.
 */
async function nodeToWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  const url = new URL(req.url, `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const method = req.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  const body = hasBody
    ? Readable.toWeb(req)
    : undefined;

  return new Request(url, { method, headers, body, duplex: "half" });
}

/**
 * Write a Web API Response back to a Node.js ServerResponse.
 */
async function writeWebResponse(webRes, res) {
  res.statusCode = webRes.status;
  for (const [key, value] of webRes.headers.entries()) {
    res.setHeader(key, value);
  }
  if (webRes.body) {
    const reader = webRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

export default async function handler(req, res) {
  try {
    const server = await getHandler();
    const webRequest = await nodeToWebRequest(req);
    const webResponse = await server.fetch(webRequest, process.env, {});
    await writeWebResponse(webResponse, res);
  } catch (err) {
    console.error("Serverless handler error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
