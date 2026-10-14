import { motion } from "motion/react";
import { useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { ROUTES } from "../../constants/routes.js";
import { signIn } from "../../services/auth.service.js";
import { friendlySupabaseError } from "../../utils/formatters.js";
import { GRADIENT_HERO } from "../../utils/gradientPresets.js";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      await signIn(form);
      navigate(ROUTES.HOME);
    } catch (err) {
      setError(friendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-4 ${GRADIENT_HERO}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 overflow-hidden rounded-full bg-white dark:bg-noun-950/40 mx-auto">
            <img
              src={logo}
              alt="NOUN"
              className="object-contain w-full h-full border-noun-100 border-2 rounded-full dark:border-noun-950/40"
            />
          </div>
          <h1 className="text-xl font-bold text-white font-display">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-noun-200">Smart Lecture Reminder</p>
        </div>

        <div className="p-6 bg-white shadow-2xl rounded-2xl">
          {error && (
            <div className="flex items-start gap-2 px-3 py-3 mb-4 text-sm text-red-700 border border-red-100 bg-red-50 rounded-xl">
              <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div
            className="space-y-3"
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
          >
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete="current-password"
            />
            <div className="-mt-1 text-right">
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-xs text-noun-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Button
              className="w-full mt-1 h-11"
              loading={loading}
              onClick={handleSubmit}
            >
              Sign In
            </Button>
          </div>

          <p className="mt-5 text-sm text-center text-gray-500">
            Don't have an account?{" "}
            <Link
              to={ROUTES.REGISTER}
              className="font-medium text-noun-600 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
