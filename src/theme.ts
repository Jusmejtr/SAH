import { alpha, createTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

export type ColorMode = "light" | "dark";

export const COLOR_MODE_KEY = "sah:color-mode";

const FONT_STACK = [
  '"Inter"',
  '"Segoe UI Variable Text"',
  '"Segoe UI"',
  "system-ui",
  "-apple-system",
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
].join(", ");

const surfaces = {
  dark: {
    canvas: "#0f131c",
    paper: "#161b26",
    elevated: "#1a2030",
    border: "rgba(148, 163, 184, 0.16)",
    backdrop: "#0f131c",
  },
  light: {
    canvas: "#f4f6fa",
    paper: "#ffffff",
    elevated: "#ffffff",
    border: "rgba(15, 23, 42, 0.1)",
    backdrop: "#f4f6fa",
  },
} as const;

export const accentGradient = (mode: ColorMode) =>
  mode === "dark"
    ? "linear-gradient(135deg, #4d7fd6 0%, #3f92a8 100%)"
    : "linear-gradient(135deg, #3164c9 0%, #2b7f96 100%)";

export const createAppTheme = (mode: ColorMode): Theme => {
  const isDark = mode === "dark";
  const s = surfaces[mode];

  const base = createTheme({
    palette: {
      mode,
      primary: isDark
        ? { main: "#6a9bea", light: "#93b8f2", dark: "#4a7ac4" }
        : { main: "#2f62c4", light: "#5c86d6", dark: "#24509f" },
      secondary: isDark ? { main: "#5fb3c4" } : { main: "#2b7f96" },
      success: { main: isDark ? "#4fae86" : "#2f855a" },
      warning: { main: isDark ? "#d6a44f" : "#b45309" },
      error: { main: isDark ? "#df7580" : "#c53030" },
      background: { default: s.canvas, paper: s.paper },
      text: isDark
        ? { primary: "#e9edf7", secondary: "#93a2ba" }
        : { primary: "#0f172a", secondary: "#5b6b85" },
      divider: s.border,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT_STACK,
      h4: { fontWeight: 700, letterSpacing: "-0.02em" },
      h5: { fontWeight: 700, letterSpacing: "-0.02em" },
      h6: { fontWeight: 700, letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, letterSpacing: "0.01em" },
      button: { fontWeight: 600, textTransform: "none", letterSpacing: 0 },
      caption: { letterSpacing: "0.01em" },
    },
  });

  return createTheme(base, {
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "*, *::before, *::after": { boxSizing: "border-box" },
          html: { height: "100%" },
          body: {
            minHeight: "100%",
            backgroundColor: s.backdrop,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
          "#app": { minHeight: "100vh" },
          "::selection": {
            background: alpha(base.palette.primary.main, 0.25),
          },
          "::-webkit-scrollbar": { width: 10, height: 10 },
          "::-webkit-scrollbar-track": { background: "transparent" },
          "::-webkit-scrollbar-thumb": {
            borderRadius: 999,
            border: "3px solid transparent",
            backgroundClip: "content-box",
            backgroundColor: alpha(base.palette.text.secondary, 0.35),
          },
          "::-webkit-scrollbar-thumb:hover": {
            backgroundColor: alpha(base.palette.text.secondary, 0.55),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: 16,
            transition: "background-color .16s ease, border-color .16s ease",
          },
          contained: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
          outlined: {
            borderColor: s.border,
            "&:hover": {
              borderColor: alpha(base.palette.primary.main, 0.5),
              backgroundColor: alpha(base.palette.primary.main, 0.06),
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: "background-color .16s ease, color .16s ease",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark
              ? alpha("#ffffff", 0.03)
              : alpha("#0f172a", 0.02),
            "& .MuiOutlinedInput-notchedOutline": { borderColor: s.border },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(base.palette.primary.main, 0.45),
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
            border: `1px solid ${s.border}`,
            backgroundColor: s.elevated,
            backgroundImage: "none",
            boxShadow: isDark
              ? "0 18px 48px rgba(0, 0, 0, 0.45)"
              : "0 18px 48px rgba(15, 23, 42, 0.12)",
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backdropFilter: "blur(3px)",
            backgroundColor: alpha("#050810", isDark ? 0.6 : 0.35),
            "&.MuiBackdrop-invisible": {
              backdropFilter: "none",
              backgroundColor: "transparent",
            },
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontSize: "1.15rem", fontWeight: 700, paddingBottom: 8 },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: "12px 24px 20px", gap: 8 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, alignItems: "center" },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: "0.75rem",
            backgroundColor: alpha("#0f172a", 0.94),
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { borderRadius: 12, border: `1px solid ${s.border}` },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999, height: 3 },
        },
      },
    },
  });
};
