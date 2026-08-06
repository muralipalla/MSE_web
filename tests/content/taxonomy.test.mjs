import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(relativePath) {
  const contents = await readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
  return JSON.parse(contents);
}

test("topic IDs and slugs are unique and prerequisites exist", async () => {
  const topics = await readJson("content/taxonomy/topics.json");
  const ids = topics.map((topic) => topic.id);
  const slugs = topics.map((topic) => topic.slug);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(slugs).size, slugs.length);

  const knownIds = new Set(ids);
  for (const topic of topics) {
    for (const prerequisite of topic.prerequisiteTopicIds ?? []) {
      assert.ok(knownIds.has(prerequisite), `${topic.id} references missing prerequisite ${prerequisite}`);
    }
  }
});

test("learning outcomes reference known topics", async () => {
  const [topics, outcomes] = await Promise.all([
    readJson("content/taxonomy/topics.json"),
    readJson("content/taxonomy/outcomes.json"),
  ]);
  const topicIds = new Set(topics.map((topic) => topic.id));
  const outcomeIds = outcomes.map((outcome) => outcome.id);

  assert.equal(new Set(outcomeIds).size, outcomeIds.length);
  for (const outcome of outcomes) {
    assert.ok(topicIds.has(outcome.topicId), `${outcome.id} references missing topic ${outcome.topicId}`);
  }
});
