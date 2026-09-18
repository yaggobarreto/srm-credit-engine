import { useState } from 'react';
import { OperatorPanel } from './components/OperatorPanel/OperatorPanel';
import { TransactionsGrid } from './components/TransactionsGrid/TransactionsGrid';

export function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="app">
      <header className="app__header">
        <h1>SRM Credit Engine</h1>
        <p>Painel de precificação e liquidação de recebíveis</p>
      </header>

      <OperatorPanel onSettled={() => setRefreshKey((key) => key + 1)} />
      <TransactionsGrid refreshKey={refreshKey} />
    </main>
  );
}

export default App;
