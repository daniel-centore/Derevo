export const commit = () => {
  // checkout a new branch
  // git add (selected changes)
  // git commit
};

export const uncommit = () => {
  // checkout parent commit hash
  // delete unused branch (local & remote)
  // soft reset HEAD~1
  // checkout current branch
};

export const amend = () => {
  // git add (selected changes)
  // git amend
  // git rebase all the children commit to the newly amended commit
};
