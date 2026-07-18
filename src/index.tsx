import { Button } from "@mui/material";
import { render } from "preact";

export function App() {
  return (
    <Button variant="contained" onClick={() => window.location.href = "https://github.com/Jusmejtr/SAH/"}>
      Hello world
    </Button>
  );
}

render(<App />, document.getElementById("app")!);
