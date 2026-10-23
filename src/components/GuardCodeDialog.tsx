import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { useEffect, useRef, useState } from "preact/hooks";
import { FaCheck, FaCopy, FaShieldAlt } from "react-icons/fa";
import { copyText, getGuardCode } from "../api";
import type { Account, GuardCode } from "../api";
import { useI18n } from "../i18n";

type GuardCodeDialogProps = {
  account: Account | null;
  onClose: () => void;
};

const WARN_SECONDS = 5;
const CODE_FONT =
  '"Cascadia Mono", "Consolas", "SFMono-Regular", ui-monospace, monospace';

export default function GuardCodeDialog({
  account,
  onClose,
}: GuardCodeDialogProps) {
  const { t, tm } = useI18n();
  const [guard, setGuard] = useState<GuardCode | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  // Keep the last account so the dialog doesn't go blank while it fades out.
  const lastAccount = useRef<Account | null>(account);
  if (account) lastAccount.current = account;
  const shown = lastAccount.current;
  const accountId = account?.id ?? "";

  useEffect(() => {
    if (!accountId) return;

    setGuard(null);
    setError("");
    setCopied(false);

    let active = true;
    let current: GuardCode | null = null;
    let loading = false;

    const load = async () => {
      loading = true;
      try {
        const next = await getGuardCode(accountId);
        if (!active) return;
        current = next;
        setGuard(next);
        setError("");
      } catch (err) {
        if (active) setError(String((err as Error)?.message ?? err));
      } finally {
        loading = false;
      }
    };

    void load();
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (current && time >= current.validUntil && !loading) void load();
    }, 100);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [accountId]);

  useEffect(() => setCopied(false), [guard?.code]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    if (!guard) return;
    try {
      await copyText(guard.code);
      setCopied(true);
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    }
  };

  const remainingMs = guard ? Math.max(0, guard.validUntil - now) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const progress = guard ? (remainingMs / guard.period) * 100 : 0;
  const warn = Boolean(guard) && seconds <= WARN_SECONDS;
  const title = shown?.displayName || shown?.username || "";

  return (
    <Dialog open={Boolean(account)} onClose={onClose} maxWidth="xs" fullWidth>
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
              {t("guard.title")}
            </Typography>
            <Typography
              component="div"
              variant="caption"
              color="text.secondary"
              noWrap
              title={shown?.username}
            >
              {title}
              {shown && title !== shown.username ? ` · @${shown.username}` : ""}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {error ? (
          <Alert severity="error" variant="outlined">
            {tm(error)}
          </Alert>
        ) : (
          <>
            <Box
              onClick={() => void handleCopy()}
              title={guard ? t("guard.clickToCopy") : undefined}
              sx={(theme) => ({
                py: 2.5,
                borderRadius: 2,
                textAlign: "center",
                cursor: guard ? "pointer" : "default",
                userSelect: "none",
                border: "1px solid",
                borderColor: warn
                  ? alpha(theme.palette.warning.main, 0.5)
                  : theme.palette.divider,
                backgroundColor: alpha(
                  theme.palette.primary.main,
                  theme.palette.mode === "dark" ? 0.08 : 0.05,
                ),
                transition: "border-color .2s ease, background-color .2s ease",
                "&:hover": guard
                  ? {
                      borderColor: alpha(theme.palette.primary.main, 0.45),
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  : undefined,
              })}
            >
              <Typography
                component="div"
                sx={{
                  fontFamily: CODE_FONT,
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "0.28em",
                  pl: "0.28em",
                  color: warn ? "warning.main" : "text.primary",
                  opacity: guard ? 1 : 0.35,
                  transition: "color .2s ease",
                }}
              >
                {guard?.code ?? "•••••"}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center", mt: 2 }}
            >
              <LinearProgress
                variant="determinate"
                value={progress}
                color={warn ? "warning" : "primary"}
                aria-label={t("guard.timeLeft")}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  "& .MuiLinearProgress-bar": {
                    transition: "none",
                    borderRadius: 3,
                  },
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  minWidth: 30,
                  textAlign: "right",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: warn ? "warning.main" : "text.secondary",
                }}
              >
                {guard ? t("guard.seconds", { seconds }) : ""}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              {t("guard.newCodeEvery")}
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          color="inherit"
          onClick={onClose}
          sx={{ color: "text.secondary" }}
        >
          {t("common.close")}
        </Button>
        <Button
          variant="contained"
          color={copied ? "success" : "primary"}
          startIcon={copied ? <FaCheck size={13} /> : <FaCopy size={13} />}
          onClick={() => void handleCopy()}
          disabled={!guard || Boolean(error)}
          autoFocus
          sx={{ minWidth: 124 }}
        >
          {copied ? t("common.copied") : t("guard.copyCode")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
