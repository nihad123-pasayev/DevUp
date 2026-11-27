import { useCallback, useEffect, useRef, useState } from "react";
import "./PhonePreview.css";

const ENTRY = "App.tsx";
// false = use the official Snack embed (always works, but shows the editor too)
const USE_SDK = false;
const SDK_URL = "https://esm.sh/snack-sdk@7";

function embedSrc(code) {
  const files = { [ENTRY]: { type: "CODE", contents: code } };
  return (
    "https://snack.expo.dev/embedded?platform=web&preview=true&theme=light&files=" +
    encodeURIComponent(JSON.stringify(files))
  );
}

function SnackPhone({ code }) {
  const webRef = useRef(null);
  const snackRef = useRef(null);
  const codeRef = useRef(code);
  const [url, setUrl] = useState("");
  const [embed, setEmbed] = useState("");

  const setFrame = useCallback((el) => {
    webRef.current = el ? el.contentWindow : null;
  }, []);

  useEffect(() => {
    let off = false;
    let snack = null;
    if (!USE_SDK) {
      setEmbed(embedSrc(codeRef.current));
      return undefined;
    }
    (async () => {
      try {
        const { Snack } = await import(/* @vite-ignore */ SDK_URL);
        if (off) return;
        snack = new Snack({
          name: "DevUp preview",
          files: { [ENTRY]: { type: "CODE", contents: codeRef.current } },
          webPreviewRef: webRef,
        });
        snackRef.current = snack;
        window.__snack = snack;
        snack.addStateListener((state) => {
          console.log("[snack]", {
            online: state.online,
            resolving: state.isResolving,
            missing: state.missingDependencies,
            channel: state.channel,
            sdk: state.sdkVersion,
            url: state.webPreviewURL,
          });
          if (!off) setUrl(state.webPreviewURL || "");
        });
        snack.setOnline(true);
        setUrl(snack.getState().webPreviewURL || "");
      } catch (e) {
        console.error("[PhonePreview]", e);
        if (!off) setEmbed(embedSrc(codeRef.current));
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
    const t = setTimeout(() => {
      if (s) s.updateFiles({ [ENTRY]: { type: "CODE", contents: code } });
      else setEmbed((old) => (old ? embedSrc(code) : old));
    }, 600);
    return () => clearTimeout(t);
  }, [code]);

  return (
    <div className="pv-wrap">
      <div className="pv-phone">
        <iframe
          ref={setFrame}
          className="pv-screen"
          title="Phone preview"
          allow="screen-wake-lock *; fullscreen *; clipboard-write *"
          src={embed || url || undefined}
        />
        {!url && !embed && <div className="pv-loading">Starting the phone...</div>}
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