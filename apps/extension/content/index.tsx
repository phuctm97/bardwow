import type { Chat, ChatMessage } from "@extension/share";
import type { PrimitiveAtom } from "jotai";
import type { FC } from "react";

import { chromeSendMessage } from "@extension/share";
import { atom, Provider, useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomFamily } from "jotai/utils";
import { Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { v4 as randomUUID } from "uuid";

const chatContainerWritableAtom = atom<HTMLElement | undefined>(undefined);

const chatContainerAtom = atom<
  HTMLElement | Promise<HTMLElement>,
  [HTMLElement | undefined],
  void
>(
  (get) => {
    const writableValue = get(chatContainerWritableAtom);
    if (writableValue) return writableValue;
    return new Promise<HTMLElement>((resolve, reject) => {
      let interval: number | undefined;
      try {
        interval = window.setInterval(() => {
          try {
            const chatHistoryEmptyElement = document.querySelector<HTMLElement>(
              "chat-window .chat-history-empty"
            );
            if (chatHistoryEmptyElement) {
              window.clearInterval(interval);
              resolve(chatHistoryEmptyElement);
              return;
            }
            const chatHistoryElement = document.querySelector<HTMLElement>(
              "chat-window .chat-history"
            );
            if (chatHistoryElement) {
              window.clearInterval(interval);
              resolve(chatHistoryElement);
              return;
            }
          } catch (err) {
            window.clearInterval(interval);
            reject(err);
          }
        });
      } catch (err) {
        window.clearInterval(interval);
        reject(err);
      }
    });
  },
  (get, set, value) => set(chatContainerWritableAtom, value)
);

function isEmptyChatContainer(chatContainer: HTMLElement): boolean {
  return chatContainer.classList.contains("chat-history-empty");
}

const chatDataAtom = atom<Record<string, Chat>>({});

const App: FC = () => {
  const [chatContainer, setChatContainer] = useAtom(chatContainerAtom);
  const parentContainer = chatContainer.parentElement;
  useEffect(() => {
    if (!parentContainer) return;
    const parentObserver = new MutationObserver(() => {
      const chatHistoryEmptyElement =
        parentContainer.querySelector<HTMLElement>(".chat-history-empty");
      if (chatHistoryEmptyElement) {
        setChatContainer(chatHistoryEmptyElement);
        return;
      }
      const chatHistoryElement =
        parentContainer.querySelector<HTMLElement>(".chat-history");
      if (chatHistoryElement) {
        setChatContainer(chatHistoryElement);
        return;
      }
    });
    parentObserver.observe(parentContainer, { childList: true });
    return () => parentObserver.disconnect();
  }, [parentContainer, setChatContainer]);
  const setChatData = useSetAtom(chatDataAtom);
  useEffect(() => {
    if (isEmptyChatContainer(chatContainer)) return;
    const id = randomUUID();
    const handleChatChange = (): void => {
      const elements = chatContainer.querySelectorAll<HTMLElement>(
        "user-query, model-response"
      );
      if (elements.length < 2) return;
      const messages = Array.from(elements).map<ChatMessage>((element) => {
        switch (element.tagName) {
          case "USER-QUERY": {
            const queryTextElement =
              element.querySelector<HTMLElement>(".query-text");
            const message: ChatMessage = {
              role: "user",
              content: queryTextElement?.textContent ?? "",
            };
            return message;
          }
          case "MODEL-RESPONSE": {
            const markdownElement = element.querySelector<HTMLElement>(
              ":is(message-content[aria-hidden], message-content[id]) .markdown"
            );
            const message: ChatMessage = {
              role: "assistant",
              content: markdownElement?.innerHTML ?? "",
            };
            return message;
          }
          default:
            throw new Error("Couldn't parse chat message.");
        }
      });
      if (messages.length < 2) return;
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.content.length === 0) return;
      const updated = Math.floor(Date.now() / 1000);
      setChatData((data) => ({
        ...data,
        [id]: {
          ...data[id],
          messages,
          created: data[id]?.created ?? updated,
          updated,
        },
      }));
    };
    handleChatChange();
    const chatObserver = new MutationObserver(handleChatChange);
    chatObserver.observe(chatContainer, { childList: true });
    return () => chatObserver.disconnect();
  }, [chatContainer, setChatData]);
  return null;
};

const chatWorkAtomFamily = atomFamily<
  string,
  PrimitiveAtom<Promise<void> | undefined>
>(() => atom<Promise<void> | undefined>(undefined));

async function chatWork(id: string, chat: Chat): Promise<void> {
  await chromeSendMessage({ type: "putChat", id, chat });
}

interface ChatWorkerProps {
  id: string;
  chat: Chat;
}

const ChatWorker: FC<ChatWorkerProps> = ({ id, chat }) => {
  const [, set] = useAtom(chatWorkAtomFamily(id));
  useEffect(() => set(chatWork(id, chat)), [id, chat, set]);
  return null;
};

const Worker: FC = () => {
  const chatData = useAtomValue(chatDataAtom);
  return (
    <>
      {Object.entries(chatData).map(([id, chat]) => (
        <Suspense key={id}>
          <ChatWorker id={id} chat={chat} />
        </Suspense>
      ))}
    </>
  );
};

const element = document.createElement("div");
element.id = "bardwow-container";
document.body.append(element);

const root = createRoot(element, { identifierPrefix: "bardwow-" });
root.render(
  <Provider>
    <Suspense>
      <App />
    </Suspense>
    <Suspense>
      <Worker />
    </Suspense>
  </Provider>
);
