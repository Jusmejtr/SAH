import { useMemo, useState } from "preact/hooks";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { FaExclamationTriangle, FaFileImport, FaUpload } from "react-icons/fa";
import type { NewAccount } from "../../api";

type ImportDialogProps = {
  onImport: (accounts: NewAccount[]) => Promise<void>;
};

type ColumnLayout =
  | "username,password,sharedSecret"
  | "password,username,sharedSecret"
  | "username,password,sharedSecret,displayName"
  | "password,username,sharedSecret,displayName";

const DEFAULT_DELIMITER = ":";

const stripWrappingQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const layoutToColumns = (layout: ColumnLayout) => layout.split(",");

const readEventValue = (event: unknown) => {
  const target = (event as { target?: { value?: string } })?.target;
  return target?.value ?? "";
};

type PreviewRow = {
  lineNumber: number;
  username: string;
  password: string;
  sharedSecret: string;
  displayName: string;
  raw: string;
  issue: string;
};

export default function ImportDialog({ onImport }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [layout, setLayout] = useState<ColumnLayout>(
    "username,password,sharedSecret",
  );
  const [delimiter, setDelimiter] = useState(DEFAULT_DELIMITER);
  const [customDelimiter, setCustomDelimiter] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveDelimiter = useMemo(() => {
    return delimiter === "custom" ? customDelimiter : delimiter;
  }, [customDelimiter, delimiter]);

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!fileContent.trim() || !effectiveDelimiter) {
      return [];
    }

    const columns = layoutToColumns(layout);
    const lines = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.map((line, index) => {
      const tokens = line
        .split(effectiveDelimiter)
        .map((token) => stripWrappingQuotes(token));
      const record: Record<string, string> = {};

      columns.forEach((column, columnIndex) => {
        record[column] = tokens[columnIndex] ?? "";
      });

      const username = (record.username ?? "").trim();
      const password = record.password ?? "";
      const sharedSecret = (record.sharedSecret ?? "").trim();
      const displayName = (record.displayName ?? "").trim();

      let issue = "";
      if (tokens.length < columns.length) {
        issue = `Expected ${columns.length} values, got ${tokens.length}.`;
      } else if (!username || !password) {
        issue = "Missing username or password.";
      } else if (!sharedSecret) {
        issue = "Missing shared secret.";
      }

      return {
        lineNumber: index + 1,
        username,
        password,
        sharedSecret,
        displayName,
        raw: line,
        issue,
      };
    });
  }, [effectiveDelimiter, fileContent, layout]);

  const previewErrors = useMemo(
    () => previewRows.filter((row) => Boolean(row.issue)).length,
    [previewRows],
  );

  const close = () => {
    setOpen(false);
    setFileName("");
    setFileContent("");
    setLayout("username,password,sharedSecret");
    setDelimiter(DEFAULT_DELIMITER);
    setCustomDelimiter("");
    setError("");
  };

  const parseAccounts = () => {
    if (!fileContent.trim()) {
      throw new Error("Select a file with account entries first.");
    }

    if (!effectiveDelimiter) {
      throw new Error("Select a delimiter.");
    }

    const columns = layoutToColumns(layout);
    const lines = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error("The selected file is empty.");
    }

    const accounts: NewAccount[] = [];

    lines.forEach((line, index) => {
      const tokens = line
        .split(effectiveDelimiter)
        .map((token) => stripWrappingQuotes(token));

      if (tokens.length < columns.length) {
        throw new Error(
          `Line ${index + 1} has ${tokens.length} value(s), expected at least ${columns.length}.`,
        );
      }

      const record: Record<string, string> = {};
      columns.forEach((column, columnIndex) => {
        record[column] = tokens[columnIndex] ?? "";
      });

      const username = (record.username ?? "").trim();
      const password = record.password ?? "";
      const sharedSecret = (record.sharedSecret ?? "").trim();

      if (!username || !password) {
        throw new Error(`Line ${index + 1} is missing username or password.`);
      }

      if (!sharedSecret) {
        throw new Error(`Line ${index + 1} is missing shared secret.`);
      }

      accounts.push({
        username,
        password,
        sharedSecret,
        displayName: (record.displayName ?? "").trim(),
      });
    });

    return accounts;
  };

  const handleFileChange = async (
    event: Event & { currentTarget: HTMLInputElement },
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      setFileName("");
      setFileContent("");
      return;
    }

    setFileName(file.name);
    setFileContent(await file.text());
  };

  const handleSubmit = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    setSaving(true);
    setError("");

    try {
      const accounts = parseAccounts();
      await onImport(accounts);
      close();
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
        startIcon={<FaFileImport size={12} />}
      >
        Import
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
              <FaFileImport size={16} />
            </Box>
            <span>Import accounts</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <form id="import-accounts-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <Box
                component="label"
                sx={(theme) => ({
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.75,
                  py: 3,
                  px: 2,
                  textAlign: "center",
                  cursor: "pointer",
                  borderRadius: 3,
                  border: `1px dashed ${
                    fileName
                      ? alpha(theme.palette.primary.main, 0.6)
                      : theme.palette.divider
                  }`,
                  backgroundColor: fileName
                    ? alpha(theme.palette.primary.main, 0.06)
                    : "transparent",
                  transition: "border-color .2s ease, background-color .2s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.6),
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  },
                })}
              >
                <input type="file" hidden onChange={handleFileChange} />
                <Box sx={{ color: "primary.main", display: "flex" }}>
                  <FaUpload size={20} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {fileName || "Choose a file"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  One account per line, separated by the delimiter below.
                </Typography>
              </Box>

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
                  fullWidth
                  helperText="Use a single character, e.g. #"
                />
              )}

              <TextField
                select
                label="Column Order"
                value={layout}
                onChange={(event) => setLayout(readEventValue(event) as ColumnLayout)}
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

              {previewRows.length > 0 && (
                <Stack
                  spacing={1.25}
                  sx={(theme) => ({
                    p: 1.75,
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: alpha(
                      theme.palette.text.primary,
                      theme.palette.mode === "dark" ? 0.03 : 0.02,
                    ),
                  })}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Typography variant="subtitle2">Preview</Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${previewRows.length} line(s)`}
                    />
                    {previewErrors > 0 && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        icon={<FaExclamationTriangle size={10} />}
                        label={`${previewErrors} issue(s)`}
                      />
                    )}
                  </Stack>

                  <Stack spacing={0.75}>
                    {previewRows.slice(0, 8).map((row) => (
                      <Stack
                        key={`${row.lineNumber}-${row.raw}`}
                        direction="row"
                        spacing={1.25}
                        sx={(theme) => ({
                          alignItems: "center",
                          px: 1.25,
                          py: 0.75,
                          borderRadius: 2,
                          backgroundColor: row.issue
                            ? alpha(theme.palette.error.main, 0.09)
                            : alpha(theme.palette.success.main, 0.08),
                        })}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ width: 22, flexShrink: 0 }}
                        >
                          {row.lineNumber}
                        </Typography>
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: 600 }}
                          >
                            {row.username || "(no username)"}
                            {row.displayName ? ` · ${row.displayName}` : ""}
                          </Typography>
                          <Typography
                            variant="caption"
                            noWrap
                            color={row.issue ? "error.main" : "text.secondary"}
                            sx={{ display: "block" }}
                          >
                            {row.issue ||
                              `pass ${row.password ? "••••••" : "—"} · secret ${
                                row.sharedSecret ? "••••••" : "—"
                              }`}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>

                  {previewRows.length > 8 && (
                    <Typography variant="caption" color="text.secondary">
                      Showing first 8 of {previewRows.length} lines.
                    </Typography>
                  )}
                </Stack>
              )}
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
            form="import-accounts-form"
            disabled={saving || previewRows.length === 0}
            startIcon={
              saving ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <FaFileImport size={12} />
              )
            }
          >
            {saving
              ? "Importing…"
              : previewRows.length > 0
                ? `Import ${previewRows.length}`
                : "Import"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}