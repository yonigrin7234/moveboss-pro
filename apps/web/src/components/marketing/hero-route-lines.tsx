'use client';

import styles from './marketing.module.css';

export function HeroRouteLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1400 800"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Connected route paths - spread across the hero */}
      <path
        className={styles.routePath}
        d="M-50,200 Q200,150 400,200 Q600,250 700,350"
      />
      <path
        className={styles.routePath}
        d="M700,350 Q800,450 900,400 Q1100,300 1450,350"
      />
      <path
        className={styles.routePath}
        d="M1450,100 Q1200,150 1000,200 Q800,250 700,350"
      />
      <path
        className={styles.routePath}
        d="M700,350 Q600,450 400,500 Q200,550 -50,600"
      />
      <path
        className={styles.routePath}
        d="M-50,450 Q200,400 400,350 Q550,300 700,350"
      />
      <path
        className={styles.routePath}
        d="M700,350 Q850,380 950,450 Q1100,550 1200,700 Q1300,800 1450,850"
      />

      {/* Nodes with pulse rings */}
      <g>
        <circle className={styles.routeNodeRing} cx="700" cy="350" r="6" />
        <circle className={styles.routeNode} cx="700" cy="350" r="5" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="400"
          cy="200"
          r="5"
          style={{ animationDelay: '-0.5s' }}
        />
        <circle className={styles.routeNode} cx="400" cy="200" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="1000"
          cy="200"
          r="5"
          style={{ animationDelay: '-1s' }}
        />
        <circle className={styles.routeNode} cx="1000" cy="200" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="400"
          cy="500"
          r="5"
          style={{ animationDelay: '-1.5s' }}
        />
        <circle className={styles.routeNode} cx="400" cy="500" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="950"
          cy="450"
          r="5"
          style={{ animationDelay: '-2s' }}
        />
        <circle className={styles.routeNode} cx="950" cy="450" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="200"
          cy="550"
          r="5"
          style={{ animationDelay: '-0.7s' }}
        />
        <circle className={styles.routeNode} cx="200" cy="550" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="1200"
          cy="350"
          r="5"
          style={{ animationDelay: '-1.2s' }}
        />
        <circle className={styles.routeNode} cx="1200" cy="350" r="4" />
      </g>
    </svg>
  );
}
