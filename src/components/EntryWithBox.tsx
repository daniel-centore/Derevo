import { ReactNode } from 'react';
import { EntryWrapper } from './EntryWrapper';

export const EntryWithBox = ({ children }: { children: ReactNode }) => {
  return (
    <EntryWrapper circleColor="cyan">
      <div
        style={{
          marginLeft: '20px',
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingTop: '15px',
          paddingBottom: '15px',
          backgroundColor: 'rgb(30 30 30)',
          borderRadius: '10px',
          borderStyle: 'solid',
          borderColor: 'rgb(100 100 100)',
          borderWidth: '2px',
          minWidth: '600px',
        }}
      >
        {children}
      </div>
    </EntryWrapper>
  );
};
