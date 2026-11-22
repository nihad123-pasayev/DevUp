import "./ResourceLesson.css";
import LessonContent from "./LessonContent.jsx";

// theory mətnini "## " başlıqlarına görə bölmələrə ayırır
function splitSections(md) {
  return md
    .replace(/\r\n/g, "\n")
    .split(/^## /m)
    .filter((p) => p.trim())
    .map((p) => {
      const nl = p.indexOf("\n");
      return { title: p.slice(0, nl).trim(), body: p.slice(nl + 1).trim() };
    });
}

function sectionKind(title) {
  const t = title.toLowerCase();
  if (t.includes("link")) return "links";
  if (t.includes("video")) return "video";
  if (/getting started|how to use|starter/.test(t)) return "steps";
  if (t.includes("mistake")) return "warn";
  if (t.includes("recap")) return "recap";
  return "plain";
}

// "- [Ad](url): izah" sətirlərini link kartlarına çevirir
function LinkCards({ body }) {
  const items = [...body.matchAll(/^- \[(.+?)\]\((.+?)\)(?::\s*(.*))?$/gm)].map(
    (m) => ({ title: m[1], url: m[2], desc: m[3] || "" }),
  );
  if (items.length === 0) return <LessonContent text={body} />;
  return (
    <div className="rl-links">
      {items.map((it) => {
        let host = it.url;
        try {
          host = new URL(it.url).hostname.replace(/^www\./, "");
        } catch {
          /* ignore */
        }
        return (
          <a
            key={it.url}
            className="rl-link"
            href={it.url}
            target="_blank"
            rel="noreferrer"
          >
            <b>{it.title}</b>
            {it.desc && <span>{it.desc}</span>}
            <em>{host} ↗</em>
          </a>
        );
      })}
    </div>
  );
}

export default function ResourceLesson({ text, videoSrc, title }) {
  const sections = splitSections(text || "");
  // video bölməsi ilk bölmədən sonra gəlsin
  const vi = sections.findIndex((s) => /video/i.test(s.title));
  if (vi > 1) {
    const [v] = sections.splice(vi, 1);
    sections.splice(1, 0, v);
  }

  return (
    <div className="rl">
      {sections.map((s) => {
        const kind = sectionKind(s.title);
        return (
          <section key={s.title} className={"rl-sec rl-" + kind}>
            <h2>{s.title}</h2>
            {kind === "links" ? (
              <LinkCards body={s.body} />
            ) : (
              <>
                {kind === "video" && videoSrc && (
                  <div className="video-wrapper">
                    <iframe
                      src={videoSrc}
                      title={title}
                      allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                )}
                <LessonContent text={s.body} />
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}