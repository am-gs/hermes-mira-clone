import { ChatInterface } from '../components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
          Hermes Mira Clone
        </h1>
        <ChatInterface />
      </div>
    </main>
  );
}
