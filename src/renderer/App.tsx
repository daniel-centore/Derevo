import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Button,
  ButtonGroup,
  CssBaseline,
  CssVarsProvider,
  ThemeProvider,
  // createTheme,
  useColorScheme,
} from '@mui/joy';
import { Tree } from '../components/Tree';
import './App.css';
import { TerminalComponent } from '../components/TerminalComponent';
import { TreeData } from '../types/types';

const Main = () => {
  const [treeData, setTreeData] = useState<TreeData>();

  useEffect(() => {
    // console.log('Subscribed in renderer');
    const unsubscribe = window.electron.on('git-tree-updated', (result) => {
      // TODO: Improve types?
      // console.log('RECEIVED MESSAGE', { result });
      setTreeData(result as TreeData);
      // setTreeData({test123: 45});
    });
    return () => unsubscribe();
  }, [setTreeData]);

  useEffect(() => {
    // Load on start
    window.electron.invoke('extract-git-tree');
  }, []);

  const { mode, setMode } = useColorScheme();
  // console.log({ mode });
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
      <div
        style={{ marginTop: '18px', marginBottom: '10px', marginLeft: '10px' }}
      >
        {/* TODO: Populate buttons using an array so they always have rounded edges */}
        <ButtonGroup>
          <Button
            onClick={() => {
              window.electron.runCommands(['git fetch']);
            }}
          >
            Fetch
          </Button>
          <Button
            disabled={treeData?.dirty}
            onClick={() => {
              // TODO: Main branch name
              // TODO: origin name
              window.electron.runCommands(['git pull origin main']);
            }}
          >
            Pull main
          </Button>
          <Button
            disabled={treeData?.dirty}
            onClick={() => {
              // TODO: Main branch name
              // TODO: origin name
              window.electron.runCommands(['git pull']);
            }}
          >
            Pull current
          </Button>
          <Button
            disabled={!treeData || treeData.stashEntries === 0}
            onClick={() => {
              window.electron.runCommands(['git stash clear']);
            }}
          >
            Stash clear
            {treeData && treeData.stashEntries > 0
              ? ` (${treeData?.stashEntries})`
              : ''}
          </Button>
        </ButtonGroup>
      </div>
      <div slot="start" style={{ flexGrow: 1, overflowY: 'scroll' }}>
        {treeData && <Tree treeData={treeData} />}
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

// const darkTheme = createTheme({
//   palette: {
//     mode: 'dark',
//   },
// });

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <CssVarsProvider defaultColorScheme="dark">
            {/* <ThemeProvider theme={darkTheme}> */}
              <CssBaseline />
              <Main />
            {/* </ThemeProvider> */}
            </CssVarsProvider>
          }
        />
      </Routes>
    </Router>
  );
}
