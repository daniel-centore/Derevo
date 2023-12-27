import { RebaseStatus } from "../../types/types";

let _rebaseStatus: RebaseStatus = 'stopped';

export const rebaseStatus = () => _rebaseStatus;
export const setRebaseStatus = (rs: RebaseStatus) => {
  _rebaseStatus = rs;
};
