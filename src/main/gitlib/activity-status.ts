import { RebaseStatus } from '../../types/types';

let _rebaseStatus: RebaseStatus = 'stopped';
export const rebaseStatus = () => _rebaseStatus;
export const rebaseStatusInProgress = () => _rebaseStatus === 'in-progress';
export const setRebaseStatus = (rs: RebaseStatus) => {
    _rebaseStatus = rs;
};

let _rebaseInitialFrom: string;
export const rebaseInitialFrom = () => _rebaseInitialFrom;
export const setRebaseInitialTo = (rit: string) => {
    _rebaseInitialFrom = rit;
};
