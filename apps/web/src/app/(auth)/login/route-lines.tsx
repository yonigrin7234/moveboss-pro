'use client';

import styles from './login.module.css';

export function RouteLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 800 900"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Connected route paths between nodes - shifted to avoid headline overlap */}
      <path
        className={styles.routePath}
        d="M-50,60 Q100,80 200,120 Q380,180 420,280"
      />
      <path
        className={styles.routePath}
        d="M420,280 Q440,340 460,380 Q500,440 500,440"
      />
      <path
        className={styles.routePath}
        d="M500,440 Q540,480 560,520 Q600,600 620,700 Q640,800 660,950"
      />

      <path
        className={styles.routePath}
        d="M850,100 Q700,140 580,200 Q480,260 500,440"
      />
      <path
        className={styles.routePath}
        d="M500,440 Q460,500 400,540 Q300,600 200,650 Q80,720 -50,800"
      />

      <path
        className={styles.routePath}
        d="M-50,350 Q100,380 200,400 Q350,440 420,280"
      />
      <path
        className={styles.routePath}
        d="M420,280 Q500,250 580,200 Q700,140 850,120"
      />

      {/* Nodes with pulse rings - positioned to avoid text overlap */}
      <g>
        <circle className={styles.routeNodeRing} cx="420" cy="280" r="5" />
        <circle className={styles.routeNode} cx="420" cy="280" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="500"
          cy="440"
          r="5"
          style={{ animationDelay: '-0.7s' }}
        />
        <circle className={styles.routeNode} cx="500" cy="440" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="150"
          cy="500"
          r="5"
          style={{ animationDelay: '-1.2s' }}
        />
        <circle className={styles.routeNode} cx="150" cy="500" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="580"
          cy="200"
          r="5"
          style={{ animationDelay: '-0.4s' }}
        />
        <circle className={styles.routeNode} cx="580" cy="200" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="400"
          cy="540"
          r="5"
          style={{ animationDelay: '-0.9s' }}
        />
        <circle className={styles.routeNode} cx="400" cy="540" r="4" />
      </g>
      <g>
        <circle
          className={styles.routeNodeRing}
          cx="620"
          cy="700"
          r="5"
          style={{ animationDelay: '-1.5s' }}
        />
        <circle className={styles.routeNode} cx="620" cy="700" r="4" />
      </g>
    </svg>
  );
}
