import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
} from "@decky/ui";
import { callable, definePlugin, toaster } from "@decky/api";
import { useEffect, useState } from "react";
import { FaTerminal } from "react-icons/fa";

type Status = {
  unit: string;
  load_state: string;
  active_state: string;
  sub_state: string;
  result: string;
  unit_file_state: string;
  ok: boolean;
};

type ActionResult = { ok: boolean; error: string };

const getStatus = callable<[], Status>("get_status");
const startUnit = callable<[], ActionResult>("start");
const stopUnit = callable<[], ActionResult>("stop");
const restartUnit = callable<[], ActionResult>("restart");

const POLL_MS = 3000;

function activeColor(s: Status | undefined): string {
  if (!s) return "#888";
  if (s.active_state === "active") return "#3fb950";
  if (s.active_state === "failed") return "#f85149";
  return "#d29922";
}

function Content() {
  const [status, setStatus] = useState<Status | undefined>();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setStatus(await getStatus());
    } catch (e) {
      console.error("get_status failed", e);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const run = async (
    label: string,
    fn: () => Promise<ActionResult>,
  ) => {
    setBusy(true);
    try {
      const r = await fn();
      if (!r.ok) {
        toaster.toast({
          title: `${label} failed`,
          body: r.error || "unknown error",
        });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const stateLabel = status
    ? `${status.active_state}${status.sub_state ? ` (${status.sub_state})` : ""}`
    : "loading…";

  return (
    <PanelSection title="opencode-web.service">
      <PanelSectionRow>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 0",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: activeColor(status),
              display: "inline-block",
            }}
          />
          <span>{stateLabel}</span>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={busy || status?.active_state === "active"}
          onClick={() => run("Start", startUnit)}
        >
          Start
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={busy || status?.active_state !== "active"}
          onClick={() => run("Stop", stopUnit)}
        >
          Stop
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={busy}
          onClick={() => run("Restart", restartUnit)}
        >
          Restart
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => ({
  name: "OpenCode Web",
  titleView: <div className={staticClasses.Title}>OpenCode Web</div>,
  content: <Content />,
  icon: <FaTerminal />,
  onDismount() {},
}));
