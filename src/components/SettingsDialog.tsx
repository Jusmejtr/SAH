import { useEffect, useState } from "preact/hooks";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Switch,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { FaCog } from "react-icons/fa";
import {
  checkForUpdates,
  getUpdateStatus,
  installUpdate,
  onUpdateStatus,
  openReleasePage,
} from "../api";
import type { AppSettings, UpdateStatus } from "../api";

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

type SettingsState = AppSettings;

const initialSettings = (): SettingsState => ({
  width: 800,
  height: 600,
  maximize: false,
});

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [update, setUpdate] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    getUpdateStatus().then(setUpdate).catch(() => {});
    return onUpdateStatus(setUpdate);
  }, []);

  useEffect(() => {
    if (!open) return;

    const loadSettings = async () => {
      const saved = await window.sah?.getSettings();
      setSettings({
        width: Number(saved?.width ?? 800),
        height: Number(saved?.height ?? 600),
        maximize: Boolean(saved?.maximize),
      });
    };

    void loadSettings();
  }, [open]);

  const handleSave = async () => {
    await window.sah?.setSettings(settings);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={(theme) => ({
              width: 38,
              height: 38,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            })}
          >
            <FaCog size={17} />
          </Box>
          <span>Settings</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Window
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Width"
              type="number"
              value={settings.width}
              onChange={(event) => {
                const target = event.target as HTMLInputElement;
                setSettings((prev) => ({ ...prev, width: Number(target.value) || 0 }));
              }}
              fullWidth
            />
            <TextField
              label="Height"
              type="number"
              value={settings.height}
              onChange={(event) => {
                const target = event.target as HTMLInputElement;
                setSettings((prev) => ({ ...prev, height: Number(target.value) || 0 }));
              }}
              fullWidth
            />
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            sx={(theme) => ({
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.25,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
            })}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Start maximized
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ignore the size above and open full screen.
              </Typography>
            </Box>
            <Switch
              checked={settings.maximize}
              onChange={(event) => {
                const target = event.target as HTMLInputElement;
                setSettings((prev) => ({ ...prev, maximize: target.checked }));
              }}
            />
          </Stack>

          <Divider />

          <Typography variant="overline" color="text.secondary">
            Updates
          </Typography>
          <UpdateSection status={update} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" sx={{ color: "text.secondary" }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleSave()}>
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const UPDATE_LABELS: Record<UpdateStatus["state"], string> = {
  idle: "",
  checking: "Checking for updates…",
  "up-to-date": "You are on the latest version.",
  available: "A new version is available.",
  downloading: "Downloading the update…",
  downloaded: "Update downloaded and ready to install.",
  error: "",
};

function UpdateSection({ status }: { status: UpdateStatus | null }) {
  const state = status?.state ?? "idle";
  const busy = state === "checking" || state === "downloading";

  const detail =
    state === "error"
      ? status?.error || "Could not check for updates."
      : state === "downloading"
        ? `Downloading v${status?.version} — ${status?.percent ?? 0}%`
        : state === "available" || state === "downloaded"
          ? `${UPDATE_LABELS[state]} (v${status?.version})`
          : UPDATE_LABELS[state];

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={(theme) => ({
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1.25,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Version {status?.currentVersion || "—"}
        </Typography>
        <Typography
          variant="caption"
          color={state === "error" ? "error.main" : "text.secondary"}
        >
          {detail || "Updates are checked automatically."}
        </Typography>
      </Box>

      {state === "downloaded" ? (
        <Button size="small" variant="contained" onClick={() => void installUpdate()}>
          Restart &amp; install
        </Button>
      ) : state === "available" ? (
        <Button
          size="small"
          variant="contained"
          onClick={() => void openReleasePage()}
        >
          Download
        </Button>
      ) : (
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          disabled={busy}
          onClick={() => void checkForUpdates()}
          startIcon={busy ? <CircularProgress size={13} color="inherit" /> : undefined}
        >
          Check now
        </Button>
      )}
    </Stack>
  );
}
