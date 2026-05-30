export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-white/5 bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏮</span>
            <span className="font-heading text-base font-semibold text-warm-white">Talad Nod</span>
          </div>
          <p className="text-sm text-text-muted">
            ระบบรับออเดอร์ตลาดนัด &mdash; สั่งง่าย สะดวก ได้ของไว
          </p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span>© 2026 Talad Nod</span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span>Made with 🧡 for Thai markets</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
