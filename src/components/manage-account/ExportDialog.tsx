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
import { useI18n } from "../../i18n";

type ExportDialogProps = {
  onExport: (options: ExportOptions) => Promise<ExportResult>;
};

const DEFAULT_DELIMITER = ":";

const COLUMN_KEYS = {
  username: "column.username",
  password: "column.password",
  sharedSecret: "column.sharedSecret",
  displayName: "column.displayName",
} as const;

const LAYOUTS: ExportLayout[] = [
  "username,password,sharedSecret",
  "password,username,sharedSecret",
  "username,password,sharedSecret,displayName",
  "password,username,sharedSecret,displayName",
];

const readEventValue = (event: unknown) => {
  const target = (event as { target?: { value?: string } })?.target;
  return target?.value ?? "";
};

export default function ExportDialog({ onExport }: ExportDialogProps) {
  const { t, tm } = useI18n();
  const columnLabel = (layout: ExportLayout) =>
    layout
      .split(",")
      .map((column) => t(COLUMN_KEYS[column as keyof typeof COLUMN_KEYS]))
      .join(", ");
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
        throw new Error(t("common.selectDelimiter"));
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
        {t("common.export")}
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
            <span>{t("export.title")}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <form id="export-accounts-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{tm(error)}</Alert>}

              <Alert severity="warning" variant="outlined">
                {t("export.warning")}
              </Alert>

              <TextField
                select
                label={t("common.delimiter")}
                value={delimiter}
                onChange={(event) => setDelimiter(readEventValue(event))}
                fullWidth
              >
                <MenuItem value=":">{t("common.delimiterColon")}</MenuItem>
                <MenuItem value=";">{t("common.delimiterSemicolon")}</MenuItem>
                <MenuItem value=",">{t("common.delimiterComma")}</MenuItem>
                <MenuItem value="|">{t("common.delimiterPipe")}</MenuItem>
                <MenuItem value="\t">{t("common.delimiterTab")}</MenuItem>
                <MenuItem value="custom">{t("common.delimiterCustom")}</MenuItem>
              </TextField>

              {delimiter === "custom" && (
                <TextField
                  label={t("common.customDelimiter")}
                  value={customDelimiter}
                  onChange={(event) => setCustomDelimiter(readEventValue(event))}
                  helperText={t("common.customDelimiterHelp")}
                  fullWidth
                />
              )}

              <TextField
                select
                label={t("common.columnOrder")}
                value={layout}
                onChange={(event) => setLayout(readEventValue(event) as ExportLayout)}
                fullWidth
              >
                {LAYOUTS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {columnLabel(option)}
                  </MenuItem>
                ))}
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
            {t("common.cancel")}
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
            {saving ? t("export.exporting") : t("common.export")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
