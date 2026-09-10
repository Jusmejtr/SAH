import { useEffect, useMemo, useState } from "preact/hooks";
import { render } from "preact";
import {
  Alert,
  Box,
  Collapse,
  Container,
  CssBaseline,
  Fade,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { FaSearch, FaTimes, FaUserPlus } from "react-icons/fa";
import Nav from "./components/Nav";
import AccountCard from "./components/AccountCard";
import Footer from "./components/Footer";
import UpdateBanner from "./components/UpdateBanner";
import { COLOR_MODE_KEY, createAppTheme } from "./theme";
import type { ColorMode } from "./theme";
import {
  addAccount,
  cancelLogin,
  exportAccounts,
  getUpdateStatus,
  listAccounts,
  loginAccount,
  onLoginProgress,
  onUpdateStatus,
  openLog,
  removeAccount,
} from "./api";
import type {
  Account,
  ExportOptions,
  NewAccount,
  UpdateStatus,
} from "./api";

const LOGIN_MESSAGES = {
  "signed-in": "Credentials and Steam Guard code submitted.",
  "auto-login": "Steam resumed the saved session for this account.",
  launched:
    "Credentials submitted. No shared secret stored, enter the code manually.",
  "code-copied": "Steam started. Guard code copied to the clipboard.",
  cancelled: "Login cancelled.",
} as const;

const readInitialMode = (): ColorMode => {
  const stored = localStorage.getItem(COLOR_MODE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [step, setStep] = useState("");
  const [loggingInId, setLoggingInId] = useState("");
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ColorMode>(readInitialMode);
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState("");

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  useEffect(() => {
    localStorage.setItem(COLOR_MODE_KEY, mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  useEffect(() => onLoginProgress(setStep), []);

  useEffect(() => {
    getUpdateStatus().then(setUpdate).catch(() => {});
    return onUpdateStatus(setUpdate);
  }, []);

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => accounts.some((account) => account.id === id)),
    );
  }, [accounts]);

  const handleAdd = async (account: NewAccount) => {
    const created = await addAccount(account);
    setAccounts((prev) => [...prev, created]);
  };

  const handleImport = async (items: NewAccount[]) => {
    if (items.length === 0) {
      throw new Error("No accounts to import.");
    }

    setError("");
    setStatus("");

    const created: Account[] = [];
    const failures: string[] = [];

    for (const account of items) {
      try {
        const next = await addAccount(account);
        created.push(next);
      } catch (err) {
        failures.push((err as Error).message);
      }
    }

    if (created.length > 0) {
      setAccounts((prev) => [...prev, ...created]);
      setStatus(`Imported ${created.length} account(s).`);
    }

    if (failures.length > 0) {
      const firstFailure = failures[0];

      if (created.length > 0) {
        setError(
          `Skipped ${failures.length} account(s) during import. First error: ${firstFailure}`,
        );
        return;
      }

      throw new Error(firstFailure);
    }
  };

  const handleExport = async (options: ExportOptions) => {
    const result = await exportAccounts(options);
    return result;
  };

  const handleToggleManage = () => {
    setManageMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleLogin = async (id: string) => {
    if (loggingInId) return;

    setError("");
    setStatus("");
    setLoggingInId(id);

    try {
      const result = await loginAccount(id);
      setStatus(LOGIN_MESSAGES[result.status]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoggingInId("");
      setStep("");
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === accounts.length && accounts.length > 0) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(accounts.map((account) => account.id));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setError("");

    try {
      let currentAccounts = accounts;
      for (const id of selectedIds) {
        currentAccounts = await removeAccount(id);
      }

      setAccounts(currentAccounts);
      setSelectedIds([]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const allSelected =
    accounts.length > 0 && selectedIds.length === accounts.length;

  const visibleAccounts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((account) =>
      `${account.displayName} ${account.username}`
        .toLowerCase()
        .includes(needle),
    );
  }, [accounts, query]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", pb: 9 }}>
        <Nav
          onAdd={handleAdd}
          onImport={handleImport}
          onExport={handleExport}
          manageMode={manageMode}
          onToggleManage={handleToggleManage}
          selectedCount={selectedIds.length}
          onSelectAll={handleSelectAll}
          onDeleteSelected={handleDeleteSelected}
          allSelected={allSelected}
          accountCount={accounts.length}
          query={query}
          onQueryChange={setQuery}
          mode={mode}
          onToggleMode={() =>
            setMode((prev) => (prev === "dark" ? "light" : "dark"))
          }
        />

        <UpdateBanner
          status={update}
          dismissed={Boolean(update?.version) && updateDismissed === update?.version}
          onDismiss={() => setUpdateDismissed(update?.version ?? "")}
        />

        <Container maxWidth="lg" sx={{ pt: 3 }}>
          <Collapse in={Boolean(error)}>
            <Alert
              severity="error"
              variant="outlined"
              sx={{ mb: 3 }}
              action={
                <IconButton
                  size="small"
                  color="inherit"
                  aria-label="dismiss error"
                  onClick={() => setError("")}
                >
                  <FaTimes size={12} />
                </IconButton>
              }
            >
              {error}
            </Alert>
          </Collapse>

          {accounts.length === 0 ? (
            <EmptyState
              icon={<FaUserPlus size={26} />}
              title="No accounts yet"
              subtitle="Add an account or import a list to get started."
            />
          ) : visibleAccounts.length === 0 ? (
            <EmptyState
              icon={<FaSearch size={22} />}
              title="No matches"
              subtitle={`Nothing found for “${query}”.`}
            />
          ) : (
            <Fade in>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(clamp(150px, 20vw, 190px), 1fr))",
                }}
              >
                {visibleAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    manageMode={manageMode}
                    selected={selectedIds.includes(account.id)}
                    busy={loggingInId === account.id}
                    onToggleSelect={handleToggleSelect}
                    onLogin={handleLogin}
                  />
                ))}
              </Box>
            </Fade>
          )}
        </Container>

        <Snackbar
          open={Boolean(status)}
          autoHideDuration={5000}
          onClose={() => setStatus("")}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          sx={{ bottom: { xs: 72, sm: 72 } }}
        >
          <Alert
            severity="success"
            variant="filled"
            onClose={() => setStatus("")}
          >
            {status}
          </Alert>
        </Snackbar>

        <Footer
          step={step}
          busy={Boolean(loggingInId)}
          onCancel={() => {
            void cancelLogin();
          }}
          onOpenLog={() => {
            void openLog();
          }}
        />
      </Box>
    </ThemeProvider>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: preact.ComponentChildren;
  title: string;
  subtitle: string;
}) {
  return (
    <Stack
      spacing={1.5}
      sx={(theme) => ({
        alignItems: "center",
        textAlign: "center",
        py: 9,
        px: 3,
        borderRadius: 4,
        border: `1px dashed ${theme.palette.divider}`,
        color: "text.secondary",
      })}
    >
      <Box
        sx={(theme) => ({
          width: 64,
          height: 64,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: theme.palette.text.secondary,
          backgroundColor:
            theme.palette.mode === "dark"
              ? "rgba(148, 163, 184, 0.10)"
              : "rgba(15, 23, 42, 0.06)",
        })}
      >
        {icon}
      </Box>
      <Typography variant="h6" color="text.primary">
        {title}
      </Typography>
      <Typography variant="body2">{subtitle}</Typography>
    </Stack>
  );
}

render(<App />, document.getElementById("app")!);
