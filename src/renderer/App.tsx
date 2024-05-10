import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Button,
  ButtonGroup,
  CssBaseline,
  CssVarsProvider,
  Sheet,
  ThemeProvider,
  // createTheme,
  useColorScheme,
} from '@mui/joy';
import { Tree } from '../components/Tree';
import './App.css';
import { TerminalComponent } from '../components/TerminalComponent';
import { GithubData, TreeData } from '../types/types';
import { MAIN_BRANCH_NAME, ORIGIN_NAME } from '../types/consts';

const Main = () => {
  const [treeData, setTreeData] = useState<TreeData | null>();
  const [githubData, setGithubData] = useState<GithubData>({});

  useEffect(() => {
    const unsubscribe = window.electron.on('git-tree-updated', (result) => {
      setTreeData(result as TreeData | null);
    });
    return () => unsubscribe();
  }, [setTreeData]);

  useEffect(() => {
    const unsubscribe = window.electron.on('github-updated', (result) => {
      console.log('Updating gh data', {result})
      setGithubData(result as GithubData);
    });
    return () => unsubscribe();
  }, [setGithubData]);


  // useEffect(() => {
  //   // Load on start
  //   window.electron.invoke('extract-git-tree');
  // }, []);

  // useEffect(() => {
  //   const timer = setTimeout(async () => {
  //     window.electron.invoke('extract-git-tree');
  //   }, 1000);
  //   return () => {
  //     clearTimeout(timer);
  //   };
  // }, []);

  const { mode, setMode } = useColorScheme();
  // console.log({ mode });
  if (mode === 'light') {
    setMode('dark');
  }

  const openRepoButton = (
    <Button
      onClick={async () => {
        const cwd = await window.electron.getFolder();
        if (!cwd) {
          return;
        }
        await window.electron.setCwd(cwd);
      }}
    >
      Open Repo
    </Button>
  );

  if (!treeData?.cwd) {
    return openRepoButton;
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
              window.electron.runCommands([{ cmd: 'git', args: ['fetch'] }]);
            }}
          >
            Fetch
          </Button>
          <Button
            disabled={treeData?.dirty}
            onClick={() => {
              window.electron.runCommands([
                { cmd: 'git', args: ['checkout', MAIN_BRANCH_NAME] },
                { cmd: 'git', args: ['pull', ORIGIN_NAME, MAIN_BRANCH_NAME] },
              ]);
            }}
          >
            Pull main
          </Button>
          <Button
            disabled={treeData?.dirty}
            onClick={() => {
              window.electron.runCommands([{ cmd: 'git', args: ['pull'] }]);
            }}
          >
            Pull current
          </Button>
          {/* <Button
            disabled={!treeData || treeData.stashEntries === 0}
            onClick={() => {
              window.electron.runCommands([{ cmd: 'git', args: ['stash', 'clear'] },]);
            }}
          >
            Stash clear
            {treeData && treeData.stashEntries > 0
              ? ` (${treeData?.stashEntries})`
              : ''}
          </Button> */}
          {/* <Button
            onClick={() => {
              window.electron.invoke('stress-test');
            }}
          >
            Stress Test
          </Button>
          <Button
            onClick={() => {
              window.electron.runCommands([{ cmd: 'vim', args: [] },]);
            }}
          >
            Vim
          </Button> */}
          <Button
            onClick={() => {
              window.electron.reloadGithub(['eb442f556ce3e92032d678913274c8b6d8268a6f']);
            }}
          >
            Reload Github
          </Button>
          {openRepoButton}
        </ButtonGroup>
      </div>
      <div slot="start" style={{ flexGrow: 1, overflowY: 'scroll' }}>
        {treeData && <Tree treeData={treeData} githubData={githubData} />}
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
              <Sheet>
                <Main />
              </Sheet>
            </CssVarsProvider>
          }
        />
      </Routes>
    </Router>
  );
}
