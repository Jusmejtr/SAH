import { Card, CardContent, Typography } from "@mui/material";

type AccountCardProps = {
  username: string;
  password: string;
  sharedSecret: string;
  displayName?: string;
};

export default function AccountCard({
  username,
  password,
  sharedSecret,
  displayName,
}: AccountCardProps) {
  const primaryLabel = displayName ? `${displayName} (${username})` : username;

  return (
    <Card
      sx={{
        width: 170,
        height: 170,
        borderRadius: 3,
        boxShadow: 3,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {primaryLabel}
        </Typography>
      </CardContent>
    </Card>
  );
}
