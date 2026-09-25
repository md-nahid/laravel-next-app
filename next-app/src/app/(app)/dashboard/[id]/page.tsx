import { ChatConversations } from "./_blocks/chat-conversations"
import { ChatForm } from "./_blocks/chat-form"
import { ChatHeader } from "./_blocks/chat-header"

export default async function ChatPage(props: PageProps<"/dashboard/[id]">) {
  const { id } = await props.params
  return (
    <>
      <ChatHeader id={id} />
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
        <div className="h-full flex-1">
          <ChatConversations id={id} />
        </div>
        <ChatForm id={id} />
      </div>
    </>
  )
}
