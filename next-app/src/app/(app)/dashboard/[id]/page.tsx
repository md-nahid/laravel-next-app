import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container"
import { ChatConversations } from "./_blocks/chat-conversations"
import { ChatForm } from "./_blocks/chat-form"
import { ChatHeader } from "./_blocks/chat-header"

export default async function ChatPage(props: PageProps<"/dashboard/[id]">) {
  const { id } = await props.params
  return (
    <div className="h-screen w-full overflow-hidden">
      <ChatHeader id={id} />
      <ChatContainerRoot className="h-[calc(100vh-13rem)] w-full overflow-y-auto">
        <ChatContainerContent>
          <ChatConversations id={id} />
        </ChatContainerContent>
      </ChatContainerRoot>
      <ChatForm id={id} />
    </div>
  )
}
