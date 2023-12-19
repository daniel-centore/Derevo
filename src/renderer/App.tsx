import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
// import icon from '../../assets/icon.svg';
import './App.css';
import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';
import { Tree } from '../components/Tree';
import { TreeData } from '../types/types';

// https://github.com/isomorphic-git/isomorphic-git?tab=readme-ov-file
// https://superlog.dev/docs/essentials
// https://xtermjs.org/
// TODO: Terminal - https://stackoverflow.com/questions/63390143/how-do-i-connect-xterm-jsin-electron-to-a-real-working-command-prompt
const Hello = () => {
  const [treeData, setTreeData] = useState<TreeData>();
  // window.electron.api.on('extractGitTree', (_, result) => {
  //   console.log('Got response!!!');
  //   // TODO: Fix types here
  //   setTreeData(result as TreeData);
  // });
  console.log('Hello!!', { treeData });

  // useIpcListener('extractGitTree', (data) => {
  //   console.log('RECEIVED MESSAGE', { data });
  //   setTreeData(data);
  // });
  useEffect(() => {
    console.log('Subscribed in renderer');
    const unsubscribe = window.electron.api.on('extractGitTree', (result) => {
      // TODO: Improve types?
      console.log('RECEIVED MESSAGE', { result });
      setTreeData(result as TreeData);
      // setTreeData({test123: 45});
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    // Load on start
    window.electron.api.invoke('extractGitTree');
  }, []);
  return (
    <div>
      <h1>Derevo</h1>
      <div>
        <button
          type="button"
          onClick={() => {
            window.electron.api.invoke('extractGitTree');
          }}
        >
          Refresh
        </button>
        {treeData && <Tree treeData={treeData} />}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
