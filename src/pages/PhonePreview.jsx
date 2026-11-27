import { useCallback, useEffect, useRef, useState } from "react";
import "./PhonePreview.css";

const ENTRY = "App.tsx";

function SnackPhone({ code }) {
  const webRef = useRef(null);
  const snackRef = useRef(null);
  const codeRef = useRef(code);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const setFrame = useCallback((el) => {
    webRef.current = el ? el.contentWindow : null;
  }, []);

  useEffect(() => {
    let off = false;
    let snack = null;
    (async () => {
      try {
        const { Snack } = await import("snack-sdk");
        if (off) return;
        snack = new Snack({
          name: "DevUp preview",
          files: { [ENTRY]: { type: "CODE", contents: codeRef.current } },
          webPreviewRef: webRef,
        });
        snackRef.current = snack;
        snack.addStateListener(() => {
          if (!off) setUrl(snack.getState().webPreviewURL || "");
        });
        snack.setOnline(true);
        setUrl(snack.getState().webPreviewURL || "");
      } catch {
        if (!off) {
          setError("The phone preview could not start. Check your internet and reload.");
        }
      }
    })();
    return () => {
      off = true;
      snackRef.current = null;
      if (snack) snack.setOnline(false);
    };
  }, []);

  useEffect(() => {
    codeRef.current = code;
    const s = snackRef.current;
    if (!s) return;
    const t = setTimeout(() => {
      s.updateFiles({ [ENTRY]: { type: "CODE", contents: code } });
    }, 500);
    return () => clearTimeout(t);
  }, [code]);

  return (
    <div className="pv-wrap">
      <div className="pv-phone">
        <iframe
          ref={setFrame}
          className="pv-screen"
          title="Phone preview"
          src={url || undefined}
        />
        {!url && !error && <div className="pv-loading">Starting the phone...</div>}
        {error && <div className="pv-loading pv-error">{error}</div>}
      </div>
    </div>
  );
}

function DartPadFrame({ code }) {
  const frameRef = useRef(null);
  const codeRef = useRef(code);
  const [round, setRound] = useState(0);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  function send() {
    const w = frameRef.current && frameRef.current.contentWindow;
    if (!w) return;
    w.postMessage(
      { type: "sourceCode", sourceCode: { "main.dart": codeRef.current } },
      "*"
    );
  }

  return (
    <div className="pv-wrap">
      <div className="pv-dart-bar">
        <span>Flutter preview</span>
        <button type="button" onClick={() => setRound((n) => n + 1)}>
          Load my code
        </button>
      </div>
      <iframe
        key={round}
        ref={frameRef}
        className="pv-dart"
        title="Flutter preview"
        src="https://dartpad.dev/embed-flutter.html"
        onLoad={() => {
          send();
          setTimeout(send, 800);
        }}
      />
      <p className="pv-note">Press Run inside the frame to see your app.</p>
    </div>
  );
}

export default function PhonePreview({ kind, code }) {
  if (kind === "snack") return <SnackPhone code={code} />;
  if (kind === "dartpad") return <DartPadFrame code={code} />;
  return null;
}