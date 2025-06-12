import type { SVGProps } from 'react';
import React from 'react';

const SilverCoinIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <defs>
      <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#E0E0E0', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#B0B0B0', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#silverGradient)" stroke="#808080" />
     <path d="M12 6v12M15.5 9.5L8.5 14.5M15.5 14.5L8.5 9.5" stroke="#A9A9A9" strokeWidth="1.5"/>
    {/* Simple S or sparkle, example S */}
    {/* <text x="50%" y="50%" dy=".3em" textAnchor="middle" fontSize="10" fill="#4F4F4F" fontWeight="bold">S</text> */}
  </svg>
);

export default SilverCoinIcon;
