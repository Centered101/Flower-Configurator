export function HeroPreviewStatic() {
  return (
    <div className="rounded-bloom border border-pink-100 bg-white p-4 shadow-soft" data-aos="zoom-in">
      <div className="relative h-[440px] overflow-hidden rounded-bloom bg-blush">
        <svg
          viewBox="0 0 420 520"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full select-none"
          role="img"
          aria-label="ภาพตัวอย่างดอกไม้ลวดกำมะหยี่"
        >
          <defs>
            <radialGradient id="hero-preview-bg" cx="50%" cy="20%" r="82%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="58%" stopColor="#FCE4EC" />
              <stop offset="100%" stopColor="#F8BBD0" />
            </radialGradient>
            <filter id="hero-preview-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="#AD5576" floodOpacity="0.18" />
            </filter>
          </defs>
          <rect width="420" height="520" rx="28" fill="url(#hero-preview-bg)" />
          <ellipse cx="210" cy="474" rx="112" ry="18" fill="#AD5576" opacity="0.12" />
          <g filter="url(#hero-preview-shadow)">
            {[-54, -28, 0, 28, 54].map((offset, index) => (
              <g key={offset} transform={`translate(${210 + offset} ${112 + Math.abs(offset) * 0.25}) rotate(${offset * 0.18})`}>
                <path d={`M0 0 C${-offset * 0.16} 95, ${-offset * 0.18} 250, ${-offset * 0.22} 330`} fill="none" stroke="#2E7D32" strokeWidth="5" strokeLinecap="round" />
                <path
                  d={index % 2 ? "M0 0 C24 -10 42 -30 54 -58 C24 -52 6 -24 0 0Z" : "M0 0 C-24 -10 -42 -30 -54 -58 C-24 -52 -6 -24 0 0Z"}
                  fill="#81B888"
                  stroke="#3F7E45"
                  strokeWidth="1.8"
                  opacity="0.78"
                  transform={`translate(${index % 2 ? 18 : -18} 190) rotate(${index % 2 ? 16 : -16})`}
                />
              </g>
            ))}
            {[
              ["#F8BBD0", 156, 92, -14, 0.86],
              ["#F48FB1", 188, 74, -5, 0.94],
              ["#FCE4EC", 222, 70, 4, 0.98],
              ["#F8BBD0", 254, 88, 13, 0.9],
              ["#F48FB1", 210, 112, 0, 0.9]
            ].map(([color, cx, cy, rotate, scale]) => (
              <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${scale})`}>
                {Array.from({ length: 14 }, (_, index) => {
                  const angle = (360 / 14) * index;
                  return (
                    <ellipse
                      key={angle}
                      cx="0"
                      cy="-34"
                      rx="12"
                      ry="34"
                      fill={String(color)}
                      stroke="#D56A91"
                      strokeWidth="1.8"
                      opacity="0.94"
                      transform={`rotate(${angle})`}
                    />
                  );
                })}
                <circle cx="0" cy="0" r="26" fill="#FDD835" stroke="#B28B00" strokeWidth="4" />
                <circle cx="-8" cy="-4" r="3.5" fill="#C99A00" opacity="0.65" />
                <circle cx="5" cy="5" r="3.5" fill="#C99A00" opacity="0.65" />
              </g>
            ))}
            <path d="M96 288 C138 262 282 262 324 288 L282 482 C246 500 174 500 138 482Z" fill="#FFFFFF" stroke="#D56A91" strokeWidth="3" opacity="0.78" />
            <path d="M102 288 L198 386 L137 482Z" fill="#FCE4EC" opacity="0.5" />
            <path d="M318 288 L222 386 L283 482Z" fill="#F8BBD0" opacity="0.42" />
            <g transform="translate(210 365)">
              <path d="M-12 0 C-60 -30 -82 -20 -104 4 C-70 26 -42 31 -12 0Z" fill="#F48FB1" stroke="#AD5576" strokeWidth="3" />
              <path d="M12 0 C60 -30 82 -20 104 4 C70 26 42 31 12 0Z" fill="#F48FB1" stroke="#AD5576" strokeWidth="3" />
              <circle cx="0" cy="0" r="17" fill="#F48FB1" stroke="#AD5576" strokeWidth="3" />
            </g>
          </g>
          <g className="pointer-events-none">
            <circle cx="354" cy="44" r="22" fill="#FFFFFF" opacity="0.95" />
            <circle cx="394" cy="44" r="22" fill="#FFFFFF" opacity="0.95" />
            <path d="M349 44 H359 M354 39 V49" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
            <path d="M386 40 C392 34 402 38 402 47 C402 55 394 60 386 56" fill="none" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent p-4 text-white">
          <p className="text-sm font-semibold">ตัวอย่างดอกไม้ลวดกำมะหยี่</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/90 px-3 py-1 text-ink">5 ดอก</span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-ink">กระดาษชมพู</span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-ink">ริบบิ้นชมพู</span>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-soft bg-blush/70 px-4 py-3 text-sm text-zinc-700">
        <p className="font-semibold text-ink">ภาพตัวอย่างงานสั่งทำ</p>
        <p className="mt-2 text-xs text-zinc-600">สีและวัสดุจริงอาจแตกต่างเล็กน้อยตามแสง ภาพถ่าย และงานทำมือ</p>
      </div>
    </div>
  );
}
