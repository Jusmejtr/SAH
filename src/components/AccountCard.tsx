import {
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Typography,
} from "@mui/material";
import type { Account } from "../api";

type AccountCardProps = {
  account: Account;
  manageMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
};

export default function AccountCard({
  account,
  manageMode,
  selected,
  onToggleSelect,
}: AccountCardProps) {
  const title = account.displayName || account.username;

  return (
    <Card
      sx={{
        width: 170,
        height: 170,
        borderRadius: 3,
        boxShadow: 3,
        position: "relative",
        border: selected ? "2px solid" : "1px solid transparent",
        borderColor: selected ? "primary.main" : "divider",
      }}
    >
      {manageMode && (
        <Checkbox
          checked={selected}
          onChange={() => onToggleSelect(account.id)}
          onClick={(event) => event.stopPropagation()}
          sx={{ position: "absolute", top: 4, left: 4, zIndex: 1 }}
        />
      )}
      <CardActionArea
        sx={{ height: "100%" }}
        onClick={() => {
          if (manageMode) {
            onToggleSelect(account.id);
          }
        }}
      >
        <CardContent
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {account.displayName && (
            <Typography variant="body2" color="text.secondary">
              {account.username}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
