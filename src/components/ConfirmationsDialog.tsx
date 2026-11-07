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
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  FaCheck,
  FaClipboardCheck,
  FaExchangeAlt,
  FaStore,
  FaSyncAlt,
  FaTimes,
  FaUserShield,
} from "react-icons/fa";
import { listConfirmations, respondToConfirmations } from "../api";
import type { Account, Confirmation } from "../api";
import { HTML_LANG, useI18n } from "../i18n";

type ConfirmationsDialogProps = {
  account: Account | null;
  onClose: () => void;
};

type BulkAction = "accept" | "decline" | "";

const TYPE_TRADE = 2;
const TYPE_MARKET = 3;
const ARM_MS = 4000;

const TypeIcon = ({ type }: { type: number }) =>
  type === TYPE_TRADE ? (
    <FaExchangeAlt size={15} />
  ) : type === TYPE_MARKET ? (
    <FaStore size={15} />
  ) : (
    <FaUserShield size={15} />
  );

export default function ConfirmationsDialog({
  account,
  onClose,
}: ConfirmationsDialogProps) {
  const { t, tm, language } = useI18n();
  const [items, setItems] = useState<Confirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [bulk, setBulk] = useState<BulkAction>("");
  const [armed, setArmed] = useState<BulkAction>("");

  // Keep the last account so the dialog doesn't go blank while it fades out.
  const lastAccount = useRef<Account | null>(account);
  if (account) lastAccount.current = account;
  const shown = lastAccount.current;
  const accountId = account?.id ?? "";
  const requestId = useRef(0);

  const load = async (id: string) => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const next = await listConfirmations(id);
      if (current !== requestId.current) return;
      setItems(next);
      setLoaded(true);
    } catch (err) {
      if (current === requestId.current) setError(String((err as Error)?.message ?? err));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!accountId) {
      requestId.current += 1;
      return;
    }
    setItems([]);
    setLoaded(false);
    setNotice("");
    setBusyIds([]);
    setBulk("");
    setArmed("");
    void load(accountId);
  }, [accountId]);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(""), ARM_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const respond = async (targets: Confirmation[], accept: boolean) => {
    if (!accountId || targets.length === 0) return;
    const ids = targets.map((item) => item.id);
    setBusyIds((prev) => [...prev, ...ids]);
    setError("");
    setNotice("");
    try {
      await respondToConfirmations(accountId, targets, accept);
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      setNotice(accept ? t("confirm.acceptedDone") : t("confirm.declinedDone"));
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
      // The list may have changed on Steam's side, so reload it.
      void load(accountId);
    } finally {
      setBusyIds((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };

  const handleBulk = async (action: Exclude<BulkAction, "">) => {
    if (armed !== action) {
      setArmed(action);
      return;
    }
    setArmed("");
    setBulk(action);
    try {
      await respond(items, action === "accept");
    } finally {
      setBulk("");
    }
  };

  const formatTime = (value: number) => {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat(HTML_LANG[language], {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return new Date(value).toLocaleString();
    }
  };

  const typeLabel = (item: Confirmation) =>
    item.type === TYPE_TRADE
      ? t("confirm.typeTrade")
      : item.type === TYPE_MARKET
        ? t("confirm.typeMarket")
        : item.typeName || t("confirm.typeOther");

  const title = shown?.displayName || shown?.username || "";
  const anyBusy = busyIds.length > 0 || Boolean(bulk);

  return (
    <Dialog open={Boolean(account)} onClose={onClose} maxWidth="sm" fullWidth>
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
            <FaClipboardCheck size={17} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              component="div"
              sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.25 }}
            >
              {t("confirm.title")}
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
          <Tooltip title={t("confirm.refresh")}>
            <span>
              <IconButton
                size="small"
                aria-label={t("confirm.refresh")}
                onClick={() => accountId && void load(accountId)}
                disabled={loading || anyBusy}
              >
                <FaSyncAlt size={13} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={1.5}>
          {error && (
            <Alert severity="error" variant="outlined" sx={{ whiteSpace: "pre-line" }}>
              {tm(error)}
            </Alert>
          )}
          {notice && !error && (
            <Alert severity="success" variant="outlined" onClose={() => setNotice("")}>
              {notice}
            </Alert>
          )}

          {loading && !loaded ? (
            <Stack spacing={1.5} sx={{ alignItems: "center", py: 5 }}>
              <CircularProgress size={30} thickness={4} />
              <Typography variant="body2" color="text.secondary">
                {t("confirm.loading")}
              </Typography>
            </Stack>
          ) : loaded && items.length === 0 ? (
            <Stack
              spacing={1}
              sx={(theme) => ({
                alignItems: "center",
                textAlign: "center",
                py: 5,
                px: 2,
                borderRadius: 2,
                border: `1px dashed ${theme.palette.divider}`,
                color: "text.secondary",
              })}
            >
              <FaCheck size={20} />
              <Typography color="text.primary" sx={{ fontWeight: 600 }}>
                {t("confirm.empty")}
              </Typography>
              <Typography variant="body2">{t("confirm.emptyHint")}</Typography>
            </Stack>
          ) : (
            items.map((item) => {
              const busy = busyIds.includes(item.id);
              return (
                <Box
                  key={item.id}
                  sx={(theme) => ({
                    p: 1.5,
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: theme.palette.divider,
                    opacity: busy ? 0.6 : 1,
                    transition: "opacity .16s ease",
                  })}
                >
                  <Box
                    sx={(theme) => ({
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 1.5,
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                      color: theme.palette.text.secondary,
                      backgroundColor: alpha(theme.palette.text.primary, 0.06),
                    })}
                  >
                    {item.icon ? (
                      <img
                        src={item.icon}
                        alt=""
                        width={44}
                        height={44}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <TypeIcon type={item.type} />
                    )}
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", mb: 0.25, flexWrap: "wrap" }}
                    >
                      <Chip
                        size="small"
                        label={typeLabel(item)}
                        icon={<TypeIcon type={item.type} />}
                        sx={{ height: 22, "& .MuiChip-icon": { fontSize: 11, ml: 0.75 } }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(item.createdAt)}
                      </Typography>
                    </Stack>
                    {item.headline && (
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, wordBreak: "break-word" }}
                      >
                        {item.headline}
                      </Typography>
                    )}
                    {item.sending && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", wordBreak: "break-word" }}
                      >
                        {item.sending}
                      </Typography>
                    )}
                    {item.receiving && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", wordBreak: "break-word" }}
                      >
                        {item.receiving}
                      </Typography>
                    )}
                  </Box>

                  <Stack spacing={0.75} sx={{ flexShrink: 0 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={anyBusy}
                      startIcon={
                        busy && !bulk ? (
                          <CircularProgress size={11} color="inherit" />
                        ) : (
                          <FaCheck size={11} />
                        )
                      }
                      onClick={() => void respond([item], true)}
                    >
                      {t("confirm.accept")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={anyBusy}
                      startIcon={<FaTimes size={11} />}
                      onClick={() => void respond([item], false)}
                    >
                      {t("confirm.decline")}
                    </Button>
                  </Stack>
                </Box>
              );
            })
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button
          color="inherit"
          onClick={onClose}
          sx={{ color: "text.secondary", mr: "auto" }}
        >
          {t("common.close")}
        </Button>
        {items.length > 1 && (
          <>
            <Button
              variant={armed === "decline" ? "contained" : "outlined"}
              color="error"
              disabled={anyBusy || loading}
              startIcon={
                bulk === "decline" ? (
                  <CircularProgress size={12} color="inherit" />
                ) : (
                  <FaTimes size={12} />
                )
              }
              onClick={() => void handleBulk("decline")}
            >
              {armed === "decline"
                ? t("confirm.clickAgain")
                : t("confirm.declineAll", { count: items.length })}
            </Button>
            <Button
              variant="contained"
              color={armed === "accept" ? "warning" : "success"}
              disabled={anyBusy || loading}
              startIcon={
                bulk === "accept" ? (
                  <CircularProgress size={12} color="inherit" />
                ) : (
                  <FaCheck size={12} />
                )
              }
              onClick={() => void handleBulk("accept")}
            >
              {armed === "accept"
                ? t("confirm.clickAgain")
                : t("confirm.acceptAll", { count: items.length })}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
