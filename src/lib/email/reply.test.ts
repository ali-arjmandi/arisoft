import assert from "node:assert/strict";
import { test } from "node:test";
import { groupInboxThreads } from "./inboxThreads.ts";
import { renderEmailForSmtp } from "./render.ts";
import { buildReplyContent, replyReferences, replySubject } from "./reply.ts";

test("replySubject adds Re: only once", () => {
  assert.equal(replySubject("Quote"), "Re: Quote");
  assert.equal(replySubject("RE: Quote"), "RE: Quote");
});

test("replyReferences appends the parent and tolerates a missing Message-ID", () => {
  assert.deepEqual(replyReferences(["<a@x>"], "<b@x>"), ["<a@x>", "<b@x>"]);
  assert.deepEqual(replyReferences(["<a@x>"], null), ["<a@x>"]);
});

test("a reply renders in the branded template with inbound text escaped", () => {
  const content = buildReplyContent({
    subject: "<b>Hi</b>",
    body: "Thanks!",
    quotedFrom: "<script>",
    quotedDate: new Date(0),
    quotedText: "Dear {{FIRST_NAME}} <img src=x onerror=alert(1)>",
  });
  const { html, attachments } = renderEmailForSmtp(content);
  assert.ok(!html.includes("<script>") && !html.includes("<img src=x") && !html.includes("<b>Hi"));
  assert.ok(html.includes("Thanks!") && html.includes("Free discovery call"));
  assert.ok(attachments.length > 0, "logo is inlined as an attachment");
});

test("threads group by conversation, hide unanswered outreach, and track who spoke last", () => {
  const message = (id: string, threadId: string, fromAddress: string, day: number) => ({
    id,
    mailbox: "info@arisoft.nl",
    threadId,
    fromName: null,
    fromAddress,
    subject: "Quote",
    receivedAt: new Date(2026, 0, day),
  });
  const threads = groupInboxThreads([
    message("d", "answered", "Info@arisoft.nl", 4),
    message("c", "answered", "client@x.nl", 3),
    message("b", "open", "other@x.nl", 2),
    message("a", "outreach", "info@arisoft.nl", 1),
  ]);
  assert.deepEqual(
    threads.map(({ id, messageCount, awaitingReply, contactName }) => [id, messageCount, awaitingReply, contactName]),
    [
      ["d", 2, false, "client@x.nl"],
      ["b", 1, true, "other@x.nl"],
    ],
  );
});
