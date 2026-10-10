import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <img
          src="/images/logo-mth.png"
          alt="MTH Logo"
          className="h-16 w-16 rounded-xl object-contain"
        />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            MTH Fleet ERP
          </h1>
          <p className="text-sm text-slate-500">
            Masuk ke akun admin Anda
          </p>
        </div>
      </div>
      <LoginForm />
      <p className="text-center text-xs text-slate-400">
        Maju Trans Hutama &mdash; Enterprise Fleet Management
      </p>
    </div>
  );
}