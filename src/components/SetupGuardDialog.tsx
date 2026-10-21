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

type SetupGuardDialogProps = {
  account: Account | null;
  onClose: () => void;
  onCompleted: (account: Account) => void;
};

type Phase =
  | { name: "intro" }
  | { name: "working"; label: string }
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

const cleanError = (err: unknown) =>
  String((err as Error)?.message ?? err).replace(
    /^Error invoking remote method '[^']+': (Error: )?/,
    "",
  );

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

  const call = async (label: string, request: () => Promise<GuardSetupStep>) => {
    const id = run.current;
    setPhase({ name: "working", label });
    try {
      const result = await request();
      if (id !== run.current) return;
      if (result.step === "done") onCompleted(result.account);
      setPhase(toPhase(result));
    } catch (err) {
      if (id !== run.current) return;
      setPhase({ name: "error", message: cleanError(err) });
    }
  };

  const start = () => {
    setEmailCode("");
    setActivationCode("");
    setSavedRevocation(false);
    void call("Signing in to Steam…", () => startGuardSetup(accountId));
  };

  const submitEmail = (event?: Event) => {
    event?.preventDefault();
    if (!emailCode.trim()) return;
    const code = emailCode;
    setEmailCode("");
    void call("Checking the code…", () => submitGuardEmailCode(code));
  };

  const activate = (event?: Event) => {
    event?.preventDefault();
    if (!activationCode.trim() || !savedRevocation) return;
    const code = activationCode;
    void call("Activating the authenticator…", () => finalizeGuardSetup(code));
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
      if (!result.cancelled) setMaFileNote(`Saved to ${result.filePath}`);
    } catch (err) {
      setMaFileNote(cleanError(err));
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
              Set up Steam Guard
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
            <Typography variant="body2">
              This signs in to the account with its saved password and adds a
              Steam Guard Mobile Authenticator, the same way the Steam mobile
              app does. Afterwards the codes are generated here.
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, typography: "body2" }}>
              <li>
                Have the account's email open. Steam may send a sign-in code,
                and sends the activation code there (or by SMS if a phone is
                linked).
              </li>
              <li>
                You will get a revocation code. Write it down, it is the only
                way to remove the authenticator if you lose this app's data.
              </li>
              <li>
                The Steam mobile app can't be the authenticator for this account
                at the same time.
              </li>
            </Box>
          </Stack>
        )}

        {phase.name === "working" && (
          <Stack spacing={2} sx={{ alignItems: "center", py: 4 }}>
            <CircularProgress size={34} thickness={4} />
            <Typography variant="body2" color="text.secondary">
              {phase.label}
            </Typography>
          </Stack>
        )}

        {phase.name === "email-code" && (
          <Box component="form" id="guard-email-form" onSubmit={submitEmail}>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="body2">
                Steam sent a sign-in code to the account's email
                {phase.domain ? ` (…@${phase.domain})` : ""}. Enter it to
                continue.
              </Typography>
              {phase.error && <Alert severity="warning">{phase.error}</Alert>}
              <TextField
                label="Code from email"
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
                  1. Save your revocation code
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
                  <Tooltip title={revocationCopied ? "Copied" : "Copy"}>
                    <IconButton
                      size="small"
                      aria-label="Copy revocation code"
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
                  You need it to remove the authenticator if you ever lose
                  access to this app or this computer.
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
                  label="I wrote down the revocation code"
                  slotProps={{ typography: { variant: "body2" } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  2. Enter the activation code
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  {phase.phoneHint
                    ? `Steam sent it by SMS to the phone ending in ${phase.phoneHint}.`
                    : "Steam sent it to the account's email."}
                </Typography>
                {phase.error && (
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {phase.error}
                  </Alert>
                )}
                <TextField
                  label="Activation code"
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
            <Typography variant="h6">Steam Guard is on</Typography>
            <Typography variant="body2" color="text.secondary">
              Codes for this account are now generated by Steam Account Helper.
              Save a maFile backup somewhere safe. It holds the secrets and the
              revocation code, and other tools can import it.
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
            {phase.message}
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
              Save maFile backup
            </Button>
            <Button variant="contained" onClick={close}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button
              color="inherit"
              onClick={close}
              sx={{ color: "text.secondary" }}
            >
              {phase.name === "error" ? "Close" : "Cancel"}
            </Button>
            {phase.name === "intro" && (
              <Button variant="contained" onClick={start} autoFocus>
                Start
              </Button>
            )}
            {phase.name === "error" && (
              <Button variant="contained" onClick={start}>
                Try again
              </Button>
            )}
            {phase.name === "email-code" && (
              <Button
                variant="contained"
                type="submit"
                form="guard-email-form"
                disabled={!emailCode.trim()}
              >
                Continue
              </Button>
            )}
            {phase.name === "activation" && (
              <Button
                variant="contained"
                type="submit"
                form="guard-activate-form"
                disabled={!activationCode.trim() || !savedRevocation}
              >
                Activate
              </Button>
            )}
            {busy && (
              <Button variant="contained" disabled>
                Working…
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
