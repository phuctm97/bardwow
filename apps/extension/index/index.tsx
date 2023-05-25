import type { Chat, ChatMessage } from "@extension/share";
import type { Atom } from "jotai";
import type { FC } from "react";

import { CHAT_STORAGE_PREFIX } from "@extension/share";
import {
  ScrollArea,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "@radix-ui/react-scroll-area";
import { clsx } from "clsx";
import { atom, Provider, useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomFamily } from "jotai/utils";
import { Suspense, useCallback } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";

const chatAtomFamily = atomFamily<string, Atom<Promise<Chat | undefined>>>(
  (id) =>
    atom<Promise<Chat | undefined>>(async () => {
      const key = `${CHAT_STORAGE_PREFIX}${id}`;
      const { [key]: item } = await chrome.storage.local.get(key);
      return item;
    })
);

const chatTitleAtomFamily = atomFamily<string, Atom<Promise<string>>>((id) =>
  atom<Promise<string>>(async (get) => {
    const chat = await get(chatAtomFamily(id));
    return chat?.messages[0]?.content ?? "Untitled";
  })
);

const chatIdAtom = atom<string | undefined>(undefined);

const chatIdsWritableAtom = atom<string[] | undefined>(undefined);

async function chatIdsRead(): Promise<string[]> {
  const items = await chrome.storage.local.get(null);
  return Object.keys(items)
    .filter((key) => key.startsWith(CHAT_STORAGE_PREFIX))
    .map((key) => key.substring(CHAT_STORAGE_PREFIX.length));
}

const chatIdsAtom = atom<string[] | Promise<string[]>, [string[]], void>(
  (get) => {
    const writableValue = get(chatIdsWritableAtom);
    if (writableValue) return writableValue;
    return chatIdsRead();
  },
  (get, set, value) => set(chatIdsWritableAtom, value)
);

const deleteChatAtom = atom(null, async (get, set, id: string) => {
  set(chatIdAtom, (chatId) => (chatId === id ? undefined : chatId));
  const chatIds = await get(chatIdsAtom);
  set(
    chatIdsAtom,
    chatIds.filter((chatId) => chatId !== id)
  );
  await chrome.storage.local.remove(`${CHAT_STORAGE_PREFIX}${id}`);
});

type ChatMessageComponentProps = ChatMessage;

const ChatMessageComponent: FC<ChatMessageComponentProps> = ({
  role,
  content,
}) => (
  <li className="flex w-full flex-col items-stretch justify-start overflow-hidden">
    <span className="block text-base font-normal capitalize text-gray-400">
      {role}
    </span>
    <article className="prose max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </article>
  </li>
);

const ChatBlank: FC = () => (
  <main className="flex flex-1 flex-col items-center justify-center overflow-hidden">
    <p className="text-base font-normal text-gray-400">No selected chat.</p>
  </main>
);

interface ChatComponentProps {
  id: string;
}

const ChatComponent: FC<ChatComponentProps> = ({ id }) => {
  const chat = useAtomValue(chatAtomFamily(id));
  const deleteChat = useSetAtom(deleteChatAtom);
  const handleDeleteChat = useCallback(() => {
    deleteChat(id).catch(console.error);
  }, [id, deleteChat]);
  if (!chat) return <ChatBlank />;
  return (
    <ScrollArea className="scroll-area flex-1">
      <ScrollAreaViewport className="scroll-area-viewport w-full">
        <main className="w-full overflow-hidden">
          <ul className="w-full space-y-6 overflow-hidden px-8 py-6">
            {chat.messages.map((message, index) => (
              <ChatMessageComponent key={index} {...message} />
            ))}
          </ul>
          <div className="flex w-full flex-row items-center justify-start overflow-hidden border-t border-gray-200 px-8 py-6">
            <button
              className="rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={handleDeleteChat}
            >
              Delete chat
            </button>
          </div>
        </main>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar
        className="scroll-area-scrollbar"
        orientation="vertical"
      >
        <ScrollAreaThumb className="scroll-area-thumb" />
      </ScrollAreaScrollbar>
    </ScrollArea>
  );
};

const ChatMain: FC = () => {
  const chatId = useAtomValue(chatIdAtom);
  if (!chatId) return <ChatBlank />;
  return <ChatComponent id={chatId} />;
};

interface ChatListItemProps {
  id: string;
}

const ChatListItem: FC<ChatListItemProps> = ({ id }) => {
  const [chatId, setChatId] = useAtom(chatIdAtom);
  const handleClick = useCallback(() => setChatId(id), [id, setChatId]);
  const title = useAtomValue(chatTitleAtomFamily(id));
  const active = chatId === id;
  return (
    <li
      className={clsx(
        "flex w-full cursor-pointer select-none flex-row items-center justify-start overflow-hidden",
        active && "underline"
      )}
      onClick={handleClick}
    >
      <span className="flex-1 truncate text-base font-normal">{title}</span>
    </li>
  );
};

const ChatList: FC = () => {
  const chatIds = useAtomValue(chatIdsAtom);
  return (
    <ScrollArea className="scroll-area w-64 shrink-0 border-r border-gray-200">
      <ScrollAreaViewport className="scroll-area-viewport w-full">
        <aside className="w-full overflow-hidden">
          <ul className="w-full space-y-4 overflow-hidden p-4">
            {chatIds.map((id) => (
              <ChatListItem key={id} id={id} />
            ))}
          </ul>
        </aside>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar
        className="scroll-area-scrollbar"
        orientation="vertical"
      >
        <ScrollAreaThumb className="scroll-area-thumb" />
      </ScrollAreaScrollbar>
    </ScrollArea>
  );
};

const App: FC = () => (
  <div className="flex h-full w-full flex-row items-stretch justify-start overflow-hidden">
    <Suspense
      fallback={
        <aside className="w-64 shrink-0 overflow-hidden border-r border-gray-200" />
      }
    >
      <ChatList />
    </Suspense>
    <Suspense fallback={<main className="flex-1 overflow-hidden" />}>
      <ChatMain />
    </Suspense>
  </div>
);

const Worker: FC = () => null;

window.addEventListener("load", () => {
  const root = createRoot(document.body);
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
});
