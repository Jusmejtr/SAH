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
import { useI18n } from "../i18n";

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
  const { t } = useI18n();
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
          <span>{t("settings.title")}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="overline" color="text.secondary">
            {t("settings.window")}
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              label={t("settings.width")}
              type="number"
              value={settings.width}
              onChange={(event) => {
                const target = event.target as HTMLInputElement;
                setSettings((prev) => ({ ...prev, width: Number(target.value) || 0 }));
              }}
              fullWidth
            />
            <TextField
              label={t("settings.height")}
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
                {t("settings.startMaximized")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("settings.startMaximizedHelp")}
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
            {t("settings.updates")}
          </Typography>
          <UpdateSection status={update} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" sx={{ color: "text.secondary" }}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" onClick={() => void handleSave()}>
          {t("common.saveChanges")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function UpdateSection({ status }: { status: UpdateStatus | null }) {
  const { t, tm } = useI18n();
  const state = status?.state ?? "idle";
  const busy = state === "checking" || state === "downloading";
  const version = status?.version ?? "";

  const detail =
    state === "error"
      ? tm(status?.error) || t("update.checkFailed")
      : state === "checking"
        ? t("update.checking")
        : state === "up-to-date"
          ? t("update.upToDate")
          : state === "downloading"
            ? t("update.downloading", {
                version,
                percent: status?.percent ?? 0,
              })
            : state === "available"
              ? t("update.available", { version })
              : state === "downloaded"
                ? t("update.downloaded", { version })
                : "";

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
          {t("settings.version", { version: status?.currentVersion || "—" })}
        </Typography>
        <Typography
          variant="caption"
          color={state === "error" ? "error.main" : "text.secondary"}
        >
          {detail || t("update.autoCheck")}
        </Typography>
      </Box>

      {state === "downloaded" ? (
        <Button size="small" variant="contained" onClick={() => void installUpdate()}>
          {t("common.restartInstall")}
        </Button>
      ) : state === "available" ? (
        <Button
          size="small"
          variant="contained"
          onClick={() => void openReleasePage()}
        >
          {t("common.download")}
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
          {t("update.checkNow")}
        </Button>
      )}
    </Stack>
  );
}
