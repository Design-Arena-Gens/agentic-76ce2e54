import styles from "./styles/page.module.css";
import AgentChat from "./components/AgentChat";

export default function Page() {
  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1>Agentic AI Bot</h1>
        <p>Give it a goal and watch the agent plan, decide on tools, and deliver results.</p>
      </header>
      <AgentChat />
      <footer className={styles.footer}>
        <p>
          Powered by OpenAI. Configure your <code>OPENAI_API_KEY</code> to get real responses.
        </p>
      </footer>
    </main>
  );
}
