import {
    Button,
    ButtonGroup,
    Modal,
    ModalClose,
    ModalDialog,
    Typography,
    Link,
    Input,
} from '@mui/joy';
import type { Verification } from '@octokit/auth-oauth-device/dist-types/types';
import { useEffect, useState } from 'react';
import { GithubStatus } from '../types/types';

const NEW_TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo';

export const GithubModal = ({
    verification,
    open,
    setOpen,
    githubStatus,
}: {
    verification: Verification | undefined;
    open: boolean;
    setOpen: (x: boolean) => void;
    githubStatus: GithubStatus;
}) => {
    useEffect(() => {
        if (
            githubStatus.status === 'authenticated' ||
            githubStatus.status === 'auth-bad'
        ) {
            // No need to start auth process if user is already logged in
            return;
        }
        window.electron.authGithub();
    }, [githubStatus.status, open]);

    if (
        githubStatus.status === 'authenticated' ||
        githubStatus.status === 'auth-bad'
    ) {
        // Show logout button
        return (
            <Modal open={open} onClose={() => setOpen(false)}>
                <ModalDialog layout="center" size="md" variant="outlined">
                    <ModalClose />
                    <div>
                        <Button
                            variant="plain"
                            onClick={() => {
                                window.electron.logoutGithub();
                                setOpen(false);
                            }}
                        >
                            Logout
                        </Button>
                    </div>
                </ModalDialog>
            </Modal>
        );
    }

    // Show login button

    return (
        <Modal open={open} onClose={() => setOpen(false)}>
            <ModalDialog layout="center" size="md" variant="outlined">
                <ModalClose />
                <div>
                    <Typography level="h2">GitHub Authorization</Typography>
                    {!verification && (
                        <Typography style={{ paddingTop: '10px' }}>
                            One moment plz...
                        </Typography>
                    )}
                    {verification && (
                        <>
                            <Typography style={{ paddingTop: '10px' }}>
                                Open the Github verification URL:
                            </Typography>
                            <Button
                                variant="plain"
                                onClick={() => {
                                    window.electron.openExternal(
                                        verification.verification_uri,
                                    );
                                }}
                            >
                                {verification.verification_uri}
                            </Button>
                            <Typography style={{ paddingTop: '10px' }}>
                                And enter the following code:{' '}
                                <span style={{ fontWeight: 800 }}>
                                    {verification.user_code}
                                </span>
                            </Typography>
                        </>
                    )}
                </div>
            </ModalDialog>
        </Modal>
    );
};
