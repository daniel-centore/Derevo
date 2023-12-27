import { ClickAwayListener, Menu } from '@mui/base';
import { MenuItem, MenuList } from '@mui/joy';
import { ReactNode, useState } from 'react';

type Point = { x: number; y: number };

export const HasMenu = ({
  children,
  menuItems,
}: {
  children: ReactNode;
  menuItems: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }[];
}) => {
  const [show, setShow] = useState<Point>();
  return (
    <>
      {show && (
        <ClickAwayListener
          onClickAway={() => {
            setShow(undefined);
          }}
        >
          <div
            style={{
              position: 'fixed',
              top: show.y,
              left: show.x,
              zIndex: 99999,
            }}
          >
            <MenuList>
              {menuItems.map(({ label, onClick, disabled }, idx) => (
                <MenuItem
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  onClick={() => {
                    setShow(undefined);
                    onClick();
                  }}
                  disabled={disabled}
                >
                  {label}
                </MenuItem>
              ))}
            </MenuList>
          </div>
        </ClickAwayListener>
      )}
      <span
        onContextMenu={(event) => {
          setShow({ x: event.pageX, y: event.pageY });
        }}
      >
        {children}
      </span>
    </>
  );
};
