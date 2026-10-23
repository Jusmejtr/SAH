import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  FaCheck,
  FaCheckCircle,
  FaCopy,
  FaDownload,
  FaShieldAlt,
} from "react-icons/fa";
import {
  cancelGuardSetup,
  copyText,
  exportMaFile,
  finalizeGuardSetup,
  startGuardSetup,
  submitGuardEmailCode,
} from "../api";
import type { Account, GuardSetupStep } from "../api";
import { useI18n } from "../i18n";
import type { TranslationKey } from "../i18n";

type SetupGuardDialogProps = {
  account: Account | null;
  onClose: () => void;
  onCompleted: (account: Account) => void;
};

type Phase =
  | { name: "intro" }
  | { name: "working"; label: TranslationKey }
  | { name: "email-code"; domain: string; error: string }
  | {
      name: "activation";
      revocationCode: string;
      phoneHint: string;
      error: string;
    }
  | { name: "done" }
  | { name: "error"; message: string };

const CODE_FONT =
  '"Cascadia Mono", "Consolas", "SFMono-Regular", ui-monospace, monospace';

const toPhase = (result: GuardSetupStep): Phase => {
  switch (result.step) {
    case "email-code":
      return { name: "email-code", domain: result.domain, error: result.error };
    case "activation":
      return {
        name: "activation",
        revocationCode: result.revocationCode,
        phoneHint: result.phoneHint,
        error: result.error ?? "",
      };
    case "done":
      return { name: "done" };
    default:
      return { name: "error", message: result.message };
  }
};

export default function SetupGuardDialog({
  account,
  onClose,
  onCompleted,
}: SetupGuardDialogProps) {
  const { t, tm } = useI18n();
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [emailCode, setEmailCode] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [savedRevocation, setSavedRevocation] = useState(false);
  const [revocationCopied, setRevocationCopied] = useState(false);
  const [maFileNote, setMaFileNote] = useState("");

  // Ignore answers from Steam that arrive after the dialog was closed.
  const run = useRef(0);
  const lastAccount = useRef<Account | null>(account);
  if (account) lastAccount.current = account;
  const shown = lastAccount.current;
  const accountId = account?.id ?? "";

  useEffect(() => {
    if (!accountId) return;
    run.current += 1;
    setPhase({ name: "intro" });
    setEmailCode("");
    setActivationCode("");
    setSavedRevocation(false);
    setRevocationCopied(false);
    setMaFileNote("");
  }, [accountId]);

  const call = async (label: TranslationKey, request: () => Promise<GuardSetupStep>) => {
    const id = run.current;
    setPhase({ name: "working", label });
    try {
      const result = await request();
      if (id !== run.current) return;
      if (result.step === "done") onCompleted(result.account);
      setPhase(toPhase(result));
    } catch (err) {
      if (id !== run.current) return;
      setPhase({ name: "error", message: tm(err) });
    }
  };

  const start = () => {
    setEmailCode("");
    setActivationCode("");
    setSavedRevocation(false);
    void call("setup.signingIn", () => startGuardSetup(accountId));
  };

  const submitEmail = (event?: Event) => {
    event?.preventDefault();
    if (!emailCode.trim()) return;
    const code = emailCode;
    setEmailCode("");
    void call("setup.checkingCode", () => submitGuardEmailCode(code));
  };

  const activate = (event?: Event) => {
    event?.preventDefault();
    if (!activationCode.trim() || !savedRevocation) return;
    const code = activationCode;
    void call("setup.activating", () => finalizeGuardSetup(code));
  };

  const busy = phase.name === "working";
  const inSession =
    busy || phase.name === "email-code" || phase.name === "activation";

  const close = () => {
    run.current += 1;
    if (inSession) void cancelGuardSetup();
    onClose();
  };

  const copyRevocation = async (code: string) => {
    try {
      await copyText(code);
      setRevocationCopied(true);
      window.setTimeout(() => setRevocationCopied(false), 1600);
    } catch {
      // copying is a convenience only
    }
  };

  const saveMaFile = async () => {
    if (!shown) return;
    try {
      const result = await exportMaFile(shown.id);
      if (!result.cancelled) {
        setMaFileNote(t("setup.savedTo", { path: result.filePath }));
      }
    } catch (err) {
      setMaFileNote(tm(err));
    }
  };

  const title = shown?.displayName || shown?.username || "";

  return (
    <Dialog
      open={Boolean(account)}
      onClose={(_event, reason) => {
        // Don't lose a half-finished setup to a stray click.
        if (reason === "backdropClick" && inSession) return;
        close();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={(theme) => ({
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            })}
          >
            <FaShieldAlt size={17} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="div"
              sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.25 }}
            >
              {t("setup.title")}
            </Typography>
            <Typography
              component="div"
              variant="caption"
              color="text.secondary"
              noWrap
            >
              {title}
              {shown && title !== shown.username ? ` · @${shown.username}` : ""}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {phase.name === "intro" && (
          <Stack spacing={1.5}>
            <Typography variant="body2">{t("setup.intro")}</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, typography: "body2" }}>
              <li>{t("setup.introEmail")}</li>
              <li>{t("setup.introRevocation")}</li>
              <li>{t("setup.introMobileApp")}</li>
            </Box>
          </Stack>
        )}

        {phase.name === "working" && (
          <Stack spacing={2} sx={{ alignItems: "center", py: 4 }}>
            <CircularProgress size={34} thickness={4} />
            <Typography variant="body2" color="text.secondary">
              {t(phase.label)}
            </Typography>
          </Stack>
        )}

        {phase.name === "email-code" && (
          <Box component="form" id="guard-email-form" onSubmit={submitEmail}>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="body2">
                {phase.domain
                  ? t("setup.emailSentDomain", { domain: phase.domain })
                  : t("setup.emailSent")}
              </Typography>
              {phase.error && (
                <Alert severity="warning">{tm(phase.error)}</Alert>
              )}
              <TextField
                label={t("setup.emailCodeLabel")}
                value={emailCode}
                onChange={(event: any) =>
                  setEmailCode(String(event.target.value).toUpperCase())
                }
                autoFocus
                fullWidth
                slotProps={{
                  htmlInput: {
                    maxLength: 5,
                    autoComplete: "one-time-code",
                    style: { fontFamily: CODE_FONT, letterSpacing: "0.2em" },
                  },
                }}
              />
            </Stack>
          </Box>
        )}

        {phase.name === "activation" && (
          <Box component="form" id="guard-activate-form" onSubmit={activate}>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("setup.step1")}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={(theme) => ({
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    py: 1.25,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: alpha(theme.palette.warning.main, 0.45),
                    backgroundColor: alpha(theme.palette.warning.main, 0.08),
                  })}
                >
                  <Typography
                    component="div"
                    sx={{
                      fontFamily: CODE_FONT,
                      fontSize: 26,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                    }}
                  >
                    {phase.revocationCode}
                  </Typography>
                  <Tooltip
                    title={revocationCopied ? t("common.copied") : t("common.copy")}
                  >
                    <IconButton
                      size="small"
                      aria-label={t("setup.copyRevocation")}
                      onClick={() => void copyRevocation(phase.revocationCode)}
                    >
                      {revocationCopied ? (
                        <FaCheck size={14} />
                      ) : (
                        <FaCopy size={14} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.75 }}
                >
                  {t("setup.revocationHelp")}
                </Typography>
                <FormControlLabel
                  sx={{ mt: 0.5 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={savedRevocation}
                      onChange={(_event, checked) => setSavedRevocation(checked)}
                    />
                  }
                  label={t("setup.revocationConfirm")}
                  slotProps={{ typography: { variant: "body2" } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("setup.step2")}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  {phase.phoneHint
                    ? t("setup.sentBySms", { phone: phase.phoneHint })
                    : t("setup.sentByEmail")}
                </Typography>
                {phase.error && (
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {tm(phase.error)}
                  </Alert>
                )}
                <TextField
                  label={t("setup.activationLabel")}
                  value={activationCode}
                  onChange={(event: any) =>
                    setActivationCode(String(event.target.value).toUpperCase())
                  }
                  fullWidth
                  slotProps={{
                    htmlInput: {
                      autoComplete: "one-time-code",
                      style: { fontFamily: CODE_FONT, letterSpacing: "0.2em" },
                    },
                  }}
                />
              </Box>
            </Stack>
          </Box>
        )}

        {phase.name === "done" && (
          <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", py: 2 }}>
            <Box sx={{ color: "success.main" }}>
              <FaCheckCircle size={40} />
            </Box>
            <Typography variant="h6">{t("setup.doneTitle")}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("setup.doneBody")}
            </Typography>
            {maFileNote && (
              <Typography variant="caption" color="text.secondary">
                {maFileNote}
              </Typography>
            )}
          </Stack>
        )}

        {phase.name === "error" && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{ whiteSpace: "pre-line" }}
          >
            {tm(phase.message)}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        {phase.name === "done" ? (
          <>
            <Button
              startIcon={<FaDownload size={12} />}
              onClick={() => void saveMaFile()}
            >
              {t("setup.saveMaFileBackup")}
            </Button>
            <Button variant="contained" onClick={close}>
              {t("common.done")}
            </Button>
          </>
        ) : (
          <>
            <Button
              color="inherit"
              onClick={close}
              sx={{ color: "text.secondary" }}
            >
              {phase.name === "error" ? t("common.close") : t("common.cancel")}
            </Button>
            {phase.name === "intro" && (
              <Button variant="contained" onClick={start} autoFocus>
                {t("setup.start")}
              </Button>
            )}
            {phase.name === "error" && (
              <Button variant="contained" onClick={start}>
                {t("setup.tryAgain")}
              </Button>
            )}
            {phase.name === "email-code" && (
              <Button
                variant="contained"
                type="submit"
                form="guard-email-form"
                disabled={!emailCode.trim()}
              >
                {t("setup.continue")}
              </Button>
            )}
            {phase.name === "activation" && (
              <Button
                variant="contained"
                type="submit"
                form="guard-activate-form"
                disabled={!activationCode.trim() || !savedRevocation}
              >
                {t("setup.activate")}
              </Button>
            )}
            {busy && (
              <Button variant="contained" disabled>
                {t("common.working")}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
