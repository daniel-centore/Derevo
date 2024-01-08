import { ReactNode } from 'react';
import { CIRCLE_RADIUS, LINE_THICKNESS } from './consts';

export const EntryWrapper = ({
  circleColor,
  disablePointer,
  onClick,
  children,
}: {
  circleColor: string;
  disablePointer?: boolean;
  onClick?: () => Promise<void>;
  children: ReactNode;
}) => {
  return (
    <div
      style={{
        marginTop: '5px',
        marginBottom: '5px',
        flexBasis: '100%',
        display: 'flex',
      }}
    >
      <svg
        width={CIRCLE_RADIUS * 2}
        height={CIRCLE_RADIUS * 2}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          marginLeft: -CIRCLE_RADIUS - LINE_THICKNESS / 2,
          marginTop: '10px',
        }}
      >
        <circle
          cx={CIRCLE_RADIUS}
          cy={CIRCLE_RADIUS}
          r={CIRCLE_RADIUS}
          fill={circleColor}
          cursor={disablePointer || !onClick ? 'default' : 'pointer'}
          onClick={onClick}
        />
      </svg>
      {children}
    </div>
  );
};
