export default function Home() {
  const lanes = [
    { label: "Inbox", count: 8, tone: "bg-sky-500" },
    { label: "Projects", count: 5, tone: "bg-emerald-500" },
    { label: "Private", count: 2, tone: "bg-violet-500" },
  ];

  const notes = [
    { title: "Sprint 0 scaffold", meta: "Foundation", status: "Doing" },
    { title: "Private workspace defaults", meta: "Access model", status: "Open" },
    { title: "Implementation risks", meta: "Risk register", status: "Watch" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#1e2328]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-[#d8dee6] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#52616f]">
              ContextOS
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#131820]">
              Workspace
            </h1>
          </div>
          <div className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-medium text-[#2d4658] shadow-sm">
            Sprint 0
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[220px_1fr_280px]">
          <nav className="rounded-md border border-[#d8dee6] bg-white p-3 shadow-sm">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#64717f]">
              Spaces
            </p>
            <div className="mt-3 space-y-1">
              {lanes.map((lane) => (
                <div
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-[#30342f]"
                  key={lane.label}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-sm ${lane.tone}`}
                      aria-hidden="true"
                    />
                    {lane.label}
                  </span>
                  <span className="text-xs text-[#687381]">{lane.count}</span>
                </div>
              ))}
            </div>
          </nav>

          <section className="rounded-md border border-[#d8dee6] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#131820]">
                Active context
              </h2>
              <span className="rounded-sm bg-[#dff4ec] px-2 py-1 text-xs font-medium text-[#186249]">
                Private
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {notes.map((note) => (
                <article className="border-t border-[#e6ebf0] py-4" key={note.title}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#1d252d]">{note.title}</p>
                      <p className="mt-2 text-sm text-[#65717e]">{note.meta}</p>
                    </div>
                    <span className="shrink-0 rounded-sm bg-[#edf2f7] px-2 py-1 text-xs text-[#405267]">
                      {note.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="rounded-md border border-[#22303c] bg-[#18212b] p-4 text-white shadow-sm">
            <h2 className="text-base font-semibold">System status</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#abc4d6]">
                  App router
                </dt>
                <dd className="mt-1 text-sm">Ready</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#abc4d6]">
                  TypeScript
                </dt>
                <dd className="mt-1 text-sm">Strict mode</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#abc4d6]">
                  Data layer
                </dt>
                <dd className="mt-1 text-sm">Not started</dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
