import { useState } from "preact/hooks";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FaFileExport } from "react-icons/fa";
import type { ExportLayout, ExportOptions, ExportResult } from "../../api";

type ExportDialogProps = {
  onExport: (options: ExportOptions) => Promise<ExportResult>;
};

const DEFAULT_DELIMITER = ":";

const readEventValue = (event: unknown) => {
  const target = (event as { target?: { value?: string } })?.target;
  return target?.value ?? "";
};

export default function ExportDialog({ onExport }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<ExportLayout>(
    "username,password,sharedSecret",
  );
  const [delimiter, setDelimiter] = useState(DEFAULT_DELIMITER);
  const [customDelimiter, setCustomDelimiter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveDelimiter = delimiter === "custom" ? customDelimiter : delimiter;

  const close = () => {
    setOpen(false);
    setLayout("username,password,sharedSecret");
    setDelimiter(DEFAULT_DELIMITER);
    setCustomDelimiter("");
    setSaving(false);
    setError("");
  };

  const handleSubmit = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!effectiveDelimiter) {
        throw new Error("Select a delimiter.");
      }

      const result = await onExport({
        delimiter: effectiveDelimiter,
        layout,
      });

      if (!result.cancelled) {
        close();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => setOpen(true)}
        startIcon={<FaFileExport />}
      >
        Export Accounts
      </Button>
      <Dialog open={open} onClose={close} fullWidth>
        <DialogTitle>Export Accounts</DialogTitle>
        <DialogContent>
          <form id="export-accounts-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <Typography variant="body2" color="text.secondary">
                Export includes username, password, and shared secret for each account.
              </Typography>

              <TextField
                select
                label="Delimiter"
                value={delimiter}
                onChange={(event) => setDelimiter(readEventValue(event))}
                fullWidth
              >
                <MenuItem value=":">Colon (:)</MenuItem>
                <MenuItem value=";">Semicolon (;)</MenuItem>
                <MenuItem value=",">Comma (,)</MenuItem>
                <MenuItem value="|">Pipe (|)</MenuItem>
                <MenuItem value="\t">Tab</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </TextField>

              {delimiter === "custom" && (
                <TextField
                  label="Custom Delimiter"
                  value={customDelimiter}
                  onChange={(event) => setCustomDelimiter(readEventValue(event))}
                  helperText="Use a single character, e.g. #"
                  fullWidth
                />
              )}

              <TextField
                select
                label="Column Order"
                value={layout}
                onChange={(event) => setLayout(readEventValue(event) as ExportLayout)}
                fullWidth
              >
                <MenuItem value="username,password,sharedSecret">
                  username, password, sharedSecret
                </MenuItem>
                <MenuItem value="password,username,sharedSecret">
                  password, username, sharedSecret
                </MenuItem>
                <MenuItem value="username,password,sharedSecret,displayName">
                  username, password, sharedSecret, displayName
                </MenuItem>
                <MenuItem value="password,username,sharedSecret,displayName">
                  password, username, sharedSecret, displayName
                </MenuItem>
              </TextField>
            </Stack>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            form="export-accounts-form"
            disabled={saving}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
