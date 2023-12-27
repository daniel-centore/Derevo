import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button, CssBaseline, CssVarsProvider, useColorScheme } from '@mui/joy';
import { Tree } from '../components/Tree';
import './App.css';
import { TerminalComponent } from '../components/TerminalComponent';

const Main = () => {
  useEffect(() => {
    // Load on start
    window.electron.api.invoke('extractGitTree');
  }, []);

  const { mode, setMode } = useColorScheme();
  console.log({mode});
  if (mode === 'light') {
    setMode('dark');
  }

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
      <div style={{ marginTop: '18px', marginBottom: '10px' }}>
        <Button
          variant="outlined"
          onClick={() => {
            window.electron.api.invoke('extractGitTree');
          }}
        >
          Refresh
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            window.electron.api.invoke('git-pull');
          }}
        >
          Pull
        </Button>
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
        <Route
          path="/"
          element={
            <CssVarsProvider defaultColorScheme="dark">
              <CssBaseline />
              <Main />
            </CssVarsProvider>
          }
        />
      </Routes>
    </Router>
  );
}
