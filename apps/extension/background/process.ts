import type { ChatMessage } from "@extension/share";

import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeRemoveComments from "rehype-remove-comments";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import { rehypeCustom } from "./rehype";

const processorChatMessage = unified()
  .use(rehypeParse)
  .use(rehypeRemoveComments)
  .use(rehypeCustom)
  .use(rehypeRemark)
  .use(remarkStringify);

export function processChatMessage(message: ChatMessage): ChatMessage {
  switch (message.role) {
    case "user":
      return message;
    case "assistant":
      return {
        ...message,
        content: processorChatMessage.processSync(message.content).toString(),
      };
  }
}
