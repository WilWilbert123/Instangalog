import { GlobalChatDrawer } from '@/components/chat/GlobalChatDrawer';

export default function ChatPage() {
  return (
    <div className="h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-6rem)] flex flex-col min-h-0 overflow-hidden">
      <GlobalChatDrawer className="h-full w-full max-w-4xl mx-auto" />
    </div>
  );
}

