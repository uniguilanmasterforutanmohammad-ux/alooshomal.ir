// Put <ThemeScript /> as the first child inside <head> / <body> in layout.tsx.
// Runs before paint so the page never flashes light before switching to dark.
export function ThemeScript() {
  const code = `
    try {
      var t = localStorage.getItem('theme');
      if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
