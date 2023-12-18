import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
// import icon from '../../assets/icon.svg';
import './App.css';
import { ipcRenderer } from 'electron';
import { useState } from 'react';
import { Tree } from '../components/Tree';
import { TreeData } from '../types/types';

// https://github.com/isomorphic-git/isomorphic-git?tab=readme-ov-file
// https://superlog.dev/docs/essentials
// https://xtermjs.org/
function Hello() {
  const [treeData, setTreeData] = useState<TreeData>();
  // window.electron.api.on('extractGitTree', (_, result) => {
  //   console.log('Got response!!!');
  //   // TODO: Fix types here
  //   setTreeData(result as TreeData);
  // });
  return (
    <div>
      {/* <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div> */}
      <h1>Derevo</h1>
      <div className="Hello">
        <button
          type="button"
          onClick={async () => {
            const tree = await window.electron.api.invoke('extractGitTree');
            setTreeData(tree);
          }}
        >
          Refresh
        </button>
        {treeData && <Tree treeData={treeData} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
