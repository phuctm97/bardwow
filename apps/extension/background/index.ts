import type { Chat } from "@extension/share";

import {
  CHAT_STORAGE_PREFIX,
  ForbiddenChromeError,
  UnauthorizedChromeError,
} from "@extension/share";

import { processChatMessage } from "./process";

interface PutChatChromeMessage {
  type: "putChat";
  id: string;
  chat: Chat;
}

type ChromeMessage = PutChatChromeMessage;

function isChromeMessage(message: unknown): message is ChromeMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "putChat"
  );
}

async function handlePutChatChromeMessage(
  message: PutChatChromeMessage,
  sender: chrome.runtime.MessageSender
): Promise<void> {
  if (
    sender.id !== chrome.runtime.id ||
    sender.origin !== "https://bard.google.com"
  )
    throw new ForbiddenChromeError();
  const messages = message.chat.messages.map(processChatMessage);
  if (messages.length < 2) return;
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.content.length === 0) return;
  await chrome.storage.local.set({
    [`${CHAT_STORAGE_PREFIX}${message.id}`]: { ...message.chat, messages },
  });
}

async function handleChromeMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  if (!isChromeMessage(message)) throw new UnauthorizedChromeError();
  switch (message.type) {
    case "putChat":
      return handlePutChatChromeMessage(message, sender);
    default:
      throw new UnauthorizedChromeError();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleChromeMessage(message, sender)
    .then((value) => sendResponse({ status: "fulfilled", value }))
    .catch((err) =>
      sendResponse({
        status: "rejected",
        reason: err instanceof Error ? err.message || err.name : String(err),
      })
    );
  return true;
});
