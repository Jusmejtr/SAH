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
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { FaExclamationTriangle, FaFileImport, FaUpload } from "react-icons/fa";
import type { NewAccount } from "../../api";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";

type ImportDialogProps = {
  onImport: (accounts: NewAccount[]) => Promise<void>;
};

type ColumnLayout =
  | "username,password,sharedSecret"
  | "password,username,sharedSecret"
  | "username,password,sharedSecret,displayName"
  | "password,username,sharedSecret,displayName";

const DEFAULT_DELIMITER = ":";

const COLUMN_KEYS = {
  username: "column.username",
  password: "column.password",
  sharedSecret: "column.sharedSecret",
  displayName: "column.displayName",
} as const;

const LAYOUTS: ColumnLayout[] = [
  "username,password,sharedSecret",
  "password,username,sharedSecret",
  "username,password,sharedSecret,displayName",
  "password,username,sharedSecret,displayName",
];

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

type MaFileRow = {
  fileName: string;
  username: string;
  sharedSecret: string;
  password: string;
  issue: MessageKey | "";
};

const parseMaFile = (fileName: string, content: string): MaFileRow => {
  const row: MaFileRow = {
    fileName,
    username: "",
    sharedSecret: "",
    password: "",
    issue: "",
  };

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(content);
  } catch {
    row.issue = "import.notJson";
    return row;
  }

  row.username = String(
    parsed.account_name ?? parsed.AccountName ?? parsed.Session?.AccountName ?? "",
  ).trim();
  row.sharedSecret = String(
    parsed.shared_secret ?? parsed.SharedSecret ?? "",
  ).trim();

  if (!row.username) row.issue = "import.missingAccountName";
  else if (!row.sharedSecret) row.issue = "import.missingSharedSecretField";

  return row;
};

export default function ImportDialog({ onImport }: ImportDialogProps) {
  const { t, tm } = useI18n();
  const columnLabel = (layout: ColumnLayout) =>
    layout
      .split(",")
      .map((column) => t(COLUMN_KEYS[column as keyof typeof COLUMN_KEYS]))
      .join(", ");
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"text" | "mafile">("text");
  const [maRows, setMaRows] = useState<MaFileRow[]>([]);
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
        issue = t("import.expectedValues", {
          expected: columns.length,
          actual: tokens.length,
        });
      } else if (!username || !password) {
        issue = t("import.missingUserPass");
      } else if (!sharedSecret) {
        issue = t("import.missingSecret");
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
  }, [effectiveDelimiter, fileContent, layout, t]);

  const previewErrors = useMemo(
    () => previewRows.filter((row) => Boolean(row.issue)).length,
    [previewRows],
  );

  const close = () => {
    setOpen(false);
    setFileName("");
    setFileContent("");
    setMaRows([]);
    setSource("text");
    setLayout("username,password,sharedSecret");
    setDelimiter(DEFAULT_DELIMITER);
    setCustomDelimiter("");
    setError("");
  };

  const parseAccounts = () => {
    if (!fileContent.trim()) {
      throw new Error(t("import.selectFile"));
    }

    if (!effectiveDelimiter) {
      throw new Error(t("common.selectDelimiter"));
    }

    const columns = layoutToColumns(layout);
    const lines = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error(t("import.fileEmpty"));
    }

    const accounts: NewAccount[] = [];

    lines.forEach((line, index) => {
      const tokens = line
        .split(effectiveDelimiter)
        .map((token) => stripWrappingQuotes(token));

      if (tokens.length < columns.length) {
        throw new Error(
          t("import.lineTooFew", {
            line: index + 1,
            expected: columns.length,
            actual: tokens.length,
          }),
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
        throw new Error(t("import.lineMissingUserPass", { line: index + 1 }));
      }

      if (!sharedSecret) {
        throw new Error(t("import.lineMissingSecret", { line: index + 1 }));
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

  const handleMaFileChange = async (
    event: Event & { currentTarget: HTMLInputElement },
  ) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) return;

    const rows = await Promise.all(
      files.map(async (file) => parseMaFile(file.name, await file.text())),
    );

    setMaRows((prev) => {
      const merged = [...prev];
      rows.forEach((row) => {
        const index = merged.findIndex(
          (item) => item.fileName === row.fileName,
        );
        if (index >= 0) merged[index] = { ...row, password: merged[index].password };
        else merged.push(row);
      });
      return merged;
    });

    input.value = "";
  };

  const parseMaAccounts = () => {
    if (maRows.length === 0) {
      throw new Error(t("import.selectMaFile"));
    }

    return maRows.map((row) => {
      if (row.issue) {
        throw new Error(`${row.fileName}: ${t(row.issue)}`);
      }
      if (!row.password) {
        throw new Error(t("import.passwordRequired", { file: row.fileName }));
      }

      return {
        username: row.username,
        password: row.password,
        sharedSecret: row.sharedSecret,
        displayName: "",
      } satisfies NewAccount;
    });
  };

  const handleSubmit = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    setSaving(true);
    setError("");

    try {
      const accounts = source === "mafile" ? parseMaAccounts() : parseAccounts();
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
        {t("common.import")}
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
            <span>{t("import.title")}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <form id="import-accounts-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{tm(error)}</Alert>}

              <Tabs
                value={source}
                onChange={(_event, value) =>
                  setSource(value as "text" | "mafile")
                }
                variant="fullWidth"
              >
                <Tab value="text" label={t("import.tabText")} />
                <Tab value="mafile" label={t("import.tabMaFile")} />
              </Tabs>

              {source === "text" ? (
                <>
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
                  {fileName || t("import.chooseFile")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("import.fileHint")}
                </Typography>
              </Box>

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
                  fullWidth
                  helperText={t("common.customDelimiterHelp")}
                />
              )}

              <TextField
                select
                label={t("common.columnOrder")}
                value={layout}
                onChange={(event) => setLayout(readEventValue(event) as ColumnLayout)}
                fullWidth
              >
                {LAYOUTS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {columnLabel(option)}
                  </MenuItem>
                ))}
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
                    <Typography variant="subtitle2">
                      {t("import.preview")}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t("import.lines", { count: previewRows.length })}
                    />
                    {previewErrors > 0 && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        icon={<FaExclamationTriangle size={10} />}
                        label={t("import.issues", { count: previewErrors })}
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
                            {row.username || t("import.noUsername")}
                            {row.displayName ? ` · ${row.displayName}` : ""}
                          </Typography>
                          <Typography
                            variant="caption"
                            noWrap
                            color={row.issue ? "error.main" : "text.secondary"}
                            sx={{ display: "block" }}
                          >
                            {row.issue ||
                              t("import.rowSummary", {
                                password: row.password ? "••••••" : "—",
                                secret: row.sharedSecret ? "••••••" : "—",
                              })}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>

                  {previewRows.length > 8 && (
                    <Typography variant="caption" color="text.secondary">
                      {t("import.showingFirst", {
                        shown: 8,
                        count: previewRows.length,
                      })}
                    </Typography>
                  )}
                </Stack>
              )}
                </>
              ) : (
                <>
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
                        maRows.length > 0
                          ? alpha(theme.palette.primary.main, 0.6)
                          : theme.palette.divider
                      }`,
                      backgroundColor:
                        maRows.length > 0
                          ? alpha(theme.palette.primary.main, 0.06)
                          : "transparent",
                      "&:hover": {
                        borderColor: alpha(theme.palette.primary.main, 0.6),
                        backgroundColor: alpha(theme.palette.primary.main, 0.06),
                      },
                    })}
                  >
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".maFile,.mafile,application/json"
                      onChange={handleMaFileChange}
                    />
                    <Box sx={{ color: "primary.main", display: "flex" }}>
                      <FaUpload size={20} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {maRows.length > 0
                        ? t("import.maFilesSelected", { count: maRows.length })
                        : t("import.chooseMaFiles")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("import.maFileHint")}
                    </Typography>
                  </Box>

                  {maRows.length > 0 && (
                    <Stack spacing={1.5}>
                      {maRows.map((row, index) => (
                        <Stack
                          key={row.fileName}
                          spacing={1}
                          sx={(theme) => ({
                            p: 1.5,
                            borderRadius: 3,
                            border: `1px solid ${theme.palette.divider}`,
                          })}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center" }}
                          >
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ fontWeight: 600, flexGrow: 1, minWidth: 0 }}
                            >
                              {row.username || row.fileName}
                            </Typography>
                            {row.issue ? (
                              <Chip
                                size="small"
                                color="error"
                                variant="outlined"
                                icon={<FaExclamationTriangle size={10} />}
                                label={t(row.issue)}
                              />
                            ) : (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={t("import.secretOk")}
                              />
                            )}
                          </Stack>
                          <TextField
                            label={t("common.password")}
                            type="password"
                            size="small"
                            fullWidth
                            value={row.password}
                            disabled={Boolean(row.issue)}
                            onChange={(event) => {
                              const value = readEventValue(event);
                              setMaRows((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, password: value }
                                    : item,
                                ),
                              );
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </>
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
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            type="submit"
            form="import-accounts-form"
            disabled={
              saving ||
              (source === "mafile"
                ? maRows.length === 0
                : previewRows.length === 0)
            }
            startIcon={
              saving ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <FaFileImport size={12} />
              )
            }
          >
            {saving
              ? t("import.importing")
              : source === "mafile"
                ? maRows.length > 0
                  ? t("import.importCount", { count: maRows.length })
                  : t("common.import")
                : previewRows.length > 0
                  ? t("import.importCount", { count: previewRows.length })
                  : t("common.import")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}