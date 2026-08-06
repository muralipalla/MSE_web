import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the MSE learning homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MSE Learning Lab<\/title>/i);
  assert.match(html, /Learn why materials/);
  assert.match(html, /Teaching content/);
  assert.match(html, /Interactive simulations/);
  assert.match(html, /Quizzes \+ question bank/);
  assert.doesNotMatch(html, /react-loading-skeleton|Your site is taking shape/);
});

test("server-renders an interior lesson", async () => {
  const response = await render("/learn/crystal-structures");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Crystal structures/);
  assert.match(html, /Atomic packing factor/);
  assert.match(html, /Learning outcomes/);
});
