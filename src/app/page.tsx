export default function Home() {
  return (
    <div className="flex items-center justify-center h-screen bg-neutral-950 text-white">
      <div className="text-center max-w-lg px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
          O
        </div>
        <h1 className="text-3xl font-bold mb-3">OpenClaw Platform</h1>
        <p className="text-neutral-400 mb-6">
          Your personal AI agent, powered by OpenClaw. Access this app through
          your Whop membership.
        </p>
        <a
          href="https://whop.com"
          className="inline-block px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          Go to Whop
        </a>
      </div>
    </div>
  );
}
