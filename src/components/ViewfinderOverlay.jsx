/**
 * ViewfinderOverlay — corner brackets + tech metadata labels.
 * Purely presentational, pointer-events: none.
 */
export default function ViewfinderOverlay() {
  return (
    <div className="relative w-72 h-96 md:w-80 md:h-[30rem] pointer-events-none select-none">
      {/* ─── Corner Brackets ─── */}
      <div className="viewfinder-bracket top-0 left-0 border-t border-l" />
      <div className="viewfinder-bracket top-0 right-0 border-t border-r" />
      <div className="viewfinder-bracket bottom-0 left-0 border-b border-l" />
      <div className="viewfinder-bracket bottom-0 right-0 border-b border-r" />

      {/* ─── Tech Labels ─── */}
      <div
        className="absolute -top-10 left-0 text-[10px] tracking-widest uppercase opacity-60"
        style={{ color: '#ffb3b0', fontFamily: 'Inter, sans-serif' }}
      >
        AF-LOCK: FASHION_EYE_v2.0
      </div>
      <div
        className="absolute -bottom-10 right-0 text-[10px] tracking-widest uppercase opacity-60"
        style={{ color: '#ffb3b0', fontFamily: 'Inter, sans-serif' }}
      >
        1/250 ISO 100 F1.8
      </div>

      {/* ─── Center crosshair ─── */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="w-5 h-px" style={{ background: '#ffb3b0' }} />
        <div className="h-5 w-px absolute" style={{ background: '#ffb3b0' }} />
      </div>
    </div>
  );
}
