let _counter = 0;

export default function MaekaLogo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  const id = `m${_counter++}`;
  const textSize = size * 0.625;
  return (
    <div className="flex items-center gap-2.5 select-none" style={{ height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f97316" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill={`url(#${id}-g)`} />
        <path
          d="M10 28V14l5 8 5-6 5 8 5-8v14"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="20" cy="29" r="2" fill="#fff" />
      </svg>
      {showText && (
        <span
          className="font-bold tracking-tight text-gray-800 whitespace-nowrap"
          style={{ fontSize: textSize }}
        >
          Maeka<span className="text-orange-600">OS</span>
        </span>
      )}
    </div>
  );
}
