import { useEffect, useState } from "preact/hooks";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { FaCog } from "react-icons/fa";
import type { AppSettings } from "../api";

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
