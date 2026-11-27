import { Component, createElement, useEffect, useMemo, useRef, useState } from "react";
import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import * as RNWeb from "react-native-web";
import { transform } from "sucrase";
import "./PhonePreview.css";

// Compiles the lesson's TypeScript/JSX and runs it with react-native-web, right in the page.
function compile(code) {
  const out = transform(code, {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
  }).code;
  const mod = { exports: {} };
  const req = (name) => {
    if (name === "react") return React;
    if (name === "react-native") return RNWeb;
    if (name === "react/jsx-runtime") return JsxRuntime;
    throw new Error("This preview cannot load the module: " + name);
  };
  new Function("require", "module", "exports", out)(req, mod, mod.exports);
  const e = mod.exports;
  return e.default || e;
}

class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: "" };
  }
  static getDerivedStateFromError(e) {
    return { err: String(e && e.message ? e.message : e) };
  }
  render() {
    if (this.state.err) return <pre className="pv-err">{this.state.err}</pre>;
    return this.props.children;
  }
}

function SnackPhone({ code }) {
  const [shown, setShown] = useState(code);

  useEffect(() => {
    const t = setTimeout(() => setShown(code), 500);
    return () => clearTimeout(t);
  }, [code]);

  const result = useMemo(() => {
    try {
      return { App: compile(shown) };
    } catch (e) {
      return { error: String(e && e.message ? e.message : e) };
    }
  }, [shown]);

  return (
    <div className="pv-wrap">
      <div className="pv-phone">
        <div className="pv-sp">
          <div className="pv-root">
            {result.error ? (
              <pre className="pv-err">{result.error}</pre>
            ) : (
              <Boundary key={shown}>{createElement(result.App)}</Boundary>
            )}
          </div>
        </div>
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