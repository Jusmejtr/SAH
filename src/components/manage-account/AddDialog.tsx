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
  Stack,
  Tab,
  Tabs,
  TextField,
  alpha,
} from "@mui/material";
import { FaPlus, FaShieldAlt, FaUserPlus } from "react-icons/fa";
import type { AddOptions, NewAccount } from "../../api";

type FormState = NewAccount;
type Mode = "secret" | "setup";

type AddDialogProps = {
  onAdd: (account: NewAccount, options: AddOptions) => Promise<void>;
};

const initialForm: FormState = {
  username: "",
  password: "",
  sharedSecret: "",
  displayName: "",
};

export default function AddDialog({ onAdd }: AddDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("secret");
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const setup = mode === "setup";

  const close = () => {
    setOpen(false);
    setMode("secret");
    setForm(initialForm);
    setError("");
  };

  const handleChange = (field: keyof FormState) => {
    return (event: { target: { value: string } } | any) => {
      const value = event?.target?.value ?? "";
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  };

  const handleSubmit = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onAdd(
        setup ? { ...form, sharedSecret: "" } : form,
        { setupGuard: setup },
      );
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
        variant="contained"
        onClick={() => setOpen(true)}
        startIcon={<FaPlus size={12} />}
      >
        Add account
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
              <FaUserPlus size={17} />
            </Box>
            <span>Add Steam account</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <form id="add-steam-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <Tabs
                value={mode}
                onChange={(_event, value) => {
                  setMode(value as Mode);
                  setError("");
                }}
                variant="fullWidth"
              >
                <Tab value="secret" label="Shared secret" />
                <Tab value="setup" label="Set up Steam Guard" />
              </Tabs>

              {setup && (
                <Alert
                  severity="info"
                  icon={<FaShieldAlt size={16} />}
                  sx={{ alignItems: "center" }}
                >
                  Only the username and password are needed. After adding,
                  the app signs in and sets up a Steam Guard Mobile
                  Authenticator for the account.
                </Alert>
              )}

              <TextField
                label="Username"
                value={form.username}
                onChange={handleChange("username")}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                required
                fullWidth
              />
              {!setup && (
                <TextField
                  label="Shared secret"
                  type="password"
                  value={form.sharedSecret}
                  onChange={handleChange("sharedSecret")}
                  fullWidth
                  helperText="Used to generate Steam Guard codes. Leave empty if the account has no mobile authenticator."
                />
              )}
              <TextField
                label="Display name"
                value={form.displayName}
                onChange={handleChange("displayName")}
                fullWidth
                helperText="Optional label shown on the account card."
              />
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
            form="add-steam-form"
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={14} color="inherit" />
              ) : setup ? (
                <FaShieldAlt size={12} />
              ) : (
                <FaPlus size={12} />
              )
            }
          >
            {saving ? "Adding…" : setup ? "Add & set up" : "Add account"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
