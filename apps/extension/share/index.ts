export class ForbiddenChromeError extends Error {}

export class UnauthorizedChromeError extends Error {}

export async function chromeSendMessage<T = unknown>(
  message: unknown
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(
        message,
        (response: PromiseSettledResult<T>) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else if (response.status === "rejected")
            reject(new Error(response.reason));
          else resolve(response.value);
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function chromeSendMessageToTab<T = unknown>(
  tab: number,
  message: unknown
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(
        tab,
        message,
        (response: PromiseSettledResult<T>) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else if (response.status === "rejected")
            reject(new Error(response.reason));
          else resolve(response.value);
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Chat {
  messages: ChatMessage[];
  created: number;
  updated: number;
}

export const CHAT_STORAGE_PREFIX = "chat/";
