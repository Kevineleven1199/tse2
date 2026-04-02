import { Suspense } from "react";
import LoginForm from "./LoginForm";

const LoginPage = () => (
  <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading secure login…</div>}>
    <LoginForm />
  </Suspense>
);

export default LoginPage;
