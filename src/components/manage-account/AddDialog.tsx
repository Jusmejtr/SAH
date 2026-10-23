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
import { useI18n } from "../../i18n";

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
  const { t, tm } = useI18n();
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
        {t("add.button")}
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
            <span>{t("add.title")}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <form id="add-steam-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{tm(error)}</Alert>}

              <Tabs
                value={mode}
                onChange={(_event, value) => {
                  setMode(value as Mode);
                  setError("");
                }}
                variant="fullWidth"
              >
                <Tab value="secret" label={t("common.sharedSecret")} />
                <Tab value="setup" label={t("setup.title")} />
              </Tabs>

              {setup && (
                <Alert
                  severity="info"
                  icon={<FaShieldAlt size={16} />}
                  sx={{ alignItems: "center" }}
                >
                  {t("add.setupInfo")}
                </Alert>
              )}

              <TextField
                label={t("common.username")}
                value={form.username}
                onChange={handleChange("username")}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label={t("common.password")}
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                required
                fullWidth
              />
              {!setup && (
                <TextField
                  label={t("common.sharedSecret")}
                  type="password"
                  value={form.sharedSecret}
                  onChange={handleChange("sharedSecret")}
                  fullWidth
                  helperText={t("add.sharedSecretHelp")}
                />
              )}
              <TextField
                label={t("common.displayName")}
                value={form.displayName}
                onChange={handleChange("displayName")}
                fullWidth
                helperText={t("common.displayNameHelp")}
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
            {t("common.cancel")}
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
            {saving
              ? t("add.adding")
              : setup
                ? t("add.addAndSetup")
                : t("add.button")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
