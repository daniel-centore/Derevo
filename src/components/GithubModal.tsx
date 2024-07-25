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
import { useEffect, useState } from 'react';

const NEW_TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo';

export const GithubModal = ({
    defaultValue,
    open,
    setOpen,
}: {
    defaultValue: string;
    open: boolean;
    setOpen: (x: boolean) => void;
}) => {
    const [token, setToken] = useState(defaultValue);
    useEffect(() => {
        setToken(defaultValue);
    }, [open, defaultValue]);
    return (
        <Modal open={open} onClose={() => setOpen(false)}>
            <ModalDialog layout="center" size="md" variant="outlined">
                <ModalClose />
                <div>
                    <Typography level="h2">GitHub Token</Typography>
                    <Typography style={{ paddingTop: '10px' }}>
                        Create a classic personal access token with the repo
                        scope:
                    </Typography>
                    <Button
                        variant="plain"
                        onClick={() => {
                            window.electron.openExternal(NEW_TOKEN_URL);
                        }}
                    >
                        {NEW_TOKEN_URL}
                    </Button>
                    <Typography style={{ paddingTop: '10px' }}>
                        Paste the token here:
                    </Typography>
                    <Input
                        placeholder="Github Token"
                        value={token}
                        onChange={(e) => {
                            setToken(e.target.value);
                        }}
                    />
                    <ButtonGroup style={{ float: 'right', marginTop: '15px' }}>
                        <Button
                            onClick={() => {
                                setOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                window.electron.setGithubToken(token);
                                setOpen(false);
                            }}
                            color="success"
                            variant="solid"
                        >
                            Save
                        </Button>
                    </ButtonGroup>
                </div>
            </ModalDialog>
        </Modal>
    );
};
