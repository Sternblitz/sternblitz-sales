import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import type { LoginFormState } from "./types";
import styles from "./login.module.css";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const initialState: LoginFormState = {
  message: null,
  email: "",
};

async function loginAction(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  "use server";

  const email = (formData.get("email") || "").toString().trim();
  const password = (formData.get("password") || "").toString();

  if (!email || !password) {
    return {
      message: "Bitte E-Mail und Passwort eingeben.",
      email,
    };
  }

  const supabase = createServerSupabaseClient({ cookieStore: cookies() });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      message: error.message,
      email,
    };
  }

  redirect("/dashboard/orders");
}

export default async function LoginPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard/orders");
  }

  return (
    <main className={styles.page}>
      <section className={styles.box}>
        <div className={styles.head}>
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz Logo"
            className={styles.logo}
          />
          <h1 className={styles.headline}>STERNBLITZ-SALESTOOL</h1>
          <p className={styles.subtitle}>Die All-in-One-Lösung</p>
        </div>

        <LoginForm action={loginAction} initialState={initialState} />
      </section>
    </main>
  );
}
