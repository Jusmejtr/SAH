import { useMemo, useState } from "preact/hooks";
import {
  Alert,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FaFileImport } from "react-icons/fa";
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
        onClick={() => setOpen(true)}
        startIcon={<FaFileImport />}
      >
        Import Accounts
      </Button>
      <Dialog open={open} onClose={close} fullWidth>
        <DialogTitle>Import Accounts</DialogTitle>
        <DialogContent>
          <form id="import-accounts-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <Stack spacing={1}>
                <Button variant="outlined" component="label">
                  Select File
                  <input type="file" hidden onChange={handleFileChange} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {fileName || "No file selected"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  One account per line.
                </Typography>
              </Stack>

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
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">
                      Preview ({previewRows.length} line(s))
                    </Typography>
                    {previewErrors > 0 && (
                      <Alert severity="warning" sx={{ py: 0.5 }}>
                        {previewErrors} line(s) have issues and will fail import.
                      </Alert>
                    )}
                    <List dense sx={{ p: 0 }}>
                      {previewRows.slice(0, 8).map((row, index) => (
                        <div key={`${row.lineNumber}-${row.raw}`}>
                          <ListItem sx={{ px: 0, alignItems: "flex-start" }}>
                            <ListItemText
                              primary={`Line ${row.lineNumber}: ${row.username || "(no username)"}`}
                              secondary={
                                <>
                                  <Typography variant="caption" sx={{ display: "block" }}>
                                    Password: {row.password ? "********" : "(empty)"}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: "block" }}>
                                    Shared Secret: {row.sharedSecret ? "********" : "(empty)"}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: "block" }}>
                                    Display Name: {row.displayName || "(empty)"}
                                  </Typography>
                                  {row.issue && (
                                    <Typography
                                      variant="caption"
                                      color="error.main"
                                      sx={{ display: "block" }}
                                    >
                                      Issue: {row.issue}
                                    </Typography>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                          {index < Math.min(previewRows.length, 8) - 1 && <Divider />}
                        </div>
                      ))}
                    </List>
                    {previewRows.length > 8 && (
                      <Typography variant="caption" color="text.secondary">
                        Showing first 8 lines only.
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              )}
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
            form="import-accounts-form"
            disabled={saving}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}