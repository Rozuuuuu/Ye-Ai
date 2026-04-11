/**
 * ColorSwatch — displays a single extracted palette color
 * with its hex code below.
 */
export default function ColorSwatch({ color }) {
  return (
    <div className="flex flex-col items-center gap-1.5 group cursor-default">
      <div
        className="w-7 h-7 rounded-full border border-white/10 shadow-inner transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: color }}
        title={color}
      />
      <span
        className="text-[8px] tracking-wider uppercase transition-colors group-hover:opacity-80"
        style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}
      >
        {color.replace('#', '')}
      </span>
    </div>
  );
}
