"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { LoginFormState } from "./types";
import styles from "./login.module.css";

type LoginFormProps = {
  action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState>;
  initialState: LoginFormState;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submit}>
      {pending ? "..." : "Einloggen"}
    </button>
  );
}

export function LoginForm({ action, initialState }: LoginFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const [email, setEmail] = useState(initialState.email);
  const [password, setPassword] = useState("");

  useEffect(() => {
    setEmail(state.email);
  }, [state.email]);

  useEffect(() => {
    if (!state.message) {
      setPassword("");
    }
  }, [state.message]);

  return (
    <form action={formAction} className={styles.form}>
      <h2 className={styles.loginText}>Login</h2>

      <label className={styles.label} htmlFor="email">
        E-Mail-Adresse
      </label>
      <input
        id="email"
        name="email"
        className={styles.input}
        autoComplete="email"
        placeholder="vorname@sternblitz.de"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <label className={styles.label} htmlFor="password">
        Passwort
      </label>
      <input
        id="password"
        name="password"
        className={styles.input}
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {state.message && <p className={styles.message}>{state.message}</p>}

      <SubmitButton />

      <p className={styles.hint}>Nur für autorisierte Sternblitz-Mitarbeiter.</p>
    </form>
  );
}
