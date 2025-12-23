import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'MoveBoss Pro';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Image generation
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
          }}
        >
          <svg
            width="160"
            height="160"
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
            <path d="M16 46V18L32 34L48 18V46" fill="#4F9CF9" />
          </svg>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <span
              style={{
                fontSize: '88px',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              MoveBoss
            </span>
            <span
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#0a0a0a',
                background: 'white',
                padding: '10px 20px',
                borderRadius: '10px',
              }}
            >
              PRO
            </span>
          </div>
        </div>
        <p
          style={{
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '32px',
          }}
        >
          Built for Moving Professionals
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
