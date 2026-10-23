import { useEffect, useState } from "preact/hooks";
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
  TextField,
  alpha,
} from "@mui/material";
import { FaSave, FaUserEdit } from "react-icons/fa";
import { getAccountSecrets } from "../../api";
import type { Account, AccountUpdate } from "../../api";
import { useI18n } from "../../i18n";

type EditDialogProps = {
  account: Account | null;
  onClose: () => void;
  onSave: (id: string, account: AccountUpdate) => Promise<void>;
};

const emptyForm: AccountUpdate = {
  username: "",
  password: "",
  sharedSecret: "",
  displayName: "",
};

export default function EditDialog({
  account,
  onClose,
  onSave,
}: EditDialogProps) {
  const { t, tm } = useI18n();
  const [form, setForm] = useState<AccountUpdate>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) return;

    let active = true;
    setError("");
    setLoading(true);
    setForm({
      username: account.username,
      password: "",
      sharedSecret: "",
      displayName: account.displayName,
    });

    getAccountSecrets(account.id)
      .then((secrets) => {
        if (!active) return;
        setForm({
          username: secrets.username,
          password: secrets.password,
          sharedSecret: secrets.sharedSecret,
          displayName: secrets.displayName,
        });
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [account]);

  const handleChange = (field: keyof AccountUpdate) => {
    return (event: { target: { value: string } } | any) => {
      const value = event?.target?.value ?? "";
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  };

  const handleSubmit = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    if (!account) return;

    setSaving(true);
    setError("");
    try {
      await onSave(account.id, form);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(account)} onClose={onClose} fullWidth maxWidth="sm">
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
            <FaUserEdit size={17} />
          </Box>
          <span>{t("edit.title")}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <form id="edit-steam-form" onSubmit={handleSubmit}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{tm(error)}</Alert>}
            <TextField
              label={t("common.username")}
              value={form.username}
              onChange={handleChange("username")}
              required
              fullWidth
              autoFocus
              disabled={loading}
            />
            <TextField
              label={t("common.password")}
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              fullWidth
              disabled={loading}
              helperText={t("edit.passwordHelp")}
            />
            <TextField
              label={t("common.sharedSecret")}
              type="password"
              value={form.sharedSecret}
              onChange={handleChange("sharedSecret")}
              fullWidth
              disabled={loading}
              helperText={t("edit.sharedSecretHelp")}
            />
            <TextField
              label={t("common.displayName")}
              value={form.displayName}
              onChange={handleChange("displayName")}
              fullWidth
              disabled={loading}
              helperText={t("common.displayNameHelp")}
            />
          </Stack>
        </form>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={saving}
          color="inherit"
          sx={{ color: "text.secondary" }}
        >
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          type="submit"
          form="edit-steam-form"
          disabled={saving || loading}
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <FaSave size={12} />
            )
          }
        >
          {saving ? t("common.saving") : t("common.saveChanges")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
