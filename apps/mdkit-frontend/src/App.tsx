import { useState, useEffect } from "react";
import { trpc } from "./trpc";
import { Card, CardContent } from "./components/ui/card";

export const App = () => {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const getData = async () => {
      const trpcData = await trpc.helloWorld.query();
      setMessage(trpcData.message);
    };

    getData();
  }, []);

  return (
    <Card className="m-4">
      <CardContent className="space-y-4">
        <p>{message}</p>
      </CardContent>
    </Card>
  );
};
