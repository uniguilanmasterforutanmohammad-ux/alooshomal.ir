/**
 * In-place mockup for the «کاشی ایرانی» theme.
 *
 * Kept next to the theme's metadata so the whole theme can be removed by
 * deleting this file and its entry in `./index.tsx`.
 */
export function KashiThemePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e3d8c2] bg-[#f6f1e6] p-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-[#d9b45a]/60 bg-[#fffdf7] px-2 py-1.5">
        <span className="size-2 rounded-full bg-gradient-to-br from-[#0f766e] to-[#1e3a8a]" />
        <span className="h-1.5 w-10 rounded-full bg-[#e3d8c2]" />
        <span className="ms-auto h-3 w-8 rounded-md bg-gradient-to-r from-[#0f766e] to-[#1e3a8a]" />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-[#e3d8c2] bg-[#fffdf7] p-2">
          <span className="block size-5 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#1e3a8a]" />
          <span className="mt-1.5 block h-1.5 w-12 rounded-full bg-[#e3d8c2]" />
          <span className="mt-1 block h-1.5 w-9 rounded-full bg-[#d9b45a]" />
        </div>
        <div className="relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-lg bg-gradient-to-br from-[#0b2a4a] via-[#0f5f63] to-[#123a6b] p-2">
          <span className="absolute inset-1 rounded-md border border-[#f0d38a]/50" />
          <span className="text-[13px] leading-none text-[#f0d38a]">✦</span>
          <span className="h-1.5 w-8 rounded-full bg-white/40" />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1 px-1">
        <span className="size-2 rounded-full bg-[#b8860b]" />
        <span className="text-[8px] font-bold text-[#5c6b80]">
          لاجورد، فیروزه و طلا
        </span>
      </div>
    </div>
  );
}
