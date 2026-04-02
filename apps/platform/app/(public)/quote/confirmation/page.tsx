import { Suspense } from "react";
import ConfirmationClient from "./confirmation-client";

const ConfirmationPage = () => (
  <Suspense
    fallback={
      <div className="py-20 text-center text-sm text-muted-foreground">Loading your personalized quote...</div>
    }
  >
    <ConfirmationClient />
  </Suspense>
);

export default ConfirmationPage;
