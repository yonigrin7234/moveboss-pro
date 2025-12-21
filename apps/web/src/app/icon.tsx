import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          borderRadius: '6px',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 64 64"
          fill="none"
        >
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="12"
            stroke="white"
            strokeWidth="3"
            fill="none"
          />
          <path d="M16 46V18L32 34L48 18V46" fill="white" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
