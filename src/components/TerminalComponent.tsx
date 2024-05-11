import { useEffect, useRef } from 'react';
import 'xterm/css/xterm.css';
import { Terminal } from 'xterm';

export const TerminalComponent = () => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) {
            return () => {};
        }
        const terminal = new Terminal({
            rows: 10,
            cols: 100,
        });

        const unsubscribe = window.electron.on('terminal-out', (data) => {
            terminal.write(data as string);
        });
        terminal.onData((data) => {
            window.electron.invoke('terminal-in', data);
        });

        terminal.open(ref.current);

        terminal.write('> ');

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <div
            style={{
                backgroundColor: 'black',
                padding: '5px',
                borderTop: '2px solid white',
            }}
        >
            <div ref={ref} />
        </div>
    );
};
