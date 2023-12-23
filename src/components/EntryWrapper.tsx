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
        // height: '40px',
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
        {/* <path d="M12,22 L12,36" stroke-width="2px" class="stroke-neutral-750 dark:stroke-neutral-500 border-neutral-750 dark:border-neutral-500 text-neutral-750 dark:text-neutral-400 fill-transparent" fill="transparent" stroke-dasharray="0"></path><circle cx="12" cy="18" r="4" class="stroke-neutral-750 dark:stroke-neutral-500 border-neutral-750 dark:border-neutral-500 text-neutral-750 dark:text-neutral-400 fill-transparent" stroke-width="2" stroke-dasharray="0"></circle> */}
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
