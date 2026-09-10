import { useState } from "preact/hooks";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  alpha,
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
        color="inherit"
        onClick={() => setOpen(true)}
        startIcon={<FaFileExport size={12} />}
      >
        Export
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
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
              <FaFileExport size={16} />
            </Box>
            <span>Export accounts</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <form id="export-accounts-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <Alert severity="warning" variant="outlined">
                The exported file contains plain-text passwords and shared
                secrets. Store it somewhere safe.
              </Alert>

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
          <Button
            onClick={close}
            disabled={saving}
            color="inherit"
            sx={{ color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            form="export-accounts-form"
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <FaFileExport size={12} />
              )
            }
          >
            {saving ? "Exporting…" : "Export"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
