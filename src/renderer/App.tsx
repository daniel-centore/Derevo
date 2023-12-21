import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Tree } from '../components/Tree';
import './App.css';
import { TerminalComponent } from '../components/TerminalComponent';

const Main = () => {
  useEffect(() => {
    // Load on start
    window.electron.api.invoke('extractGitTree');
  }, []);

  return (
    <div
      style={{
        maxHeight: '100vh',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h1>Derevo</h1>
      <div style={{ marginBottom: '10px' }}>
        <button
          type="button"
          onClick={() => {
            window.electron.api.invoke('extractGitTree');
          }}
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => {
            window.electron.api.invoke('git-pull');
          }}
        >
          Pull
        </button>
      </div>
      <div slot="start" style={{ flexGrow: 1, overflowY: 'scroll' }}>
        <Tree />
      </div>
      <div
        slot="end"
        style={{
          minHeight: '200px',
          flexGrow: 0,
        }}
      >
        <TerminalComponent />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
      </Routes>
    </Router>
  );
}
