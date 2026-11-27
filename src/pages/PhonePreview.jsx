import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useEffect, useRef, useState } from "react";
import "./PhonePreview.css";

// Runs React Native code in the browser with react-native-web (no Expo servers needed).
const INDEX_TS = `import React from "react";
import { AppRegistry } from "react-native-web";
import App from "./App";

AppRegistry.registerComponent("App", () => App);
AppRegistry.runApplication("App", { rootTag: document.getElementById("root") });
`;

const INDEX_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body, #root { height: 100%; margin: 0; }
      #root { display: flex; flex-direction: column; }
      body { font-family: -apple-system, system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

function toWeb(code) {
  return code.replace(/from\s+(["'])react-native\1/g, 'from "react-native-web"');
}

function Sync({ code }) {
  const { sandpack } = useSandpack();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    sandpack.updateFile("/App.tsx", toWeb(code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  return null;
}

function SnackPhone({ code }) {
  const files = {
    "/App.tsx": toWeb(code),
    "/index.tsx": INDEX_TS,
    "/public/index.html": INDEX_HTML,
  };
  return (
    <div className="pv-wrap">
      <div className="pv-phone">
        <div className="pv-sp">
          <SandpackProvider
            template="react-ts"
            files={files}
            customSetup={{
              dependencies: {
                react: "^18.2.0",
                "react-dom": "^18.2.0",
                "react-native-web": "^0.19.13",
              },
            }}
            options={{ recompileMode: "delayed", recompileDelay: 600 }}
          >
            <Sync code={code} />
            <SandpackLayout style={{ border: 0, borderRadius: 0, height: "100%" }}>
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                style={{ height: "100%" }}
              />
            </SandpackLayout>
          </SandpackProvider>
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