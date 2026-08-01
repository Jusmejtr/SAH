import {
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Typography,
} from "@mui/material";
import { FaTrash } from "react-icons/fa";
import type { Account } from "../api";

type AccountCardProps = {
  account: Account;
  onRemove: (id: string) => void;
};

export default function AccountCard({ account, onRemove }: AccountCardProps) {
  const title = account.displayName || account.username;

  return (
    <Card
      sx={{
        width: 170,
        height: 170,
        borderRadius: 3,
        boxShadow: 3,
        position: "relative",
      }}
    >
      <IconButton
        size="small"
        aria-label={`Remove ${account.username}`}
        onClick={() => onRemove(account.id)}
        sx={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
      >
        <FaTrash size={12} />
      </IconButton>
      <CardActionArea sx={{ height: "100%" }}>
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
