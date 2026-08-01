import { useEffect, useState } from "preact/hooks";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
} from "@mui/material";
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
      <DialogTitle>App Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Window Width"
            type="number"
            value={settings.width}
            onChange={(event) => {
              const target = event.target as HTMLInputElement;
              setSettings((prev) => ({ ...prev, width: Number(target.value) || 0 }));
            }}
            fullWidth
          />
          <TextField
            label="Window Height"
            type="number"
            value={settings.height}
            onChange={(event) => {
              const target = event.target as HTMLInputElement;
              setSettings((prev) => ({ ...prev, height: Number(target.value) || 0 }));
            }}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.maximize}
                onChange={(event) => {
                  const target = event.target as HTMLInputElement;
                  setSettings((prev) => ({ ...prev, maximize: target.checked }));
                }}
              />
            }
            label="Start maximized"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleSave()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
